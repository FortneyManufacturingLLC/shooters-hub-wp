import React, { useEffect, useMemo } from 'react';
import { MatchFinder } from './match-finder';
import { EntityPage } from './entity-page';
import type { EmbedConfig, FinderEmbedConfig } from './types';

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

  if (config.type === 'entity-page') {
    return <EntityPage config={config} />;
  }

  const finderConfig = config as FinderEmbedConfig;

  const allowedViews = useMemo(() => {
    const fromConfig = Array.isArray(finderConfig.finder?.allowedViews) ? finderConfig.finder.allowedViews : [];
    if (fromConfig.length) return fromConfig as any;
    return finderConfig.mode === 'clubs' ? ['map', 'list'] : ['map', 'list', 'calendar', 'chart'];
  }, [finderConfig.finder?.allowedViews, finderConfig.mode]);

  const defaultCenter = useMemo(() => {
    const lat = toNumber(finderConfig.finder?.defaultCenter?.lat);
    const lng = toNumber(finderConfig.finder?.defaultCenter?.lng);
    if (lat == null || lng == null) return undefined;
    return { lat, lng };
  }, [finderConfig.finder?.defaultCenter?.lat, finderConfig.finder?.defaultCenter?.lng]);

  const options = useMemo(() => {
    const initial = finderConfig.finder?.initialFilters;
    return {
      mode: finderConfig.mode,
      allowedViews,
      defaults: {
        view: finderConfig.finder?.defaultView,
        lat: toNumber(initial?.lat) ?? defaultCenter?.lat,
        lng: toNumber(initial?.lng) ?? defaultCenter?.lng,
        radius: toNumber(initial?.radius) ?? toNumber(finderConfig.finder?.defaultRadius),
        from: initial?.from,
        to: initial?.to,
        types: Array.isArray(initial?.types) ? initial?.types.join(',') : undefined,
        subDisciplines: Array.isArray(initial?.subDisciplines) ? initial?.subDisciplines.join(',') : undefined,
        tiers: Array.isArray(initial?.tiers) ? initial?.tiers.join(',') : undefined,
        statuses: Array.isArray(initial?.statuses) ? initial?.statuses.join(',') : undefined,
        series: Array.isArray(initial?.series) ? initial?.series.join(',') : undefined,
        seriesMode: initial?.seriesMode,
        sort: initial?.sort,
        minEvents: initial?.minEvents,
      },
      locks: {
        view: false,
        location: !!finderConfig.finder?.hideDistanceFilters,
        radius: !!finderConfig.finder?.hideDistanceFilters,
        filters: false,
      },
      radiusLimits: { min: 5, max: 500 },
      showPoweredBy: true,
      poweredByUrl: finderConfig.finder?.publicAppBase,
      controlsLayout: (finderConfig.finder as any)?.controlsLayout || 'left',
      hideDistanceFilters: !!finderConfig.finder?.hideDistanceFilters,
      entityLinkMode: finderConfig.finder?.entityLinkMode || 'external',
      entityPathBases: finderConfig.finder?.entityPathBases || {},
      olcBase: finderConfig.olcBase,
    };
  }, [allowedViews, finderConfig, defaultCenter?.lat, defaultCenter?.lng]);

  return (
    <MatchFinder
      restBase={finderConfig.apiBase}
      options={options as any}
      attrs={undefined}
    />
  );
};
