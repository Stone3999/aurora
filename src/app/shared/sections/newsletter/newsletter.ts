import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-newsletter',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './newsletter.html'
})
export class NewsletterComponent {
  readonly supabase = inject(SupabaseService);
  private api = inject(ApiService);
  private cart = inject(CartService);

  readonly showMessage = signal(false);
  readonly isSubmitting = signal(false);
  email = '';

  async subscribe(event: Event) {
    event.preventDefault();
    if (this.isSubmitting() || !this.email) return;

    this.isSubmitting.set(true);
    let ok = false;

    if (this.supabase.isConfigured()) {
      try {
        await this.supabase.subscribeNewsletter(this.email);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      ok = await this.api.subscribeNewsletter(this.email);
    }

    this.isSubmitting.set(false);

    if (ok) {
      this.showMessage.set(true);
      this.email = '';
      setTimeout(() => this.showMessage.set(false), 5000);
    } else {
      this.cart.showToast('No pudimos guardar tu correo. Intenta de nuevo en un momento.');
    }
  }
}