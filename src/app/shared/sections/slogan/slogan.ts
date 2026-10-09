import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'app-slogan',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="beneficios"
      class="py-24 bg-gradient-to-r from-brand-blush via-brand-rose/40 to-brand-lavender/50 text-center relative overflow-hidden my-12 border-y border-brand-rose/30"
    >
      <div class="max-w-4xl mx-auto px-4 relative z-10 space-y-6">
        <app-icon name="quote" class="w-12 h-12 text-brand-gold/40 mx-auto" />
        <h3 class="font-serif text-3xl sm:text-5xl text-brand-charcoal italic leading-relaxed">
          "La verdadera elegancia empieza por la prenda que sólo tú sabes que llevas puesta."
        </h3>
        <p class="text-xs uppercase tracking-[0.3em] text-brand-charcoal/70 font-medium">
          — Manifiesto Aurora Intimates
        </p>
      </div>
    </section>
  `
})
export class SloganComponent {}