import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { EditorShellComponent } from './editor/editor-shell.component';
import { ViewerComponent } from './viewer/viewer.component';
import { DocsComponent } from './docs/docs.component';

export const routes: Routes = [
  { path: '',       component: LandingComponent },
  { path: 'editor', component: EditorShellComponent },
  { path: 'view',   component: ViewerComponent },
  { path: 'docs',   component: DocsComponent },
  { path: '**',     redirectTo: '' },
];
