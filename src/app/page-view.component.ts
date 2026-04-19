import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { WireNode, WirePage } from '../types';
import { WireNodeComponent } from './boceto-node.component';

@Component({
  selector: 'page-view',
  standalone: true,
  imports: [WireNodeComponent],
  template: `
    @if (page) {
      <div class="page-view">
        @for (node of page.children; track $index) {
          <boceto-node [node]="node" [depth]="0" (navigate)="navigate.emit($event)"></boceto-node>
        }
      </div>
    }
  `,
  styles: [`
    .page-view {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageViewComponent {
  @Input() page: WirePage | null = null;
  @Output() navigate = new EventEmitter<string>();
}
