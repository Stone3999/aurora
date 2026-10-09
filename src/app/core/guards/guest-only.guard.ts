import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Landing y login son SOLO para visitas sin sesión.
 * Si ya hay sesión (guardada en AsyncStorage o en Supabase) -> directo al Home.
 *
 * IMPORTANTE: espera a `auth.ready`, que se resuelve leyendo AsyncStorage.
 * Nunca espera una llamada de red, así que la landing no puede quedar en blanco.
 */
export const guestOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.user() ? router.createUrlTree(['/home']) : true;
};