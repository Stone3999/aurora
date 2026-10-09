import { Injectable } from '@angular/core';
import storage from 'asyncstorage';

/** Prefijo de namespace para no pisar otras llaves del navegador. */
const PREFIX = 'lane:';

export const STORAGE_KEYS = {
  session: `${PREFIX}session`,
  accounts: `${PREFIX}accounts`,
  cart: `${PREFIX}cart`
} as const;

/**
 * Persistencia local sobre AsyncStorage (localForage -> IndexedDB / WebSQL / localStorage).
 *
 * REGLA DE ORO: la app NUNCA debe esperar a AsyncStorage para pintar.
 * Por eso cada llave se escribe en dos lugares:
 *   - AsyncStorage (IndexedDB): almacenamiento principal, asíncrono y durable.
 *   - localStorage (espejo): lectura SINCRÓNICA para arrancar la app sin parpadear.
 *
 * Así el guard y el primer render nunca se quedan colgados esperando IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Lee el espejo de forma síncrona. Nunca lanza. */
  getSync<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? this.parse<T>(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Lectura: primero el espejo síncrono (rápido), luego AsyncStorage por si
   * el dato solo existe en IndexedDB (y en ese caso lo espejamos).
   */
  async get<T>(key: string): Promise<T | null> {
    const mirror = this.getSync<T>(key);
    if (mirror !== null) return mirror;

    try {
      const raw = (await storage.get(key)) as string | null | undefined;

      if (raw === null || raw === undefined) return null;

      const parsed = this.parse<T>(raw);
      this.writeMirror(key, raw);
      return parsed;
    } catch (err) {
      console.warn(`[StorageService] No se pudo leer "${key}" de AsyncStorage`, err);
      return null;
    }
  }

  /** Escritura doble: AsyncStorage primero (fuente de verdad) y espejo siempre. */
  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    this.writeMirror(key, serialized);

    try {
      await storage.set(key, serialized);
    } catch (err) {
      console.warn(`[StorageService] No se pudo escribir "${key}" en AsyncStorage`, err);
    }
  }

  async remove(key: string): Promise<void> {
    this.writeMirror(key, null);

    try {
      await storage.del(key);
    } catch (err) {
      console.warn(`[StorageService] No se pudo borrar "${key}" de AsyncStorage`, err);
    }
  }

  private writeMirror(key: string, raw: string | null): void {
    try {
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
    } catch {
      /* modo privado o cuota llena: el espejo es solo una optimización */
    }
  }

  private parse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
}