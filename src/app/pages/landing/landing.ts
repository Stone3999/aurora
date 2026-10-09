import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthRequiredComponent } from '../../shared/auth-required/auth-required';
import { CartDrawerComponent } from '../../shared/cart-drawer/cart-drawer';
import { FooterComponent } from '../../shared/footer/footer';
import { HeaderComponent } from '../../shared/header/header';
import { QuickViewComponent } from '../../shared/quick-view/quick-view';
import { CatalogComponent } from '../../shared/sections/catalog/catalog';
import { HeroComponent } from '../../shared/sections/hero/hero';
import { NewsletterComponent } from '../../shared/sections/newsletter/newsletter';
import { PillarsComponent } from '../../shared/sections/pillars/pillars';
import { SloganComponent } from '../../shared/sections/slogan/slogan';
import { TestimonialsComponent } from '../../shared/sections/testimonials/testimonials';
import { ToastComponent } from '../../shared/toast/toast';

@Component({
  selector: 'app-landing',
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
    ToastComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html'
})
export class LandingComponent {}