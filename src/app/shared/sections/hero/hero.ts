import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html'
})
export class HeroComponent {
  private products = inject(ProductsService);
  readonly cart = inject(CartService);

  /** Producto destacado: siempre uno visible para la visitante actual. */
  readonly featured = computed(() => this.products.availableProducts()[0] ?? null);
}
