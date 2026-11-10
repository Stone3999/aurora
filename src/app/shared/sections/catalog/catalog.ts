import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProductsService } from '../../../core/services/products.service';
import { IconComponent } from '../../icon/icon';
import { ProductCardComponent } from '../../product-card/product-card';

@Component({
  selector: 'app-catalog',
  imports: [ProductCardComponent, IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.html'
})
export class CatalogComponent {
  readonly products = inject(ProductsService);
  readonly auth = inject(AuthService);

  setFilter(key: string) {
    this.products.setFilter(key);
  }
}
