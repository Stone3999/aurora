import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CartService } from '../../core/services/cart.service';
import { ProductsService } from '../../core/services/products.service';
import { Product } from '../../core/models/product.model';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-product-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html'
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  readonly cart = inject(CartService);
  readonly products = inject(ProductsService);

  readonly currentColor = computed(() => this.products.getColor(this.product().id));
  readonly selectedName = computed(() => this.currentColor()?.name ?? '');

  isSelected(colorName: string): boolean {
    return this.selectedName() === colorName;
  }

  changeColor(index: number) {
    this.products.changeColor(this.product().id, index);
  }

  quickView() {
    this.cart.openQuickView(this.product());
  }

  async addToCart() {
    await this.cart.addToCart(this.product(), this.currentColor(), this.products.getSize(this.product().id));
  }
}