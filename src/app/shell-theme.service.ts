import { Injectable, signal, effect } from '@angular/core';

/**
 * Global shell theme (dark / light).
 * - Reads OS preference (prefers-color-scheme) on first visit
 * - Persists choice in localStorage under "boceto-theme"
 * - Writes data-shell attr to <html> reactively via effect()
 * - Provided in root → single instance across all pages
 */
@Injectable({ providedIn: 'root' })
export class ShellThemeService {
  readonly dark = signal<boolean>(this._readInitial());

  constructor() {
    // Keep <html data-shell="…"> in sync whenever dark changes
    effect(() => {
      document.documentElement.setAttribute('data-shell', this.dark() ? 'dark' : 'light');
      try { localStorage.setItem('boceto-theme', this.dark() ? 'dark' : 'light'); } catch {}
    });
  }

  toggle(): void { this.dark.update(v => !v); }

  private _readInitial(): boolean {
    try {
      const stored = localStorage.getItem('boceto-theme');
      if (stored === 'dark')  return true;
      if (stored === 'light') return false;
    } catch {}
    // Fall back to OS preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }
}
