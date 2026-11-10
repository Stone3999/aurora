import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { isStrongPassword, passwordErrorMessage } from '../validators/password';
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
  /** Las cuentas nuevas nacen sin verificar. Las antiguas (sin campo) se dan por válidas. */
  verified?: boolean;
  verificationCode?: string;
  verificationExpiresAt?: string;
}

export interface RegisterResult {
  user: SessionUser | null;
  needsEmailConfirmation: boolean;
  /**
   * Solo en modo local/demo (sin Supabase): código de 6 dígitos que se muestra
   * en pantalla porque no hay servidor de correo. Con Supabase el correo es real.
   */
  demoCode?: string;
}

const CODE_TTL_MS = 15 * 60 * 1000;

function authError(message: string, code: string): Error {
  const error = new Error(message);
  (error as Error & { code?: string }).code = code;
  return error;
}

/**
 * Ortogonal a Supabase:
 *  - Si Supabase está configurado -> manda Supabase (auth real + email real + DB real).
 *  - Si NO está configurado -> sesión local guardada en AsyncStorage, con
 *    verificación de correo simulada (código de 6 dígitos en pantalla).
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
      try {
        await this.supabase.login.initialize(normalized, password);
      } catch (err) {
        const message = (err as Error)?.message ?? '';
        if (message.toLowerCase().includes('email not confirmed')) {
          throw authError('EMAIL_NOT_VERIFIED', 'EMAIL_NOT_VERIFIED');
        }
        throw err;
      }

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

    // Cuentas nuevas: deben confirmar el código antes de entrar.
    if (found.verified === false) {
      throw authError('EMAIL_NOT_VERIFIED', 'EMAIL_NOT_VERIFIED');
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

  async register(fullName: string, email: string, password: string): Promise<RegisterResult> {
    const normalized = email.trim().toLowerCase();

    if (!isStrongPassword(password)) {
      throw authError(passwordErrorMessage(), 'WEAK_PASSWORD');
    }

    if (this.supabase.isConfigured()) {
      const { session } = await this.supabase.login.register(
        normalized,
        password,
        fullName.trim()
      );

      if (!session?.user) {
        // Supabase exige confirmar el correo antes de crear la sesión.
        return {
          user: null,
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

    const code = this.generateCode();

    const account: LocalAccount = {
      email: normalized,
      fullName: fullName.trim(),
      passwordHash: this.hash(password),
      createdAt: new Date().toISOString(),
      verified: false,
      verificationCode: code,
      verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString()
    };

    accounts.push(account);
    await this.storage.set(STORAGE_KEYS.accounts, accounts);

    // Importante: NO se inicia sesión hasta verificar el correo.
    return {
      user: null,
      needsEmailConfirmation: true,
      demoCode: code
    };
  }

  /**
   * Verifica el correo.
   * - Modo local: valida el código de 6 dígitos y abre la sesión.
   * - Supabase: la verificación ocurre al abrir el enlace del correo, no aquí.
   */
  async verifyEmail(email: string, code: string): Promise<SessionUser> {
    const normalized = email.trim().toLowerCase();

    if (this.supabase.isConfigured()) {
      throw new Error(
        'Abre el enlace que enviamos a tu correo para confirmar la cuenta. Luego inicia sesión.'
      );
    }

    const accounts = (await this.storage.get<LocalAccount[]>(STORAGE_KEYS.accounts)) ?? [];
    const index = accounts.findIndex((a) => a.email === normalized);
    if (index === -1) throw new Error('No encontramos esa cuenta. Regístrate de nuevo.');

    const account = accounts[index];

    if (account.verified !== false) {
      throw authError('Ese correo ya está verificado. Inicia sesión.', 'ALREADY_VERIFIED');
    }

    if (
      !account.verificationExpiresAt ||
      new Date(account.verificationExpiresAt).getTime() < Date.now()
    ) {
      throw authError('El código expiró. Solicita uno nuevo.', 'CODE_EXPIRED');
    }

    if (account.verificationCode !== code.trim()) {
      throw authError('El código no es correcto. Revísalo e intenta de nuevo.', 'INVALID_CODE');
    }

    accounts[index] = {
      ...account,
      verified: true,
      verificationCode: undefined,
      verificationExpiresAt: undefined
    };
    await this.storage.set(STORAGE_KEYS.accounts, accounts);

    const mapped: SessionUser = {
      id: `local-${account.email}`,
      email: account.email,
      fullName: account.fullName,
      source: 'local'
    };

    this.applyUser(mapped);
    await this.storage.set<StoredSession>(STORAGE_KEYS.session, { user: mapped, session: null });

    return mapped;
  }

  /** Reenvía el correo (Supabase) o genera un código nuevo (demo local). */
  async resendVerification(email: string): Promise<{ demoCode?: string }> {
    const normalized = email.trim().toLowerCase();

    if (this.supabase.isConfigured()) {
      await this.supabase.login.resendConfirmation(normalized);
      return {};
    }

    const accounts = (await this.storage.get<LocalAccount[]>(STORAGE_KEYS.accounts)) ?? [];
    const index = accounts.findIndex((a) => a.email === normalized);
    if (index === -1) throw new Error('No encontramos esa cuenta. Regístrate de nuevo.');

    if (accounts[index].verified !== false) {
      throw authError('Ese correo ya está verificado. Inicia sesión.', 'ALREADY_VERIFIED');
    }

    const code = this.generateCode();
    accounts[index] = {
      ...accounts[index],
      verificationCode: code,
      verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString()
    };
    await this.storage.set(STORAGE_KEYS.accounts, accounts);

    return { demoCode: code };
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

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
