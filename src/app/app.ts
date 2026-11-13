import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartService } from './core/services/cart.service';
import { PaypalCheckoutComponent } from './shared/paypal-checkout/paypal-checkout';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PaypalCheckoutComponent],
  templateUrl: './app.html'
})
export class App {
  readonly cart = inject(CartService);
}
