import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { PayPalButtonsInstance, PaypalService } from '../../core/services/paypal.service';
import { IconComponent } from '../icon/icon';

/**
 * Modal de pago con PayPal.
 *
 * Flujo:
 *   checkout() -> pedido "pending" en el backend
 *   -> este modal crea la orden en PayPal (monto validado en el servidor)
 *   -> onApprove -> backend captura y verifica monto/moneda
 *   -> recién entonces se vacía el carrito.
 */
@Component({
  selector: 'app-paypal-checkout',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paypal-checkout.html'
})
export class PaypalCheckoutComponent implements AfterViewInit, OnDestroy {
  readonly cart = inject(CartService);
  private api = inject(ApiService);
  private paypal = inject(PaypalService);
  private platformId = inject(PLATFORM_ID);

  private readonly buttonsHost = viewChild<ElementRef<HTMLElement>>('paypalButtons');
  private buttons: PayPalButtonsInstance | null = null;

  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly ready = signal(false);

  readonly config = this.paypal.config;
  readonly order = this.cart.pendingOrder;

  readonly formattedTotal = computed(() => {
    const order = this.order();
    return order ? `$${order.total.toFixed(2)} ${order.currency ?? 'USD'}` : '';
  });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.mount();
  }

  ngOnDestroy(): void {
    void this.buttons?.close().catch(() => undefined);
  }

  private async mount(): Promise<void> {
    const order = this.order();
    if (!order) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);
    this.ready.set(false);

    try {
      const cfg = await this.paypal.loadConfig();
      if (!cfg?.enabled || !cfg.clientId) {
        this.error.set(cfg?.reason ?? 'PayPal no está disponible en este momento.');
        return;
      }

      const sdk = await this.paypal.loadSdk(cfg.clientId, cfg.currency);
      const host = this.buttonsHost()?.nativeElement;
      if (!host) throw new Error('No se encontró el contenedor de PayPal.');

      host.innerHTML = '';

      this.buttons = sdk.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'pill',
          label: 'paypal',
          height: 48
        },
        createOrder: async () => {
          this.error.set(null);
          this.processing.set(true);
          try {
            const res = await this.api.createPaypalOrder(order.id);
            if (!res.ok || !res.paypalOrderId) {
              throw new Error(res.message ?? 'No se pudo iniciar el pago.');
            }
            return res.paypalOrderId;
          } finally {
            this.processing.set(false);
          }
        },
        onApprove: async (data) => this.capture(data.orderID),
        onCancel: () => {
          this.error.set(
            'Cancelaste el pago. Tu pedido sigue pendiente y puedes intentarlo de nuevo.'
          );
        },
        onError: (err) => {
          console.error('[paypal]', err);
          this.error.set('PayPal no pudo procesar el pago. Intenta de nuevo.');
        }
      });

      await this.buttons.render(host);
      this.ready.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar PayPal.');
    } finally {
      this.loading.set(false);
    }
  }

  private async capture(paypalOrderId: string): Promise<void> {
    this.processing.set(true);
    this.error.set(null);

    try {
      const res = await this.api.capturePaypalOrder(paypalOrderId);
      if (!res.ok) {
        this.error.set(res.message ?? 'No se pudo confirmar el pago.');
        return;
      }

      this.success.set(true);

      // Deja ver la confirmación antes de cerrar y vaciar el carrito.
      setTimeout(() => void this.cart.completePayment(), 1600);
    } finally {
      this.processing.set(false);
    }
  }

  async retry(): Promise<void> {
    this.error.set(null);
    await this.mount();
  }

  close(): void {
    if (this.processing()) return;
    this.cart.closePayment();
  }
}
