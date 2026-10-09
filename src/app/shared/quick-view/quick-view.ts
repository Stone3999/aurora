import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CartService } from '../../core/services/cart.service';
import { ProductsService } from '../../core/services/products.service';
import { IconComponent } from '../icon/icon';

const SIZES = ['S', 'M', 'L'];

@Component({
  selector: 'app-quick-view',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-view.html'
})
export class QuickViewComponent {
  readonly cart = inject(CartService);
  readonly products = inject(ProductsService);

  readonly sizes = SIZES;
  readonly localSize = signal('M');

  readonly product = computed(() => this.cart.selectedQuickViewProduct());
  readonly color = computed(() => {
    const p = this.product();
    if (!p) return undefined;
    return this.products.getColor(p.id);
  });

  close() {
    this.localSize.set('M');
    this.cart.closeQuickView();
  }

  selectSize(size: string) {
    this.localSize.set(size);
  }

  selectColor(hex: string, name: string) {
    const p = this.product();
    if (!p) return;
    const found = p.colors.find((c) => c.name === name);
    if (found) this.products.selectColor(p.id, found);
  }

  isColorSelected(name: string): boolean {
    return this.color()?.name === name;
  }

  async addToCart() {
    const p = this.product();
    if (!p) return;
    await this.cart.addToCart(p, this.color(), this.localSize());
    this.close();
  }
}