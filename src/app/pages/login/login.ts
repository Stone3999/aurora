import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import {
  checkPassword,
  isStrongPassword,
  passwordErrorMessage
} from '../../core/validators/password';
import { HeaderComponent } from '../../shared/header/header';
import { IconComponent } from '../../shared/icon/icon';
import { ToastComponent } from '../../shared/toast/toast';

type Mode = 'login' | 'register' | 'verify';

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
  readonly isResending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  // Verificación de correo
  readonly pendingEmail = signal('');
  readonly verificationCode = signal('');
  readonly demoCode = signal<string | null>(null);

  // Form fields
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  readonly isRegister = computed(() => this.mode() === 'register');
  readonly isVerify = computed(() => this.mode() === 'verify');
  readonly isLocalMode = computed(() => this.auth.isLocalMode());

  /** Checklist en vivo de la contraseña (getter: se recalcula al escribir). */
  get passwordChecks() {
    return checkPassword(this.password);
  }

  get passwordIsValid(): boolean {
    return isStrongPassword(this.password);
  }

  get passwordRules() {
    const checks = this.passwordChecks;
    return [
      { label: 'Mínimo 8 caracteres', ok: checks.minLength },
      { label: 'Una minúscula', ok: checks.lowercase },
      { label: 'Una mayúscula', ok: checks.uppercase },
      { label: 'Un símbolo (!@#…)', ok: checks.symbol }
    ];
  }

  constructor() {
    // /login?mode=register abre directo el formulario de registro
    if (this.route.snapshot.queryParamMap.get('mode') === 'register') {
      this.mode.set('register');
    }

    // Si ya hay sesión (login normal o enlace de Supabase), vamos al home.
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
    this.demoCode.set(null);
    this.verificationCode.set('');
  }

  async submit(event: Event) {
    event.preventDefault();

    if (this.isVerify()) {
      await this.verify();
      return;
    }

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
      if (!this.passwordIsValid) {
        this.errorMessage.set(passwordErrorMessage());
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
        const result = await this.auth.register(this.fullName, email, this.password);

        if (result.needsEmailConfirmation) {
          this.startVerification(email, result.demoCode);
        } else if (result.user) {
          this.cart.showToast(`¡Bienvenida a LANË, ${result.user.fullName.split(' ')[0]}!`);
          this.router.navigate(['/home']);
        }
      } else {
        const user = await this.auth.login(email, this.password);
        this.cart.showToast(`Sesión iniciada. Bienvenida, ${user.fullName.split(' ')[0]} ✨`);
        this.router.navigate(['/home']);
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        await this.handleNotVerified(email);
      } else {
        this.errorMessage.set(this.translateError(err?.message));
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Confirma el código de 6 dígitos (modo local/demo). */
  async verify() {
    const email = this.pendingEmail();
    if (!email) {
      this.errorMessage.set('No encontramos el correo a verificar. Vuelve a iniciar sesión.');
      return;
    }

    if (!this.isLocalMode()) {
      // En Supabase la confirmación ocurre al abrir el enlace del correo.
      this.infoMessage.set(
        'Abre el enlace que enviamos a tu correo para confirmar la cuenta. Luego inicia sesión.'
      );
      return;
    }

    const code = this.verificationCode().trim();
    if (!/^\d{6}$/.test(code)) {
      this.errorMessage.set('Escribe el código de 6 dígitos que te enviamos.');
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const user = await this.auth.verifyEmail(email, code);
      this.cart.showToast(`¡Correo verificado! Bienvenida a LANË, ${user.fullName.split(' ')[0]} ✨`);
      this.router.navigate(['/home']);
    } catch (err: any) {
      this.errorMessage.set(this.translateError(err?.message));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async resend() {
    const email = this.pendingEmail();
    if (!email) return;

    this.errorMessage.set(null);
    this.isResending.set(true);

    try {
      const { demoCode } = await this.auth.resendVerification(email);
      this.demoCode.set(demoCode ?? null);
      this.infoMessage.set(
        demoCode
          ? 'Generamos un código nuevo. Úsalo aquí abajo para confirmar tu correo.'
          : 'Correo reenviado. Revisa tu bandeja de entrada y la carpeta de spam.'
      );
    } catch (err: any) {
      this.errorMessage.set(this.translateError(err?.message));
    } finally {
      this.isResending.set(false);
    }
  }

  exploreAsGuest() {
    this.router.navigate(['/home']);
  }

  private async handleNotVerified(email: string) {
    let demoCode: string | undefined;

    if (this.isLocalMode()) {
      try {
        demoCode = (await this.auth.resendVerification(email)).demoCode;
      } catch {
        /* si falla, igual mostramos la pantalla para reintentar */
      }
    }

    this.startVerification(email, demoCode);
    this.infoMessage.set(
      this.isLocalMode()
        ? 'Tu correo aún no está confirmado. Generamos un código nuevo para ti.'
        : 'Tu correo aún no está confirmado. Revisa el enlace que te enviamos.'
    );
  }

  private startVerification(email: string, demoCode?: string) {
    this.pendingEmail.set(email);
    this.demoCode.set(demoCode ?? null);
    this.verificationCode.set('');
    this.errorMessage.set(null);
    this.mode.set('verify');
    this.infoMessage.set(
      demoCode
        ? 'Modo demo: como aún no hay servidor de correo, tu código aparece aquí abajo.'
        : 'Te enviamos un enlace de confirmación a tu correo. Revisa también la carpeta de spam.'
    );
  }

  private translateError(message?: string): string {
    if (!message) return 'Ocurrió un error inesperado. Intenta de nuevo.';

    const m = message.toLowerCase();

    if (m.includes('email not confirmed')) {
      return 'Tu correo aún no está confirmado. Confirma tu cuenta para continuar.';
    }
    if (m.includes('weak password') || m.includes('password should be at least')) {
      return passwordErrorMessage();
    }
    if (m.includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos. Revisa tus datos.';
    }
    if (m.includes('user already registered') || m.includes('already registered')) {
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
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
