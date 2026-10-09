import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { HeaderComponent } from '../../shared/header/header';
import { IconComponent } from '../../shared/icon/icon';
import { ToastComponent } from '../../shared/toast/toast';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [FormsModule, HeaderComponent, IconComponent, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html'
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);

  readonly mode = signal<Mode>('login');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  // Form fields
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  readonly isRegister = computed(() => this.mode() === 'register');

  constructor() {
    // /login?mode=register abre directo el formulario de registro
    if (this.route.snapshot.queryParamMap.get('mode') === 'register') {
      this.mode.set('register');
    }

    // Si ya hay sesión, el guard lo resuelve; por seguridad, navegamos al home.
    effect(() => {
      if (this.auth.user()) {
        this.router.navigate(['/home']);
      }
    });
  }

  setMode(mode: Mode) {
    this.mode.set(mode);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  async submit(event: Event) {
    event.preventDefault();
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    const email = this.email.trim();

    if (!email || !this.password) {
      this.errorMessage.set('Completa tu correo y contraseña.');
      return;
    }

    if (this.isRegister()) {
      if (!this.fullName.trim()) {
        this.errorMessage.set('Escribe tu nombre para tu cuenta LANË.');
        return;
      }
      if (this.password.length < 6) {
        this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage.set('Las contraseñas no coinciden.');
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      if (this.isRegister()) {
        const { user, needsEmailConfirmation } = await this.auth.register(
          this.fullName,
          email,
          this.password
        );

        if (needsEmailConfirmation) {
          this.infoMessage.set(
            '¡Cuenta creada! Revisa tu correo para confirmarla y luego inicia sesión.'
          );
          this.mode.set('login');
        } else {
          this.cart.showToast(`¡Bienvenida a LANË, ${user.fullName.split(' ')[0]}!`);
          this.router.navigate(['/home']);
        }
      } else {
        const user = await this.auth.login(email, this.password);
        this.cart.showToast(`Sesión iniciada. Bienvenida, ${user.fullName.split(' ')[0]} ✨`);
        this.router.navigate(['/home']);
      }
    } catch (err: any) {
      this.errorMessage.set(this.translateError(err?.message));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  exploreAsGuest() {
    this.router.navigate(['/home']);
  }

  private translateError(message?: string): string {
    if (!message) return 'Ocurrió un error inesperado. Intenta de nuevo.';

    const m = message.toLowerCase();

    if (m.includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos. Revisa tus datos.';
    }
    if (m.includes('user already registered')) {
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    }
    if (m.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (m.includes('email rate limit')) {
      return 'Has solicitado demasiados correos. Espera un momento.';
    }
    if (m.includes('failed to fetch') || m.includes('networkerror')) {
      return 'No pudimos conectar con el servidor de autenticación.';
    }

    return message;
  }
}