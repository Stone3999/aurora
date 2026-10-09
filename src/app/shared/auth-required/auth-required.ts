import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-auth-required',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-required.html'
})
export class AuthRequiredComponent {
  readonly cart = inject(CartService);
  private router = inject(Router);

  close() {
    this.cart.closeAuthModal();
  }

  goToLogin() {
    this.cart.closeAuthModal();
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.cart.closeAuthModal();
    this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }
}