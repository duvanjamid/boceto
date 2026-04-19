import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { WireNode } from '../types';

@Component({
  selector: 'wire-node',
  standalone: true,
  // Self-import enables recursive templates
  imports: [NgStyle, WireNodeComponent],
  templateUrl: './wire-node.component.html',
  styleUrls: ['./wire-node.component.css'],
  // Default CD because tab-click mutates local map
  changeDetection: ChangeDetectionStrategy.Default,
})
export class WireNodeComponent {
  @Input() node!: WireNode;
  @Input() depth = 0;
  @Output() navigate = new EventEmitter<string>();

  /** Active tab index per tabs-node instance */
  private tabStates    = new Map<WireNode, number>();
  /** Toggle on/off state per toggle-node instance */
  private toggleStates = new Map<WireNode, boolean>();
  /** Checkbox checked state per check-node instance */
  private checkStates  = new Map<WireNode, boolean>();

  getTab(node: WireNode): number   { return this.tabStates.get(node) ?? 0; }
  setTab(node: WireNode, i: number): void { this.tabStates.set(node, i); }

  getToggle(node: WireNode): boolean { return this.toggleStates.get(node) ?? false; }
  flipToggle(node: WireNode): void   { this.toggleStates.set(node, !this.getToggle(node)); }

  getCheck(node: WireNode): boolean { return this.checkStates.get(node) ?? false; }
  flipCheck(node: WireNode): void   { this.checkStates.set(node, !this.getCheck(node)); }

  /** Split tab children at divider nodes — returns content for active tab */
  getTabContent(node: WireNode): WireNode[] {
    if (!node.children?.length) return [];
    const sections: WireNode[][] = [[]];
    for (const child of node.children) {
      if (child.type === 'divider') sections.push([]);
      else sections[sections.length - 1].push(child);
    }
    return sections[this.getTab(node)] ?? sections[0] ?? [];
  }

  onNav(target: string | null | undefined): void {
    if (target) this.navigate.emit(target);
  }

  /** Initials from a full name, e.g. "Ana López" → "AL" */
  initials(name: string): string {
    return (name ?? '')
      .split(' ')
      .map(w => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /** Deterministic bar width for grid mock rows */
  barWidth(row: number, col: number): string {
    return `${40 + Math.sin(row * 3 + col) * 25 + 25}%`;
  }

  trackByIdx(_i: number): number { return _i; }
}
