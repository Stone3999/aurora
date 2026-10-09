import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { STORAGE_KEYS, StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

export type SessionSource = 'supabase' | 'local';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  source: SessionSource;
}

interface StoredSession {
  user: SessionUser;
  session: unknown | null;
}

interface LocalAccount {
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: string;
}

/**
 * Ortogonal a Supabase:
 *  - Si Supabase está configurado -> manda Supabase (auth real + DB real).
 *  - Si NO está configurado -> sesión local guardada en AsyncStorage,
 *    para que la app (y la lógica landing -> home) funcione desde el minuto uno.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);
  private supabase = inject(SupabaseService);

  private userChanges = new Subject<SessionUser | null>();

  /** Emite cada vez que la sesión cambia (login, registro, logout, restauración). */
  readonly user$: Observable<SessionUser | null> = this.userChanges.asObservable();

  readonly user = signal<SessionUser | null>(null);
  readonly isReady = signal(false);
  readonly isRestoring = signal(true);

  /**
   * Se resuelve en cuanto leemos el espejo local (localStorage).
   * NO espera IndexedDB ni red, así que el guard no puede dejar la app en blanco.
   */
  private readyResolve!: () => void;
  readonly ready: Promise<void> = new Promise<void>((resolve) => (this.readyResolve = resolve));

  /** true cuando estamos en modo local (Supabase todavía sin configurar). */
  readonly isLocalMode = computed(
    () => this.user()?.source === 'local' || !this.supabase.isConfigured()
  );

  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) return '';
    return user.fullName || user.email.split('@')[0];
  });

  readonly isLoggedIn = computed(() => this.user() !== null);

  constructor() {
    // 1) Arranque síncrono: leemos el espejo en localStorage.
    //    Esto NO espera IndexedDB, así que el primer render nunca se bloquea.
    const mirror = this.storage.getSync<StoredSession>(STORAGE_KEYS.session);
    if (mirror?.user) {
      this.applyUser(mirror.user);
    }

    this.isRestoring.set(false);
    this.isReady.set(true);
    this.readyResolve();

    // 2) Todo lo demás en segundo plano.
    void this.hydrateFromAsyncStorage();

    // Si Supabase ya tenía sesión, mantenemos ambos caminos sincronizados.
    this.supabase.authChanges$.subscribe((session) => {
      if (!session?.user) return;

      const mapped = this.mapSupabaseUser(session);

      this.applyUser(mapped);
      this.storage.set<StoredSession>(STORAGE_KEYS.session, {
        user: mapped,
        session
      });
    });
  }

  /** Único punto por donde cambiamos la sesión. */
  private applyUser(user: SessionUser | null) {
    this.user.set(user);
    this.userChanges.next(user);
  }

  private mapSupabaseUser(session: {
    user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
  }): SessionUser {
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      fullName:
        (session.user.user_metadata?.['full_name'] as string) ||
        session.user.email?.split('@')[0] ||
        'Clienta',
      source: 'supabase'
    };
  }

  /**
   * Revisa AsyncStorage (por si la sesión viviera solo en IndexedDB) y
   * revalida contra Supabase cuando ya esté configurado.
   */
  private async hydrateFromAsyncStorage() {
    try {
      const stored = await this.storage.get<StoredSession>(STORAGE_KEYS.session);
      if (stored?.user && !this.user()) {
        this.applyUser(stored.user);
      }
    } catch (err) {
      console.warn('[AuthService] no se pudo leer AsyncStorage', err);
    }

    if (!this.supabase.isConfigured()) return;

    try {
      const session = await this.supabase.login.restore();

      if (session?.user) {
        const mapped = this.mapSupabaseUser(session);
        this.applyUser(mapped);
        await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session });
      } else if (this.user()?.source === 'supabase') {
        await this.logout();
      }
    } catch (err) {
      console.warn('[AuthService] no se pudo revalidar con Supabase', err);
    }
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const normalized = email.trim().toLowerCase();

    if (this.supabase.isConfigured()) {
      await this.supabase.login.initialize(normalized, password);

      const session = this.supabase.currentSession();
      if (!session?.user) throw new Error('No se pudo iniciar sesión.');

      const mapped = this.mapSupabaseUser(session);
      this.applyUser(mapped);
      await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session });

      return mapped;
    }

    // -------- Modo local (AsyncStorage) --------
    const accounts = (await this.storage.get<LocalAccount[]>(STORAGE_KEYS.accounts)) ?? [];
    const found = accounts.find((a) => a.email === normalized);

    if (!found) {
      throw new Error('No encontramos una cuenta con ese correo. Crea tu cuenta LANË.');
    }

    if (found.passwordHash !== this.hash(password)) {
      throw new Error('Correo o contraseña incorrectos. Revisa tus datos.');
    }

    const mapped: SessionUser = {
      id: `local-${found.email}`,
      email: found.email,
      fullName: found.fullName,
      source: 'local'
    };

    this.applyUser(mapped);
    await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session: null });

    return mapped;
  }

  async register(
    fullName: string,
    email: string,
    password: string
  ): Promise<{ user: SessionUser; needsEmailConfirmation: boolean }> {
    const normalized = email.trim().toLowerCase();

    if (this.supabase.isConfigured()) {
      const { session } = await this.supabase.login.register(normalized, password, fullName.trim());

      if (!session?.user) {
        return {
          user: { id: '', email: normalized, fullName, source: 'supabase' },
          needsEmailConfirmation: true
        };
      }

      const mapped = this.mapSupabaseUser(session);
      this.applyUser(mapped);
      await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session });

      return { user: mapped, needsEmailConfirmation: false };
    }

    // -------- Modo local (AsyncStorage) --------
    const accounts = (await this.storage.get<LocalAccount[]>(STORAGE_KEYS.accounts)) ?? [];

    if (accounts.some((a) => a.email === normalized)) {
      throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
    }

    const account: LocalAccount = {
      email: normalized,
      fullName: fullName.trim(),
      passwordHash: this.hash(password),
      createdAt: new Date().toISOString()
    };

    accounts.push(account);
    await this.storage.set(STORAGE_KEYS.accounts, accounts);

    const mapped: SessionUser = {
      id: `local-${account.email}`,
      email: account.email,
      fullName: account.fullName,
      source: 'local'
    };

    this.applyUser(mapped);
    await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session: null });

    return { user: mapped, needsEmailConfirmation: false };
  }

  async logout(): Promise<void> {
    if (this.supabase.isConfigured()) {
      try {
        await this.supabase.login.logout();
      } catch {
        // si Supabase falla, igual limpiamos lo local
      }
    }

    this.applyUser(null);
    await this.storage.remove(STORAGE_KEYS.session);
  }

  /**
   * Hash ligero SOLO para el modo local (evita guardar la contraseña en claro
   * en el navegador). No es criptografía: cuando conectes Supabase,
   * la contraseña nunca se guarda en el cliente.
   */
  private hash(value: string): string {
    let hash = 0;
    const salted = `lane::${value}`;
    for (let i = 0; i < salted.length; i++) {
      hash = (hash << 5) - hash + salted.charCodeAt(i);
      hash |= 0;
    }
    return `h${Math.abs(hash)}`;
  }
}