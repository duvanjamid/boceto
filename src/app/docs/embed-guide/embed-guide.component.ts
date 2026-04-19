import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellThemeService } from '../../shell-theme.service';
import { BacetoLogoComponent } from '../../boceto-logo.component';
import { PlaygroundComponent } from '../../playground/playground.component';

@Component({
  selector: 'app-embed-guide',
  standalone: true,
  imports: [RouterLink, BacetoLogoComponent, PlaygroundComponent],
  templateUrl: './embed-guide.component.html',
  styleUrls: ['./embed-guide.component.css']
})
export class EmbedGuideComponent {
  constructor(readonly theme: ShellThemeService) {}
  
  sampleDsl = `theme blueprint
@Dashboard
nav App | Inicio | Datos
# Panel de Control
row
  kpi 1.2k Usuarios
  kpi 98% Uptime
card Grafico
  p Simulación de datos en tiempo real...`;

  iframeCode = `<iframe 
  src="https://boceto.app/#/embed?mode=lite&theme=dark&w=..." 
  width="100%" height="500px" 
  style="border:0; border-radius:12px; overflow:hidden;">
</iframe>`;
}
