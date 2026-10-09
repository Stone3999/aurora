import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-footer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html'
})
export class FooterComponent {
  readonly collections = [
    'Cacheteros Encaje',
    'Corte Invisible',
    'Sets Multipack',
    'Seda & Modal'
  ];

  readonly support = ['Guía de Tallas', 'Cuidado de Prendas', 'Envíos & Devoluciones', 'Preguntas Frecuentes'];
}