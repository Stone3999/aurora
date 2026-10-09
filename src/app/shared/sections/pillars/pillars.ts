import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../icon/icon';

interface Pillar {
  icon: string;
  title: string;
  text: string;
  wrapper: string;
  iconBox: string;
}

@Component({
  selector: 'app-pillars',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pillars.html'
})
export class PillarsComponent {
  readonly pillars: Pillar[] = [
    {
      icon: 'sparkles',
      title: 'Encaje Soft-Touch',
      text: 'Texturas ultra suaves que no pican ni irritan la piel delicada.',
      wrapper: 'flex items-start space-x-4 p-4 rounded-2xl bg-brand-blush/40 border border-brand-rose/20',
      iconBox: ''
    },
    {
      icon: 'shield-check',
      title: 'Ajuste Inviolable',
      text: 'Bordes con corte láser e invisibles bajo vestidos o pantalones ajustados.',
      wrapper: 'flex items-start space-x-4 p-4 rounded-2xl bg-brand-lavender/30 border border-brand-lavender/40',
      iconBox: ''
    },
    {
      icon: 'heart',
      title: 'Puente de Algodón',
      text: 'Protección 100% natural transpirable para máxima frescura todo el día.',
      wrapper: 'flex items-start space-x-4 p-4 rounded-2xl bg-brand-sage/30 border border-brand-sage/40',
      iconBox: ''
    },
    {
      icon: 'package-check',
      title: 'Empaque Discreto',
      text: 'Entregas confidenciales en cajas de lujo con aroma exclusivo.',
      wrapper: 'flex items-start space-x-4 p-4 rounded-2xl bg-brand-nude/30 border border-brand-nude/40',
      iconBox: ''
    }
  ];
}