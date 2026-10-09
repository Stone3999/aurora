import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthRequiredComponent } from '../../shared/auth-required/auth-required';
import { CartDrawerComponent } from '../../shared/cart-drawer/cart-drawer';
import { FooterComponent } from '../../shared/footer/footer';
import { HeaderComponent } from '../../shared/header/header';
import { IconComponent } from '../../shared/icon/icon';
import { QuickViewComponent } from '../../shared/quick-view/quick-view';
import { CatalogComponent } from '../../shared/sections/catalog/catalog';
import { HeroComponent } from '../../shared/sections/hero/hero';
import { NewsletterComponent } from '../../shared/sections/newsletter/newsletter';
import { PillarsComponent } from '../../shared/sections/pillars/pillars';
import { SloganComponent } from '../../shared/sections/slogan/slogan';
import { TestimonialsComponent } from '../../shared/sections/testimonials/testimonials';
import { ToastComponent } from '../../shared/toast/toast';

@Component({
  selector: 'app-home',
  imports: [
    HeaderComponent,
    HeroComponent,
    PillarsComponent,
    CatalogComponent,
    SloganComponent,
    TestimonialsComponent,
    NewsletterComponent,
    FooterComponent,
    CartDrawerComponent,
    QuickViewComponent,
    AuthRequiredComponent,
    ToastComponent,
    IconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html'
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  private router = inject(Router);

  goToLogin() {
    this.router.navigate(['/login']);
  }
}