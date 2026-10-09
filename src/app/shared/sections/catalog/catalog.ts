import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProductsService } from '../../../core/services/products.service';
import { ProductCardComponent } from '../../product-card/product-card';

@Component({
  selector: 'app-catalog',
  imports: [ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.html'
})
export class CatalogComponent {
  readonly products = inject(ProductsService);

  setFilter(key: string) {
    this.products.setFilter(key);
  }
}