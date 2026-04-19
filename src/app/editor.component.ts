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
import { boceto } from '../boceto-lang';

import { customKwTags } from '../boceto-lang';

// ── Light highlight style ─────────────────────────────
const lightHighlight = HighlightStyle.define([
  { tag: tags.comment,        color: '#9d9ab0', fontStyle: 'italic' },
  { tag: tags.link,           color: '#15803d', textDecoration: 'none' },
  { tag: tags.string,         color: '#16a34a' },
  { tag: tags.meta,           color: '#9333ea' },
  { tag: tags.operator,       color: '#d97706' },
  { tag: tags.definition(tags.name), color: '#dc2626', fontWeight: '700' },
  { tag: tags.heading,        color: '#059669', fontWeight: '700' },
  
  // Custom keyword mappings
  // Containers
  { tag: customKwTags['nav'],   color: '#4f46e5', fontWeight: '600' },
  { tag: customKwTags['tabs'],  color: '#6366f1', fontWeight: '600' },
  { tag: customKwTags['row'],   color: '#0ea5e9', fontWeight: '600' },
  { tag: customKwTags['col'],   color: '#0284c7', fontWeight: '600' },
  { tag: customKwTags['card'],  color: '#8b5cf6', fontWeight: '600' },
  { tag: customKwTags['aside'], color: '#5b21b6', fontWeight: '600' },
  { tag: customKwTags['modal'], color: '#c026d3', fontWeight: '600' },
  
  // Forms
  { tag: customKwTags['field'],  color: '#059669', fontWeight: '600' },
  { tag: customKwTags['area'],   color: '#10b981', fontWeight: '600' },
  { tag: customKwTags['pick'],   color: '#14b8a6', fontWeight: '600' },
  { tag: customKwTags['check'],  color: '#0d9488', fontWeight: '600' },
  { tag: customKwTags['toggle'], color: '#0891b2', fontWeight: '600' },
  
  // Actions
  { tag: customKwTags['btn'],    color: '#e11d48', fontWeight: '600' },
  { tag: customKwTags['ghost'],  color: '#db2777', fontWeight: '600' },
  { tag: customKwTags['kwlink'], color: '#d946ef', fontWeight: '600' },
  
  // Content
  { tag: customKwTags['img'],    color: '#d97706', fontWeight: '600' },
  { tag: customKwTags['avatar'], color: '#ea580c', fontWeight: '600' },
  { tag: customKwTags['badge'],  color: '#c2410c', fontWeight: '600' },
  { tag: customKwTags['kpi'],    color: '#b45309', fontWeight: '600' },
  { tag: customKwTags['grid'],   color: '#9a3412', fontWeight: '600' },
  { tag: customKwTags['list'],   color: '#854d0e', fontWeight: '600' },
  
  // Text
  { tag: customKwTags['p'],      color: '#475569', fontWeight: '600' },
  { tag: customKwTags['note'],   color: '#64748b', fontWeight: '600' },
]);

// ── Dark highlight style ──────────────────────────────
const darkHighlight = HighlightStyle.define([
  { tag: tags.comment,        color: '#4a4760', fontStyle: 'italic' },
  { tag: tags.link,           color: '#4ade80', textDecoration: 'none' },
  { tag: tags.string,         color: '#4ade80' },
  { tag: tags.meta,           color: '#c084fc' },
  { tag: tags.operator,       color: '#fbbf24' },
  { tag: tags.definition(tags.name), color: '#f87171', fontWeight: '700' },
  { tag: tags.heading,        color: '#34d399', fontWeight: '700' },

  // Custom keyword mappings
  // Containers
  { tag: customKwTags['nav'],   color: '#818cf8', fontWeight: '600' },
  { tag: customKwTags['tabs'],  color: '#a5b4fc', fontWeight: '600' },
  { tag: customKwTags['row'],   color: '#38bdf8', fontWeight: '600' },
  { tag: customKwTags['col'],   color: '#7dd3fc', fontWeight: '600' },
  { tag: customKwTags['card'],  color: '#a78bfa', fontWeight: '600' },
  { tag: customKwTags['aside'], color: '#c4b5fd', fontWeight: '600' },
  { tag: customKwTags['modal'], color: '#e879f9', fontWeight: '600' },
  
  // Forms
  { tag: customKwTags['field'],  color: '#34d399', fontWeight: '600' },
  { tag: customKwTags['area'],   color: '#6ee7b7', fontWeight: '600' },
  { tag: customKwTags['pick'],   color: '#2dd4bf', fontWeight: '600' },
  { tag: customKwTags['check'],  color: '#5eead4', fontWeight: '600' },
  { tag: customKwTags['toggle'], color: '#22d3ee', fontWeight: '600' },
  
  // Actions
  { tag: customKwTags['btn'],    color: '#fb7185', fontWeight: '600' },
  { tag: customKwTags['ghost'],  color: '#f472b6', fontWeight: '600' },
  { tag: customKwTags['kwlink'], color: '#f0abfc', fontWeight: '600' },
  
  // Content
  { tag: customKwTags['img'],    color: '#fbbf24', fontWeight: '600' },
  { tag: customKwTags['avatar'], color: '#fb923c', fontWeight: '600' },
  { tag: customKwTags['badge'],  color: '#f97316', fontWeight: '600' },
  { tag: customKwTags['kpi'],    color: '#fcd34d', fontWeight: '600' },
  { tag: customKwTags['grid'],   color: '#fdba74', fontWeight: '600' },
  { tag: customKwTags['list'],   color: '#fde047', fontWeight: '600' },
  
  // Text
  { tag: customKwTags['p'],      color: '#94a3b8', fontWeight: '600' },
  { tag: customKwTags['note'],   color: '#cbd5e1', fontWeight: '600' },
]);

// ── Light editor theme ────────────────────────────────
const lightTheme = EditorView.theme({
  '&': {
    background: '#f5f4fa',
    color: '#4a4859',
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
  selector: 'boceto-editor',
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
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<string>();

  private view?: EditorView;
  private themeCompartment = new Compartment();
  private highlightCompartment = new Compartment();
  private readonlyCompartment = new Compartment();
  private _skipNextUpdate = false;

  ngAfterViewInit(): void {
    const state = EditorState.create({
      doc: this.value,
      extensions: [
        this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly)),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        boceto(),
        lineNumbers(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        this.themeCompartment.of(this.getThemeExtensions()),
        this.highlightCompartment.of(this.getHighlightExtension()),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this._skipNextUpdate && !this.readonly) {
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
    const effects = [];
    if (changes['darkMode'] && this.view) {
      effects.push(this.themeCompartment.reconfigure(this.getThemeExtensions()));
      effects.push(this.highlightCompartment.reconfigure(this.getHighlightExtension()));
    }
    if (changes['readonly'] && this.view) {
      effects.push(this.readonlyCompartment.reconfigure(EditorState.readOnly.of(this.readonly)));
    }
    if (effects.length > 0 && this.view) {
      this.view.dispatch({ effects });
    }
  }

  /** In split mode, scroll editor so the @PageName line is visible */
  scrollToPage(pageName: string, focus = true): void {
    if (!this.view) return;
    const text = this.view.state.doc.toString();
    const token = '@' + pageName;
    // Match @PageName at start of line
    const idx = text.search(new RegExp('(^|\\n)' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)'));
    const pos = idx < 0 ? -1 : (text[idx] === '\n' ? idx + 1 : idx);
    if (pos < 0) return;
    const line = this.view.state.doc.lineAt(pos);
    if (focus) {
      this.view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 24 }),
      });
      this.view.focus();
    } else {
      this.view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 24 }),
      });
    }
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
