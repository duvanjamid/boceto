import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellThemeService } from './shell-theme.service';

import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  // Injecting the service here ensures it's instantiated at app startup,
  // so the effect() that keeps data-shell in sync runs immediately.
  constructor(readonly theme: ShellThemeService) {}
}
