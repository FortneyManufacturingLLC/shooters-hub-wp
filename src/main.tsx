import React from 'react';
import ReactDOM from 'react-dom/client';
import type { EmbedConfig, PluginOptions } from './types';
import { ShootersHubApp } from './App';
import './styles.css';

const normalizeOptions = (options?: Partial<PluginOptions>): PluginOptions => {
  const defaults = options?.defaults ?? {};
  const locks = options?.locks ?? {};
  const allowedViews = Array.isArray(options?.allowedViews) ? (options?.allowedViews as PluginOptions['allowedViews']) : [];
  const radiusLimits = options?.radiusLimits ?? {};
  return {
    defaults,
    locks,
    allowedViews,
    radiusLimits,
    theme: options?.theme,
    showPoweredBy: options?.showPoweredBy !== false,
    poweredByUrl: options?.poweredByUrl,
  };
};

const parseConfig = (raw: string): EmbedConfig | null => {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') return null;
    const options = normalizeOptions(parsed.options);
    const restBase = String(parsed.restBase || '');
    if (!restBase) return null;
    return {
      type: parsed.type || 'matchFinder',
      restBase,
      attrs: parsed.attrs || {},
      options,
    } as EmbedConfig;
  } catch (err) {
    console.error('[ShootersHub] Failed to parse config', err);
    return null;
  }
};

const mount = (node: HTMLElement, config: EmbedConfig) => {
  const root = ReactDOM.createRoot(node);
  root.render(
    <React.StrictMode>
      <ShootersHubApp config={config} node={node} />
    </React.StrictMode>
  );
};

const bootstrap = () => {
  document.querySelectorAll<HTMLElement>('.sh-embed[data-sh-config]').forEach((node) => {
    const raw = node.dataset.shConfig || '{}';
    const config = parseConfig(raw);
    if (!config) return;
    mount(node, config);
  });
};

document.addEventListener('DOMContentLoaded', bootstrap);

(window as any).ShootersHubPlugin = {
  mount: (selector: string, config: EmbedConfig) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Selector ${selector} not found`);
    mount(node, config);
  },
};
