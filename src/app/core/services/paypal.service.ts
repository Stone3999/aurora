import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayPalConfig {
  ok: boolean;
  provider: string;
  enabled: boolean;
  mode: 'sandbox' | 'live';
  currency: string;
  clientId: string | null;
  reason?: string;
}

export interface PayPalButtonOptions {
  style?: Record<string, string | number>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
}

export interface PayPalButtonsInstance {
  render(target: HTMLElement): Promise<void>;
  close(): Promise<void>;
}

export interface PayPalNamespace {
  Buttons(options: PayPalButtonOptions): PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

/**
 * Carga el SDK oficial de PayPal bajo demanda y expone la configuración
 * pública que entrega el backend (`/api/payments/config`).
 *
 * El Client ID es público; el Client Secret vive solo en el backend.
 */
@Injectable({ providedIn: 'root' })
export class PaypalService {
  private http = inject(HttpClient);

  private sdkPromise: Promise<PayPalNamespace> | null = null;
  private loadedClientId: string | null = null;

  readonly config = signal<PayPalConfig | null>(null);
  readonly loadingConfig = signal(false);

  async loadConfig(force = false): Promise<PayPalConfig | null> {
    if (this.config() && !force) return this.config();

    this.loadingConfig.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<PayPalConfig>(`${environment.apiUrl}/payments/config`, { timeout: 8000 })
      );
      this.config.set(res);
      return res;
    } catch {
      this.config.set({
        ok: false,
        provider: 'paypal',
        enabled: false,
        mode: 'sandbox',
        currency: 'USD',
        clientId: null,
        reason: 'No se pudo contactar al servidor de pagos.'
      });
      return this.config();
    } finally {
      this.loadingConfig.set(false);
    }
  }

  buildSdkUrl(clientId: string, currency: string): string {
    const params = new URLSearchParams({
      'client-id': clientId,
      currency: currency || 'USD',
      intent: 'capture',
      components: 'buttons'
    });

    return `https://www.paypal.com/sdk/js?${params.toString()}`;
  }

  async loadSdk(clientId: string, currency: string): Promise<PayPalNamespace> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('PayPal solo está disponible en el navegador.');
    }

    if (window.paypal && this.loadedClientId === clientId) {
      return window.paypal;
    }

    if (this.sdkPromise) return this.sdkPromise;

    const url = this.buildSdkUrl(clientId, currency);

    this.sdkPromise = new Promise<PayPalNamespace>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-lane-paypal]');

      const onLoad = () => {
        if (window.paypal) {
          this.loadedClientId = clientId;
          resolve(window.paypal);
        } else {
          this.sdkPromise = null;
          reject(new Error('PayPal se cargó pero no se inicializó.'));
        }
      };

      const onError = () => {
        this.sdkPromise = null;
        reject(new Error('No se pudo cargar el SDK de PayPal. Revisa tu conexión.'));
      };

      if (existing) {
        if (window.paypal) {
          this.loadedClientId = clientId;
          resolve(window.paypal);
          return;
        }
        existing.addEventListener('load', onLoad, { once: true });
        existing.addEventListener('error', onError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset['lanePaypal'] = 'true';
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      document.head.appendChild(script);
    });

    return this.sdkPromise;
  }
}
