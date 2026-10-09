import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-cart-drawer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.html'
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  readonly isProcessing = signal(false);

  readonly formattedSubtotal = computed(() => `$${this.cart.subtotal().toFixed(2)} USD`);

  close() {
    this.cart.closeCart();
  }

  async checkout() {
    const items = this.cart.items();
    if (items.length === 0) return;

    const user = this.auth.user();
    if (!user) {
      this.cart.closeCart();
      this.cart.isAuthModalOpen.set(true);
      return;
    }

    this.isProcessing.set(true);
    try {
      const result = await this.api.checkout({
        customer_email: user.email,
        customer_name: this.auth.displayName(),
        shipping_address: 'Dirección confirmada al pagar',
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          price: i.price,
          quantity: i.quantity,
          color_name: i.color.name,
          color_hex: i.color.hex,
          size: i.size
        }))
      });

      if (result.ok) {
        await this.cart.clearCart();
        this.cart.closeCart();
        this.cart.showToast('¡Gracias por tu pedido! Redirigiendo a la pasarela de pago segura…');
      } else {
        // Backend no disponible: no se pierde el pedido, se informa al cliente.
        this.cart.showToast(
          result.message ?? 'El servidor de pedidos no responde. Intenta de nuevo en un momento.'
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  goToStore() {
    this.cart.closeCart();
    this.router.navigate(['/home']);
  }
}