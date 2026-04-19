import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BacetoLogoComponent } from '../../boceto-logo.component';
import { ShellThemeService } from '../../shell-theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, BacetoLogoComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(readonly theme: ShellThemeService) {}
}
