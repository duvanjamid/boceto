import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlaygroundComponent } from '../playground/playground.component';

@Component({
  selector: 'boceto-embed',
  standalone: true,
  imports: [PlaygroundComponent],
  template: `
    <boceto-playground 
      [mode]="mode" 
      [readonly]="readonly"
      [shellTheme]="shellTheme"
      [initialCode]="initialCode">
    </boceto-playground>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `]
})
export class EmbedComponent implements OnInit {
  mode: 'full' | 'lite' | 'preview' = 'lite';
  readonly = false;
  shellTheme: 'dark' | 'light' | 'auto' = 'auto';
  initialCode: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    
    if (params['mode']) this.mode = params['mode'] as any;
    if (params['readonly'] !== undefined) {
      this.readonly = params['readonly'] === 'true' || params['readonly'] === '';
    }
    if (params['theme']) this.shellTheme = params['theme'] as any;
    
    // Support passing code via standard query parameter instead of hash
    if (params['w']) {
      try {
        const b64 = decodeURIComponent(params['w']);
        this.initialCode = decodeURIComponent(escape(atob(b64)));
      } catch (e) {
        console.error("Failed to parse 'w' param", e);
      }
    }
  }
}
