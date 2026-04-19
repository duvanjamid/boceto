import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ShellThemeService } from './shell-theme.service';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { BacetoLogoComponent } from './boceto-logo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, RouterLink, BacetoLogoComponent],
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
    <footer class="app-footer">
      <div class="app-footer__inner">
        <div class="app-footer__logo">
          <boceto-logo [size]="20" label=""></boceto-logo>
          <span>Boceto</span>
          <span class="app-footer__meta">AGPL-3.0 · © 2025 Duvan Jamid</span>
        </div>
        <div class="app-footer__links">
          <a class="app-footer__link" routerLink="/editor">Editor</a>
          <a class="app-footer__link" routerLink="/docs">Componentes</a>
          <a class="app-footer__link" routerLink="/plugins">Plugins</a>
          <a class="app-footer__link" routerLink="/license">Licencia</a>
          <a class="app-footer__link" href="https://github.com/duvanjamid/boceto" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="app-footer__link" href="https://www.npmjs.com/package/@duvanjamid/boceto" target="_blank" rel="noopener">npm ↗</a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: var(--s-surface);
      border-top: 1px solid var(--s-border);
      padding: 28px 0;
    }
    .app-footer__inner {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .app-footer__logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--s-ink2);
      font-size: 13px;
    }
    .app-footer__meta {
      color: var(--s-ink3);
      font-size: 12px;
    }
    .app-footer__links {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .app-footer__link {
      color: var(--s-ink3);
      text-decoration: none;
      font-size: 13px;
      transition: color .15s;
    }
    .app-footer__link:hover { color: var(--s-ink); }
    @media (max-width: 768px) {
      .app-footer__inner { flex-direction: column; text-align: center; }
      .app-footer__links { justify-content: center; }
    }
  `],
})
export class AppComponent {
  constructor(readonly theme: ShellThemeService) {}
}
