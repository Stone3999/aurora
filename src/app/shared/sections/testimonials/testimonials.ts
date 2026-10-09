import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../icon/icon';

interface Testimonial {
  name: string;
  product: string;
  quote: string;
}

@Component({
  selector: 'app-testimonials',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html'
})
export class TestimonialsComponent {
  readonly stars = [1, 2, 3, 4, 5];

  readonly testimonials: Testimonial[] = [
    {
      name: 'Valeria M.',
      product: 'Cachetero Rosa Pastel',
      quote:
        '"Son los cacheteros más cómodos que he tenido. El encaje no molesta en absoluto y los colores pasteles son hermosos tal como se ven en la página."'
    },
    {
      name: 'Camila R.',
      product: 'Set Elegance Lila',
      quote:
        '"No se marcan con vestidos ajustados. La calidad del puente de algodón se siente premium. Compré el paquete de 3 y me encantó."'
    },
    {
      name: 'Sofía G.',
      product: 'Cachetero Invisible Nude',
      quote:
        '"El empaque súper discreto y con un aroma espectacular. La atención al cliente fue excelente. Definitivamente vuelvo a pedir."'
    }
  ];
}