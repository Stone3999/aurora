/**
 * Tipos para el paquete `asyncstorage`
 * (API estilo React Native AsyncStorage: asíncrona, Promise-based).
 */
declare module 'asyncstorage' {
  interface AsyncStorageApi {
    /** Firma tipo función: storage(key, value) o storage(key) */
    (key: string, value: string): Promise<void>;
    (key: string): Promise<string | null>;

    get(key: string | string[], callback?: (err: unknown, result: unknown) => void): Promise<unknown>;
    set(
      key: string | string[] | Record<string, unknown>,
      value?: unknown,
      callback?: (err?: unknown) => void
    ): Promise<unknown>;
    del(key: string | string[], callback?: (err?: unknown) => void): Promise<unknown>;
    clear(callback?: (err?: unknown) => void): Promise<unknown>;
    count(callback?: (err: unknown, count: number) => void): Promise<unknown>;

    development: boolean;
  }

  const storage: AsyncStorageApi;
  export default storage;
}