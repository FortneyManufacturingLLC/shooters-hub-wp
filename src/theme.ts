import type { PluginOptions } from './types';

export function applyTheme(node: HTMLElement, options?: PluginOptions['theme']) {
  if (!node || !options) return;
  if (options.tokens) {
    Object.entries(options.tokens).forEach(([key, value]) => {
      node.style.setProperty(key, String(value));
    });
  }
  if (options.mode) {
    node.dataset.shThemeMode = options.mode;
  }
}
