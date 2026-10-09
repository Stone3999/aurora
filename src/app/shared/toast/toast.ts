import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CartService } from '../../core/services/cart.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-toast',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed bottom-6 right-6 z-50 transform transition-all duration-300 bg-brand-charcoal text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-xs tracking-wider"
      [class.translate-y-20]="!cart.toastVisible()"
      [class.opacity-0]="!cart.toastVisible()"
      role="status"
    >
      <app-icon name="check-circle-2" class="w-5 h-5 text-brand-gold shrink-0" />
      <span>{{ cart.toastMessage() }}</span>
    </div>
  `
})
export class ToastComponent {
  readonly cart = inject(CartService);
}