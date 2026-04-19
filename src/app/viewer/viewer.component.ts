import {
  Component, signal, computed, effect, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageViewComponent } from '../page-view.component';
import { THEMES, ThemeName, WirePage, ParsedDSL } from '../../types';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';
import { parseDSL } from '../../parser';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [RouterLink, PageViewComponent, BacetoLogoComponent],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ViewerComponent implements OnInit {
  parsed      = signal<ParsedDSL>({ pages: {}, theme: 'paper', frame: 'auto' });
  currentPage = signal<string | null>(null);
  history     = signal<string[]>([]);
  dslRaw      = signal('');
  notFound    = signal(false);

  pageNames   = computed(() => Object.keys(this.parsed().pages));
  wireTheme   = computed(() => this.parsed().theme as ThemeName);
  currentPageData = computed((): WirePage | null => {
    const p = this.parsed(), name = this.currentPage();
    return name ? (p.pages[name] ?? null) : null;
  });
  editorUrl = computed(() => {
    const raw = this.dslRaw();
    if (!raw) return '/#/editor';
    const b64 = btoa(unescape(encodeURIComponent(raw)));
    return `${window.location.origin}/#/editor?w=${encodeURIComponent(b64)}`;
  });

  constructor(readonly theme: ShellThemeService) {
    effect(() => {
      const T = THEMES[this.wireTheme()] ?? THEMES['paper'];
      const el = document.documentElement;
      el.style.setProperty('--w-bg',       T.bg);
      el.style.setProperty('--w-surface',  T.surface);
      el.style.setProperty('--w-border',   T.border);
      el.style.setProperty('--w-borderD',  T.borderD);
      el.style.setProperty('--w-ink',      T.ink);
      el.style.setProperty('--w-inkMid',   T.inkMid);
      el.style.setProperty('--w-inkFaint', T.inkFaint);
      el.style.setProperty('--w-fill',     T.fill);
      el.style.setProperty('--w-blue',     T.blue);
      el.style.setProperty('--w-accent',   T.accent);
      el.style.setProperty('--w-accentFg', T.accentFg);
    });
  }

  ngOnInit(): void {
    const hash = window.location.hash;
    const match = hash.match(/[?&]w=([^&]+)/);
    if (!match) { this.notFound.set(true); return; }
    try {
      const b64 = decodeURIComponent(match[1]);
      const dsl = decodeURIComponent(escape(atob(b64)));
      this.dslRaw.set(dsl);
      const p = parseDSL(dsl);
      this.parsed.set(p);
      const keys = Object.keys(p.pages);
      if (keys.length) this.currentPage.set(keys[0]);
      else this.notFound.set(true);
    } catch { this.notFound.set(true); }
  }

  navTo(target: string): void {
    if (!this.parsed().pages[target]) return;
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(target);
  }
  goBack(): void {
    const h = this.history();
    if (!h.length) return;
    this.currentPage.set(h[h.length - 1]);
    this.history.update(hh => hh.slice(0, -1));
  }
  goTo(name: string): void {
    if (name === this.currentPage()) return;
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(name);
  }
}
