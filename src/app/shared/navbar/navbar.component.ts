import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BacetoLogoComponent } from '../../boceto-logo.component';
import { ShellThemeService } from '../../shell-theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BacetoLogoComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  menuOpen = signal(false);
  constructor(readonly theme: ShellThemeService) {}
  close() { this.menuOpen.set(false); }
}
