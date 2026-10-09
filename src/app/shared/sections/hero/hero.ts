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

  readonly featured = computed(() => this.products.products().find((p) => p.id === 1));
}