export interface WireNode {
  type: string;
  text?: string;
  label?: string;
  name?: string;
  title?: string;
  value?: string;
  items?: string[];
  cols?: string[];
  options?: string[];
  children?: WireNode[];
  target?: string | null;
  password?: boolean;
  optional?: boolean;
  style?: string;     // inline CSS via $"prop:val;prop:val"
  checked?: boolean;  // check/toggle initial state: check Label *
  align?: string;     // row right | row center | row space
  closable?: boolean; // card+ renders a close × in the header
}

export interface WirePage {
  name: string;
  children: WireNode[];
}

export interface ParsedDSL {
  pages: Record<string, WirePage>;
  theme: string;
}

export type ThemeName = 'paper' | 'blueprint' | 'sketch' | 'noir' | 'handwriting' | 'arch';

export interface ThemeTokens {
  bg: string; surface: string; border: string; borderD: string;
  ink: string; inkMid: string; inkFaint: string; fill: string;
  blue: string; accent: string; accentFg: string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  paper:       { bg:'#f8f7f4', surface:'#ffffff', border:'#d6d3cc', borderD:'#b0aca4', ink:'#1a1916', inkMid:'#6b6760', inkFaint:'#a8a49e', fill:'#eceae5', blue:'#3b5bdb', accent:'#1a1916', accentFg:'#f8f7f4' },
  blueprint:   { bg:'#0d1f3c', surface:'#112348', border:'#1e4080', borderD:'#2a5aaa', ink:'#a8cfff', inkMid:'#5a8fd4', inkFaint:'#2a5090', fill:'#0a1830', blue:'#60a5fa', accent:'#a8cfff', accentFg:'#0d1f3c' },
  sketch:      { bg:'#ffffff', surface:'#fafafa', border:'#222222', borderD:'#111111', ink:'#111111', inkMid:'#444444', inkFaint:'#999999', fill:'#f0f0f0', blue:'#1a56db', accent:'#111111', accentFg:'#ffffff' },
  noir:        { bg:'#141414', surface:'#1e1e1e', border:'#2e2e2e', borderD:'#444444', ink:'#f0f0f0', inkMid:'#aaaaaa', inkFaint:'#555555', fill:'#252525', blue:'#60a5fa', accent:'#f0f0f0', accentFg:'#141414' },
  handwriting: { bg:'#fdf8f0', surface:'#fff9f2', border:'#c4a882', borderD:'#9a7855', ink:'#2c1a08', inkMid:'#7a5a35', inkFaint:'#c4a070', fill:'#f5e8cc', blue:'#4a7fc4', accent:'#3d2010', accentFg:'#fdf8f0' },
  arch:        { bg:'#030912', surface:'#060f22', border:'#0c2e74', borderD:'#1850cc', ink:'#c8e4ff', inkMid:'#4a84d4', inkFaint:'#0c2a6a', fill:'#040c20', blue:'#38b6ff', accent:'#38b6ff', accentFg:'#030912' },
};

export const THEME_ICONS: Record<string, string> = {
  paper: '☕', blueprint: '📐', sketch: '✏️', noir: '🌙',
  handwriting: '🖊️', arch: '📏',
};
