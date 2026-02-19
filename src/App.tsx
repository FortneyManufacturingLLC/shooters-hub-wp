import React, { useEffect, useMemo } from 'react';
import { MatchFinder } from './match-finder';
import type { EmbedConfig } from './types';

interface AppProps {
  config: EmbedConfig;
  node: HTMLElement;
}

declare global {
  interface Window {
    __SH_PLUGIN_API_BASE__?: string;
    __SH_PLUGIN_OLC_BASE__?: string;
  }
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const applyTheme = (node: HTMLElement, config?: EmbedConfig['theme']) => {
  const tokens = config?.tokens;
  if (!tokens || typeof tokens !== 'object') return;
  Object.entries(tokens).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    node.style.setProperty(key, value);
  });
};

export const ShootersHubApp: React.FC<AppProps> = ({ config, node }) => {
  useEffect(() => {
    applyTheme(node, config.theme);
  }, [node, config.theme]);

  useEffect(() => {
    window.__SH_PLUGIN_API_BASE__ = config.apiBase;
    window.__SH_PLUGIN_OLC_BASE__ = config.olcBase;
  }, [config.apiBase, config.olcBase]);

  const allowedViews = useMemo(() => {
    const fromConfig = Array.isArray(config.finder?.allowedViews) ? config.finder.allowedViews : [];
    if (fromConfig.length) return fromConfig as any;
    return config.mode === 'clubs' ? ['map', 'list'] : ['map', 'list', 'calendar', 'chart'];
  }, [config.finder?.allowedViews, config.mode]);

  const defaultCenter = useMemo(() => {
    const lat = toNumber(config.finder?.defaultCenter?.lat);
    const lng = toNumber(config.finder?.defaultCenter?.lng);
    if (lat == null || lng == null) return undefined;
    return { lat, lng };
  }, [config.finder?.defaultCenter?.lat, config.finder?.defaultCenter?.lng]);

  const options = useMemo(() => {
    const initial = config.finder?.initialFilters;
    return {
      allowedViews,
      defaults: {
        view: config.finder?.defaultView,
        lat: toNumber(initial?.lat) ?? defaultCenter?.lat,
        lng: toNumber(initial?.lng) ?? defaultCenter?.lng,
        radius: toNumber(initial?.radius) ?? toNumber(config.finder?.defaultRadius),
        from: initial?.from,
        to: initial?.to,
        types: Array.isArray(initial?.types) ? initial?.types.join(',') : undefined,
        tiers: Array.isArray(initial?.tiers) ? initial?.tiers.join(',') : undefined,
        statuses: Array.isArray(initial?.statuses) ? initial?.statuses.join(',') : undefined,
        series: Array.isArray(initial?.series) ? initial?.series.join(',') : undefined,
      },
      locks: {
        view: false,
        location: !!config.finder?.hideDistanceFilters,
        radius: !!config.finder?.hideDistanceFilters,
        filters: false,
      },
      radiusLimits: { min: 5, max: 500 },
      showPoweredBy: true,
      poweredByUrl: config.finder?.publicAppBase,
    };
  }, [allowedViews, config.finder, defaultCenter?.lat, defaultCenter?.lng]);

  return (
    <MatchFinder
      restBase={config.apiBase}
      options={options as any}
      attrs={undefined}
    />
  );
};
