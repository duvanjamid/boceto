import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewInit, OnDestroy,
  OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment }  from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  defaultHighlightStyle, syntaxHighlighting,
  indentOnInput, bracketMatching,
} from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { wirescript } from '../wirescript-lang';

// ── Light highlight style ─────────────────────────────
const lightHighlight = HighlightStyle.define([
  { tag: tags.comment,   color: '#9d9ab0', fontStyle: 'italic' },
  { tag: tags.keyword,   color: '#7c6ff7', fontWeight: '600' },
  { tag: tags.atom,      color: '#e05c8a' },
  { tag: tags.link,      color: '#2563eb', textDecoration: 'none' },
  { tag: tags.string,    color: '#16a34a' },
  { tag: tags.meta,      color: '#9333ea' },
  { tag: tags.operator,  color: '#d97706' },
  { tag: tags.definition(tags.name), color: '#dc2626', fontWeight: '700' },
  { tag: tags.heading,   color: '#1a1826', fontWeight: '700' },
]);

// ── Dark highlight style ──────────────────────────────
const darkHighlight = HighlightStyle.define([
  { tag: tags.comment,   color: '#4a4760', fontStyle: 'italic' },
  { tag: tags.keyword,   color: '#a78bfa', fontWeight: '600' },
  { tag: tags.atom,      color: '#f472b6' },
  { tag: tags.link,      color: '#60a5fa', textDecoration: 'none' },
  { tag: tags.string,    color: '#4ade80' },
  { tag: tags.meta,      color: '#c084fc' },
  { tag: tags.operator,  color: '#fbbf24' },
  { tag: tags.definition(tags.name), color: '#f87171', fontWeight: '700' },
  { tag: tags.heading,   color: '#e4e0ff', fontWeight: '700' },
]);

// ── Light editor theme ────────────────────────────────
const lightTheme = EditorView.theme({
  '&': {
    background: '#f5f4fa',
    color: '#1a1826',
    height: '100%',
  },
  '.cm-content': { padding: '14px 0', caretColor: '#7c6ff7' },
  '.cm-line': { padding: '0 16px', lineHeight: '1.85', fontSize: '12.5px' },
  '.cm-activeLine': { background: 'rgba(124,111,247,.06)' },
  '.cm-gutters': { background: '#ede9ff', borderRight: '1px solid #e2dff0', color: '#9d9ab0' },
  '.cm-activeLineGutter': { background: 'rgba(124,111,247,.12)' },
  '.cm-cursor': { borderLeftColor: '#7c6ff7' },
  '.cm-selectionBackground': { background: 'rgba(124,111,247,.2) !important' },
});

// ── Dark editor theme (extends one-dark) ─────────────
const darkEditorTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '14px 0', caretColor: '#a78bfa' },
  '.cm-line': { padding: '0 16px', lineHeight: '1.85', fontSize: '12.5px' },
  '.cm-gutters': { background: '#0e0d18', borderRight: '1px solid #1a1826' },
  '.cm-activeLine': { background: 'rgba(124,111,247,.08)' },
  '.cm-activeLineGutter': { background: 'rgba(124,111,247,.12)' },
});

@Component({
  selector: 'wire-editor',
  standalone: true,
  template: `<div #host class="editor-host"></div>`,
  styles: [`
    :host { display: block; height: 100%; }
    .editor-host { height: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('host') hostEl!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Input() darkMode = true;
  @Output() valueChange = new EventEmitter<string>();

  private view?: EditorView;
  private themeCompartment = new Compartment();
  private highlightCompartment = new Compartment();
  private _skipNextUpdate = false;

  ngAfterViewInit(): void {
    const state = EditorState.create({
      doc: this.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        wirescript(),
        lineNumbers(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        this.themeCompartment.of(this.getThemeExtensions()),
        this.highlightCompartment.of(this.getHighlightExtension()),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this._skipNextUpdate) {
            this.valueChange.emit(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    this.view = new EditorView({ state, parent: this.hostEl.nativeElement });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.view) {
      const current = this.view.state.doc.toString();
      if (current !== this.value) {
        this._skipNextUpdate = true;
        this.view.dispatch({
          changes: { from: 0, to: current.length, insert: this.value },
        });
        this._skipNextUpdate = false;
      }
    }
    if (changes['darkMode'] && this.view) {
      this.view.dispatch({
        effects: [
          this.themeCompartment.reconfigure(this.getThemeExtensions()),
          this.highlightCompartment.reconfigure(this.getHighlightExtension()),
        ],
      });
    }
  }

  /** In split mode, scroll editor so the @PageName line is visible */
  scrollToPage(pageName: string): void {
    if (!this.view) return;
    const text = this.view.state.doc.toString();
    const token = '@' + pageName;
    // Match @PageName at start of line
    const idx = text.search(new RegExp('(^|\\n)' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)'));
    const pos = idx < 0 ? -1 : (text[idx] === '\n' ? idx + 1 : idx);
    if (pos < 0) return;
    const line = this.view.state.doc.lineAt(pos);
    this.view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 24 }),
    });
    this.view.focus();
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  private getThemeExtensions() {
    return this.darkMode
      ? [oneDark, darkEditorTheme]
      : [lightTheme];
  }

  private getHighlightExtension() {
    return syntaxHighlighting(
      this.darkMode ? darkHighlight : lightHighlight
    );
  }
}
