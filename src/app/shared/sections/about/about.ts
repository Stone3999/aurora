import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'app-about',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.html'
})
export class AboutComponent {}
