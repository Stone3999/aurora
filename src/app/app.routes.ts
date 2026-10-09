import { Routes } from '@angular/router';
import { guestOnlyGuard } from './core/guards/guest-only.guard';

export const routes: Routes = [
  {
    // 1) Landing page — solo para visitas sin sesión
    path: '',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./pages/landing/landing').then((m) => m.LandingComponent),
    title: 'LANË — Lo que llevas debajo también importa'
  },
  {
    // 2) Login o registro — si hay sesión, redirige al home
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
    title: 'LANË — Inicia sesión'
  },
  {
    // 3) Home — abierta a todos; sin sesión se navega pero no se compra
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    title: 'LANË — Colección'
  },
  { path: '**', redirectTo: '' }
];