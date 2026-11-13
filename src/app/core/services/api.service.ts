import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutPayload, Product } from '../models/product.model';
import { SupabaseService } from './supabase.service';

export interface CheckoutResult {
  ok: boolean;
  orderId?: string;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  currency?: string;
  message?: string;
}

export interface PayPalCreateResult {
  ok: boolean;
  orderId?: string;
  paypalOrderId?: string;
  total?: number;
  currency?: string;
  message?: string;
}

export interface PayPalCaptureResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  captureId?: string | null;
  total?: number;
  currency?: string;
  alreadyPaid?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);

  /** URL base del backend en Render. Se configura en src/environments/environment.ts */
  readonly baseUrl = environment.apiUrl;

  /** true cuando la URL sigue siendo el placeholder y el backend aún no está configurado. */
  readonly isBackendConfigured = signal<boolean>(
    !!environment.apiUrl && !environment.apiUrl.includes('TU_') && !environment.apiUrl.includes('tu-backend')
  );

  /** Adjunta el access token de Supabase cuando existe (endpoints protegidos). */
  private authOptions(): { headers?: HttpHeaders } {
    const token = this.supabase.currentSession()?.access_token;
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

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

  async checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<CheckoutResult>(`${this.baseUrl}/checkout`, payload, {
          ...this.authOptions(),
          timeout: 15000
        })
      );
      return { ...res, ok: res?.ok !== false };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.error?.message ?? 'No pudimos conectar con el servidor de pedidos.'
      };
    }
  }

  /** Crea la orden en PayPal a partir del pedido interno (el monto lo pone el backend). */
  async createPaypalOrder(orderId: string): Promise<PayPalCreateResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<PayPalCreateResult>(
          `${this.baseUrl}/payments/paypal/create`,
          { orderId },
          { ...this.authOptions(), timeout: 20000 }
        )
      );
      return { ...res, ok: res?.ok !== false };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.error?.message ?? 'No se pudo iniciar el pago con PayPal.'
      };
    }
  }

  /** Confirma la captura y marca el pedido como pagado. */
  async capturePaypalOrder(paypalOrderId: string): Promise<PayPalCaptureResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<PayPalCaptureResult>(
          `${this.baseUrl}/payments/paypal/capture`,
          { paypalOrderId },
          { ...this.authOptions(), timeout: 20000 }
        )
      );
      return { ...res, ok: res?.ok !== false };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.error?.message ?? 'No se pudo confirmar el pago.'
      };
    }
  }
}
