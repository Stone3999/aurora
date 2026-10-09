import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Adaptador de storage con la misma forma que exige supabase-js v2. */
const asyncStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    try {
      const raw = localStorage.getItem(key);
      return Promise.resolve(raw);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota */
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    return Promise.resolve();
  }
};

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private authChangesSubject = new Subject<Session>();

  /** Emite cada vez que Supabase cambia la sesión (login, logout, refresh). */
  readonly authChanges$: Observable<Session> = this.authChangesSubject.asObservable();

  public readonly currentUser = signal<User | null>(null);
  public readonly currentSession = signal<Session | null>(null);

  /** true solo cuando hay URL y key reales en environment.ts */
  public readonly isConfigured = signal<boolean>(
    !!environment.supabaseUrl &&
      !environment.supabaseUrl.includes('TU_') &&
      !!environment.supabaseKey &&
      !environment.supabaseKey.includes('TU_')
  );

  constructor() {
    // Con URL placeholder la app NO debe explode: creamos el igual y lo usamos
    // solo para el modo local. createClient no valida que el host exista.
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        storage: asyncStorageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    if (this.isConfigured()) {
      this.supabase.auth.onAuthStateChange((_event, session) => {
        this.currentSession.set(session);
        this.currentUser.set(session?.user ?? null);
        if (session) this.authChangesSubject.next(session);
      });
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  /** Capa de autenticación contra Supabase (solo se usa si isConfigured()). */
  readonly login = {
    /** Rehidrata la sesión guardada por Supabase. */
    restore: async (): Promise<Session | null> => {
      if (!this.isConfigured()) return null;

      try {
        const {
          data: { session }
        } = await this.supabase.auth.getSession();

        this.currentSession.set(session);
        this.currentUser.set(session?.user ?? null);
        return session;
      } catch (err) {
        console.warn('[Supabase] no se pudo restaurar la sesión', err);
        return null;
      }
    },

    register: async (email: string, password: string, fullName: string) => {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw error;

      this.currentSession.set(data.session);
      this.currentUser.set(data.user);
      return data;
    },

    initialize: async (email: string, password: string) => {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      this.currentSession.set(data.session);
      this.currentUser.set(data.user);
      return data;
    },

    logout: async () => {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      this.currentSession.set(null);
      this.currentUser.set(null);
    }
  };

  // ------------------------------------------------------------ Database
  async getProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // -------------------------------------------------------------- Cart
  async getCartItems(userId: string) {
    const { data, error } = await this.supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  }

  async addCartItem(
    userId: string,
    productId: number,
    colorName: string,
    colorHex: string,
    size = 'M',
    quantity = 1
  ) {
    const { data: existing, error: findError } = await this.supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('color_name', colorName)
      .eq('size', size)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const { data, error } = await this.supabase
        .from('cart_items')
        .update({
          quantity: existing.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await this.supabase
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id: productId,
        color_name: colorName,
        color_hex: colorHex,
        size,
        quantity
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateCartItemQty(itemId: string, quantity: number) {
    const { data, error } = await this.supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removeCartItem(itemId: string) {
    const { error } = await this.supabase.from('cart_items').delete().eq('id', itemId);
    if (error) throw error;
  }

  async clearCart(userId: string) {
    const { error } = await this.supabase.from('cart_items').delete().eq('user_id', userId);
    if (error) throw error;
  }

  // -------------------------------------------------------- Newsletter
  async subscribeNewsletter(email: string) {
    const { data, error } = await this.supabase
      .from('newsletter_subscribers')
      .insert({ email })
      .select()
      .maybeSingle();

    // 23505 = duplicate key -> el correo ya estaba suscrito, no es un error para la UX
    if (error && error.code !== '23505') throw error;
    return data;
  }
}