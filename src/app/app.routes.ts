import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { LicenseComponent } from './license/license.component';
import { PlaygroundComponent } from './playground/playground.component';
import { ViewerComponent } from './viewer/viewer.component';
import { DocsComponent } from './docs/docs.component';
import { EmbedComponent } from './embed/embed.component';
import { EmbedGuideComponent } from './docs/embed-guide/embed-guide.component';
import { PluginsComponent } from './plugins/plugins.component';

export const routes: Routes = [
  { path: '',       component: LandingComponent },
  { path: 'editor', component: PlaygroundComponent },
  { path: 'embed',  component: EmbedComponent },
  { path: 'view',   component: ViewerComponent },
  { path: 'docs',   component: DocsComponent },
  { path: 'docs/embed', component: EmbedGuideComponent },
  { path: 'plugins', component: PluginsComponent },
  { path: 'license', component: LicenseComponent },
  { path: '**',     redirectTo: '' },
];
