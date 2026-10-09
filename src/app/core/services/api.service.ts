import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutPayload, Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  /** URL base del backend en Render. Se configura en src/environments/environment.ts */
  readonly baseUrl = environment.apiUrl;

  /** true cuando la URL sigue siendo el placeholder y el backend aún no está configurado. */
  readonly isBackendConfigured = signal<boolean>(
    !!environment.apiUrl && !environment.apiUrl.includes('TU_') && !environment.apiUrl.includes('tu-backend')
  );

  async checkHealth(): Promise<boolean> {
    try {
      const res = await firstValueFrom(this.http.get(`${this.baseUrl}/health`, { timeout: 5000 }));
      return (res as any)?.status === 'ok';
    } catch {
      return false;
    }
  }

  async fetchProducts(): Promise<Product[] | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ products: Product[] }>(`${this.baseUrl}/products`, { timeout: 8000 })
      );
      return res?.products ?? null;
    } catch {
      return null;
    }
  }

  async subscribeNewsletter(email: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/newsletter`, { email }, { timeout: 8000 })
      );
      return true;
    } catch {
      return false;
    }
  }

  async checkout(payload: CheckoutPayload): Promise<{ ok: boolean; orderId?: string; message?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; orderId?: string; message?: string }>(
          `${this.baseUrl}/checkout`,
          payload,
          { timeout: 12000 }
        )
      );
      return { ok: true, orderId: res?.orderId, message: res?.message };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.error?.message ?? 'No pudimos conectar con el servidor de pedidos.'
      };
    }
  }
}