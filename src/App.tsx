import React, { useEffect, useMemo } from 'react';
import MatchFinderPage from '@/components/MatchFinderPage.tsx';
import type { EmbedConfig, FinderFilters } from './types';

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

const normalizeFilters = (raw?: FinderFilters): Partial<any> | undefined => {
  if (!raw) return undefined;
  return {
    types: Array.isArray(raw.types) ? raw.types : [],
    subDisciplines: Array.isArray(raw.subDisciplines) ? raw.subDisciplines : [],
    tiers: Array.isArray(raw.tiers) ? raw.tiers : [],
    statuses: Array.isArray(raw.statuses) ? raw.statuses : [],
    series: Array.isArray(raw.series) ? raw.series : [],
    seriesMode: raw.seriesMode === 'and' ? 'and' : 'or',
    from: raw.from,
    to: raw.to,
    radius: toNumber(raw.radius),
    zip: raw.zip,
    lat: toNumber(raw.lat),
    lng: toNumber(raw.lng),
    sort: raw.sort,
    minEvents: toNumber(raw.minEvents),
  };
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

  const defaultRadius = toNumber(config.finder?.defaultRadius);
  const initialFilters = useMemo(() => {
    const base = normalizeFilters(config.finder?.initialFilters) || {};
    if (defaultCenter) {
      if (base.lat == null) base.lat = defaultCenter.lat;
      if (base.lng == null) base.lng = defaultCenter.lng;
    }
    if (defaultRadius != null && base.radius == null) {
      base.radius = defaultRadius;
    }
    return base;
  }, [config.finder?.initialFilters, defaultCenter, defaultRadius]);

  return (
    <MatchFinderPage
      mode={config.mode}
      allowedViews={allowedViews as any}
      defaultView={config.finder?.defaultView as any}
      defaultCenter={defaultCenter}
      defaultRadius={defaultRadius}
      hideDistanceFilters={!!config.finder?.hideDistanceFilters}
      lockedClubId={config.finder?.lockedClubId}
      siteBaseUrlOverride={config.finder?.publicAppBase}
      initialFilters={initialFilters as any}
    />
  );
};
