import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-header',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html'
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private router = inject(Router);

  readonly isMobileMenuOpen = signal(false);
  readonly isAccountOpen = signal(false);

  readonly navLinks = [
    { href: '#coleccion', label: 'Cacheteros' },
    { href: '#calidad', label: 'Filosofía' },
    { href: '#beneficios', label: 'Por qué LANË' },
    { href: '#opiniones', label: 'Reseñas' }
  ];

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  toggleAccount(event?: Event) {
    event?.stopPropagation();
    if (!this.auth.user()) return;
    this.isAccountOpen.update((v) => !v);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.isAccountOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.isAccountOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  async logout() {
    this.isAccountOpen.set(false);
    await this.auth.logout();
    await this.cart.clearCart();
    this.cart.closeCart();
    this.router.navigate(['/']);
  }

  goToAuth() {
    this.isAccountOpen.set(false);
    this.isMobileMenuOpen.set(false);
    this.router.navigate(['/login']);
  }
}