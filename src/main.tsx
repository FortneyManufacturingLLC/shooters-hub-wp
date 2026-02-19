import React from 'react';
import ReactDOM from 'react-dom/client';
import type { EmbedConfig } from './types';
import { ShootersHubApp } from './App';
import './styles.css';

declare global {
  interface Window {
    ShootersHubPlugin?: {
      mount: (selector: string, config: EmbedConfig) => void;
    };
  }
}

const parseConfig = (raw: string): EmbedConfig | null => {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.type || !parsed.apiBase || !parsed.olcBase) return null;
    if (parsed.type === 'finder' && !parsed.mode) return null;
    if (parsed.type === 'entity-page' && !parsed.entityType) return null;
    return parsed as EmbedConfig;
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

window.ShootersHubPlugin = {
  mount: (selector: string, config: EmbedConfig) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Selector ${selector} not found`);
    mount(node, config);
  },
};
