import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchMatches, mergeDefaults, type MatchQuery } from './api';
import type { MatchSummary, PluginOptions, ViewMode } from './types';
import { clamp, formatAddress, formatDate, formatDistance, sortMatchesByDate } from './utils';
import { PoweredBy } from './powered-by';
import { EntityListCard } from '@shooters-hub/entity-ui';

const DISCIPLINE_NAMES: Record<string, string> = {
  PR: 'Precision Rifle',
  PS: 'Practical Shooting',
  SG: 'Shot Gun',
  CW: 'Cowboy Western',
  BR: 'Benchrest',
  SPC: 'Specialty events/other',
  ARCH: 'Archery',
  MTS: 'Mounted Shooting',
};

const SUB_DISCIPLINE_NAMES: Record<string, string> = {
  RF: 'Rimfire',
  CF: 'Centerfire',
  AG: 'Airgun',
  '1G': '1 Gun',
  '2G': '2 Gun',
  '3G': '3 Gun',
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MatchFinderProps {
  restBase: string;
  options: PluginOptions;
  attrs?: Record<string, any>;
}

interface FinderState {
  view: ViewMode;
  lat?: number;
  lng?: number;
  radius: number;
  from?: string;
  to?: string;
  types?: string;
  subDisciplines?: string;
  tiers?: string;
  statuses?: string;
  seasons?: string;
  series?: string;
  seriesMode: 'or' | 'and';
  minEvents?: number;
  sort?: 'dateAsc' | 'dateDesc' | 'nameAsc' | 'nameDesc';
}

interface ClubResultItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  nextEventDate?: string;
  upcomingCount: number;
  disciplines: string[];
  subDisciplines: string[];
  tiers: string[];
  statuses: string[];
  seriesIds: string[];
}

interface CalendarDay {
  date: Date;
  iso: string;
  isOutsideMonth: boolean;
}

const parseBoolean = (value: any, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseView = (value: any, allowed: ViewMode[], fallback: ViewMode): ViewMode => {
  const candidate = String(value || '').toLowerCase() as ViewMode;
  return allowed.includes(candidate) ? candidate : fallback;
};

const parseCsv = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.join(',');
  const str = String(value).trim();
  return str ? str : undefined;
};

const csvToList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const listToCsv = (values: string[]): string | undefined => {
  if (!values.length) return undefined;
  return values.join(',');
};

const normalizeLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const humanizeDiscipline = (value: string): string => {
  const key = String(value || '').trim().toUpperCase();
  return DISCIPLINE_NAMES[key] || titleCase(String(value || '').replace(/[_-]+/g, ' '));
};

const humanizeSubDiscipline = (value: string): string => {
  const key = String(value || '').trim().toUpperCase();
  return SUB_DISCIPLINE_NAMES[key] || titleCase(String(value || '').replace(/[_-]+/g, ' '));
};

const prettySeriesLabel = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  if (/^[a-z0-9_-]+$/.test(raw)) return raw.toUpperCase();
  return raw;
};

const resolveMatchTitle = (match: any): string => {
  const candidates = [match?.title, match?.name, match?.matchTitle, match?.eventTitle, match?.id];
  for (const item of candidates) {
    const text = normalizeLabel(item);
    if (text) return text;
  }
  return 'Match';
};

const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const buildCalendarDays = (monthCursor: Date): CalendarDay[] => {
  const start = startOfMonth(monthCursor);
  const end = endOfMonth(monthCursor);
  const startOffset = start.getDay();
  const endOffset = 6 - end.getDay();
  const gridStart = addDays(start, -startOffset);
  const totalDays = Math.ceil((startOffset + end.getDate() + endOffset) / 7) * 7;
  const days: CalendarDay[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(gridStart, i);
    days.push({
      date,
      iso: toIsoDate(date),
      isOutsideMonth: date.getMonth() !== monthCursor.getMonth(),
    });
  }
  return days;
};

const parseNumberOrUndefined = (value: string | null): number | undefined => {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const parseStateFromQuery = (): Partial<FinderState> => {
  if (typeof window === 'undefined') return {};
  const qs = new URLSearchParams(window.location.search);
  const out: Partial<FinderState> = {};
  const view = qs.get('view');
  if (view && ['map', 'list', 'calendar', 'chart'].includes(view)) out.view = view as ViewMode;
  out.lat = parseNumberOrUndefined(qs.get('lat'));
  out.lng = parseNumberOrUndefined(qs.get('lng'));
  const radius = parseNumberOrUndefined(qs.get('radius'));
  if (radius != null) out.radius = radius;
  ['from', 'to', 'types', 'subDisciplines', 'tiers', 'statuses', 'seasons', 'series'].forEach((key) => {
    const value = qs.get(key);
    if (value != null && value !== '') (out as any)[key] = value;
  });
  const seriesMode = qs.get('seriesMode');
  if (seriesMode === 'and' || seriesMode === 'or') out.seriesMode = seriesMode;
  const minEvents = parseNumberOrUndefined(qs.get('minEvents'));
  if (minEvents != null) out.minEvents = Math.max(0, Math.floor(minEvents));
  const sort = qs.get('sort');
  if (sort && ['dateAsc', 'dateDesc', 'nameAsc', 'nameDesc'].includes(sort)) out.sort = sort as FinderState['sort'];
  return out;
};

const toQueryEntries = (state: FinderState): Record<string, string> => {
  const entries: Record<string, string> = {};
  entries.view = state.view;
  if (Number.isFinite(state.lat)) entries.lat = String(state.lat);
  if (Number.isFinite(state.lng)) entries.lng = String(state.lng);
  if (Number.isFinite(state.radius)) entries.radius = String(state.radius);
  if (state.from) entries.from = state.from;
  if (state.to) entries.to = state.to;
  if (state.types) entries.types = state.types;
  if (state.subDisciplines) entries.subDisciplines = state.subDisciplines;
  if (state.tiers) entries.tiers = state.tiers;
  if (state.statuses) entries.statuses = state.statuses;
  if (state.seasons) entries.seasons = state.seasons;
  if (state.series) entries.series = state.series;
  if (state.seriesMode) entries.seriesMode = state.seriesMode;
  if (Number.isFinite(state.minEvents)) entries.minEvents = String(state.minEvents);
  if (state.sort) entries.sort = state.sort;
  return entries;
};

type CachedTile = {
  updatedAt: string;
  fetchedAt: number;
  items: MatchSummary[];
};

const olcTileCache = new Map<string, CachedTile>();
const olcMissingCache = new Map<string, number>();
const MISSING_TTL_MS = 10 * 60 * 1000;

const normalizeMonth = (value?: string): string => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{6}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  return raw;
};

const monthsBetween = (from?: string, to?: string, maxMonths = 12): string[] => {
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00`) : new Date();
  const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T00:00:00`) : new Date(start.getFullYear(), start.getMonth() + 6, 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [new Date().toISOString().slice(0, 7)];
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  const out: string[] = [];
  for (let d = s; d <= e && out.length < maxMonths; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out.length ? out : [new Date().toISOString().slice(0, 7)];
};

const CODE_ALPHABET = '23456789CFGHJMPQRVWX';

const normalizeLng = (lng: number): number => {
  let out = lng;
  while (out < -180) out += 360;
  while (out >= 180) out -= 360;
  return out;
};

const encodeOlc4 = (lat: number, lng: number): string => {
  const latClamped = Math.min(89.999999, Math.max(-90, lat));
  const lngNorm = normalizeLng(lng);
  const latVal = latClamped + 90;
  const lngVal = lngNorm + 180;
  const latFirst = Math.floor(latVal / 20);
  const lngFirst = Math.floor(lngVal / 20);
  const latSecond = Math.floor(latVal % 20);
  const lngSecond = Math.floor(lngVal % 20);
  return (
    CODE_ALPHABET[latFirst] +
    CODE_ALPHABET[lngFirst] +
    CODE_ALPHABET[latSecond] +
    CODE_ALPHABET[lngSecond]
  );
};

const olc4CoverCircle = (center: { lat: number; lng: number }, radiusMi: number): string[] => {
  const latRadius = radiusMi / 69.0;
  const lngRadius = radiusMi / (69.0 * Math.cos((center.lat * Math.PI) / 180));
  const minLat = center.lat - latRadius;
  const maxLat = center.lat + latRadius;
  const minLng = center.lng - lngRadius;
  const maxLng = center.lng + lngRadius;
  const tiles = new Set<string>();
  for (let lat = Math.floor(minLat); lat <= Math.floor(maxLat); lat++) {
    for (let lng = Math.floor(minLng); lng <= Math.floor(maxLng); lng++) {
      tiles.add(encodeOlc4(lat + 0.5, lng + 0.5));
    }
  }
  return Array.from(tiles);
};

const distanceMi = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng),
    Math.sqrt(1 - (sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng))
  );
  return (R * c) / 1609.34;
};

const splitCsvSet = (value?: string): Set<string> => new Set(csvToList(value).map((v) => v.toLowerCase()));

const parseTileToMatches = (tile: any): MatchSummary[] => {
  const rows = Array.isArray(tile?.rows) ? tile.rows : [];
  const columns = Array.isArray(tile?.columns) ? tile.columns : [];
  if (!rows.length || !columns.length) return Array.isArray(tile?.items) ? tile.items : [];

  const idx = (name: string) => columns.indexOf(name);
  const iId = idx('id');
  const iTitle = idx('title');
  const iName = Math.max(idx('name'), idx('matchTitle'));
  const iStart = idx('start');
  const iLat = idx('lat');
  const iLng = idx('lng');
  const iClubName = idx('clubName');
  const iTier = Math.max(idx('matchTier'), idx('tier'));
  const iStatus = idx('status');
  const iDiscipline = idx('discipline');
  const iSubDiscipline = Math.max(idx('subDiscipline'), idx('subDisciplines'));
  const iSeriesIds = idx('seriesIds');
  const iSeasons = idx('seasons');

  const toList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
    return [];
  };

  return rows
    .map((row: any) => {
      if (!Array.isArray(row)) return null;
      const id = iId >= 0 ? String(row[iId] || '').trim() : '';
      if (!id) return null;
      const lat = iLat >= 0 ? Number(row[iLat]) : NaN;
      const lng = iLng >= 0 ? Number(row[iLng]) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const start = iStart >= 0 && row[iStart] != null ? String(row[iStart]) : '';
      const date = start ? start.slice(0, 10) : undefined;
      const disciplines = iDiscipline >= 0 ? toList(row[iDiscipline]) : [];
      const subDiscipline = iSubDiscipline >= 0 ? toList(row[iSubDiscipline]) : [];
      return {
        id,
        title:
          (iTitle >= 0 && row[iTitle] != null ? String(row[iTitle]) : '') ||
          (iName >= 0 && row[iName] != null ? String(row[iName]) : '') ||
          id,
        date,
        location: {
          lat,
          lng,
          name: iClubName >= 0 && row[iClubName] != null ? String(row[iClubName]) : '',
        },
        matchTier: iTier >= 0 && row[iTier] != null ? String(row[iTier]) : undefined,
        status: iStatus >= 0 && row[iStatus] != null ? String(row[iStatus]) : undefined,
        disciplines,
        subDiscipline,
        seriesIds: iSeriesIds >= 0 ? toList(row[iSeriesIds]) : [],
        seasons: iSeasons >= 0 ? toList(row[iSeasons]) : [],
      } as any;
    })
    .filter(Boolean) as MatchSummary[];
};

const fetchMatchesViaOlc = async (
  olcBase: string,
  state: FinderState,
  signal?: AbortSignal
): Promise<MatchSummary[]> => {
  if (!olcBase || state.lat == null || state.lng == null) return [];

  const months = monthsBetween(state.from, state.to, 12);
  const coverage = olc4CoverCircle({ lat: state.lat, lng: state.lng }, state.radius || 100);
  const coverageSet = new Set(coverage);
  const olc2s = Array.from(new Set(coverage.map((code) => code.slice(0, 2))));

  const indexPairs = months.flatMap((month) => olc2s.map((olc2) => ({ olc2, month })));
  const indexResults = await Promise.all(
    indexPairs.map(async ({ olc2, month }) => {
      const url = `${olcBase.replace(/\/+$/, '')}/index?olc2=${encodeURIComponent(olc2)}&month=${encodeURIComponent(month)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) return { key: `${olc2}:${month}`, tiles: null as any[] | null };
      const payload = await res.json().catch(() => ({}));
      const rawTiles = Array.isArray(payload?.tiles) ? payload.tiles : [];
      const tiles = rawTiles
        .map((entry: any) => {
          if (typeof entry === 'string') return { olc4: entry.toUpperCase() };
          const olc4 = typeof entry?.olc4 === 'string' ? entry.olc4.toUpperCase() : '';
          const updatedAt = typeof entry?.updatedAt === 'string' ? entry.updatedAt : undefined;
          return olc4 ? { olc4, updatedAt } : null;
        })
        .filter(Boolean) as Array<{ olc4: string; updatedAt?: string }>;
      return { key: `${olc2}:${month}`, tiles };
    })
  );

  const selectedTileIds = new Set<string>();
  const indexUpdatedAt = new Map<string, string>();
  for (const month of months) {
    for (const olc2 of olc2s) {
      const key = `${olc2}:${month}`;
      const found = indexResults.find((r) => r.key === key);
      const tiles = found?.tiles;
      if (!tiles || !tiles.length) continue;
      tiles.forEach((tile) => {
        if (!coverageSet.has(tile.olc4)) return;
        const tileId = `${tile.olc4}:${month}`;
        selectedTileIds.add(tileId);
        if (tile.updatedAt) indexUpdatedAt.set(tileId, tile.updatedAt);
      });
    }
  }

  const candidates = Array.from(selectedTileIds);
  if (!candidates.length) return [];

  const now = Date.now();
  const tileIds = candidates.filter((tileId) => {
    const missingAt = olcMissingCache.get(tileId);
    if (missingAt != null && now - missingAt < MISSING_TTL_MS) return false;
    return true;
  });
  if (!tileIds.length) return [];

  const CHUNK = 180;
  for (let i = 0; i < tileIds.length; i += CHUNK) {
    const batchIds = tileIds.slice(i, i + CHUNK);
    const have = batchIds
      .map((tileId) => {
        const cached = olcTileCache.get(tileId);
        const forcedUpdatedAt = indexUpdatedAt.get(tileId);
        if (!cached) return null;
        if (forcedUpdatedAt && cached.updatedAt !== forcedUpdatedAt) return null;
        return { tileId, updatedAt: cached.updatedAt };
      })
      .filter(Boolean);

    const payload = {
      tileIds: batchIds,
      have,
      disciplines: csvToList(state.types),
      tiers: csvToList(state.tiers),
    };
    const res = await fetch(`${olcBase.replace(/\/+$/, '')}/tiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to load OLC tiles (${res.status})`);
    }
    const body = await res.json().catch(() => ({} as any));

    const tiles = Array.isArray(body?.tiles) ? body.tiles : [];
    tiles.forEach((tile: any) => {
      const tileId = typeof tile?.tileId === 'string' ? tile.tileId : `${String(tile?.olc4 || '').toUpperCase()}:${normalizeMonth(tile?.yyyymm)}`;
      const updatedAt = typeof tile?.updatedAt === 'string' ? tile.updatedAt : new Date().toISOString();
      const items = parseTileToMatches(tile);
      olcTileCache.set(tileId, { updatedAt, fetchedAt: Date.now(), items });
      olcMissingCache.delete(tileId);
    });

    const notModified = Array.isArray(body?.notModified) ? body.notModified : [];
    notModified.forEach((tileId: string) => {
      const cached = olcTileCache.get(tileId);
      if (cached) cached.fetchedAt = Date.now();
    });

    const missing = Array.isArray(body?.missing) ? body.missing : [];
    missing.forEach((tileId: string) => {
      olcMissingCache.set(tileId, Date.now());
    });
  }

  const statusSet = splitCsvSet(state.statuses);
  const subDisciplineSet = splitCsvSet(state.subDisciplines);
  const seasonsSet = splitCsvSet(state.seasons);
  const seriesSet = splitCsvSet(state.series);
  const fromTs = state.from ? new Date(`${state.from}T00:00:00`).getTime() : Number.NaN;
  const toTs = state.to ? new Date(`${state.to}T23:59:59`).getTime() : Number.NaN;

  const dedupe = new Map<string, MatchSummary>();
  selectedTileIds.forEach((tileId) => {
    const cached = olcTileCache.get(tileId);
    if (!cached) return;
    cached.items.forEach((match: any) => {
      const lat = Number(match?.location?.lat);
      const lng = Number(match?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const dist = distanceMi({ lat: state.lat!, lng: state.lng! }, { lat, lng });
      if (dist > (state.radius || 100)) return;

      if (!Number.isNaN(fromTs) || !Number.isNaN(toTs)) {
        const dateValue = match?.date ? new Date(`${match.date}T12:00:00`).getTime() : Number.NaN;
        if (!Number.isNaN(fromTs) && (Number.isNaN(dateValue) || dateValue < fromTs)) return;
        if (!Number.isNaN(toTs) && (Number.isNaN(dateValue) || dateValue > toTs)) return;
      }

      if (statusSet.size) {
        const status = String(match?.status || '').toLowerCase();
        if (!statusSet.has(status)) return;
      }

      if (subDisciplineSet.size) {
        const subDiscipline = Array.isArray(match?.subDiscipline) ? match.subDiscipline : [match?.subDiscipline];
        const lowered = subDiscipline.map((s: any) => String(s || '').toLowerCase()).filter(Boolean);
        if (!lowered.some((s: string) => subDisciplineSet.has(s))) return;
      }

      if (seasonsSet.size) {
        const seasons = Array.isArray(match?.seasons) ? match.seasons.map((s: any) => String(s).toLowerCase()) : [];
        if (!seasons.some((s: string) => seasonsSet.has(s))) return;
      }

      if (seriesSet.size) {
        const series = Array.isArray(match?.seriesIds) ? match.seriesIds.map((s: any) => String(s).toLowerCase()) : [];
        if ((state.seriesMode || 'or') === 'and') {
          const needed = Array.from(seriesSet.values());
          if (!needed.every((s) => series.includes(s))) return;
        } else if (!series.some((s: string) => seriesSet.has(s))) {
          return;
        }
      }

      const id = String(match?.id || '');
      if (!id) return;
      dedupe.set(id, { ...match, distanceMi: dist } as any);
    });
  });

  const items = sortMatchesByDate(Array.from(dedupe.values()));
  if (state.sort === 'dateDesc') return items.slice().reverse();
  if (state.sort === 'nameAsc') return items.slice().sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  if (state.sort === 'nameDesc') return items.slice().sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
  return items;
};

export const MatchFinder: React.FC<MatchFinderProps> = ({ restBase, options, attrs }) => {
  const finderMode: 'matches' | 'clubs' = String((options as any)?.mode || 'matches') === 'clubs' ? 'clubs' : 'matches';
  const allowedViews = useMemo<ViewMode[]>(() => {
    const fromOptions = Array.isArray(options.allowedViews) && options.allowedViews.length
      ? options.allowedViews
      : ['map', 'list', 'calendar', 'chart'];
    const fromAttrs = parseCsv(attrs?.views || attrs?.allowedViews || attrs?.allowed_views);
    if (!fromAttrs) return fromOptions as ViewMode[];
    const parsed = fromAttrs.split(',').map((v) => v.trim().toLowerCase() as ViewMode);
    return parsed.filter((view) => ['map', 'list', 'calendar', 'chart'].includes(view));
  }, [options.allowedViews, attrs]);

  const defaults = useMemo(() => mergeDefaults(options.defaults || {}, attrs), [options.defaults, attrs]);
  const defaultView = parseView(defaults.view, allowedViews.length ? allowedViews : ['map', 'list', 'calendar', 'chart'], allowedViews[0] || 'map');

  const locks = useMemo(() => ({
    view: parseBoolean(attrs?.lockView ?? attrs?.lock_view, !!options.locks.view),
    location: parseBoolean(attrs?.lockLocation ?? attrs?.lock_location, !!options.locks.location),
    radius: parseBoolean(attrs?.lockRadius ?? attrs?.lock_radius, !!options.locks.radius),
    filters: parseBoolean(attrs?.lockFilters ?? attrs?.lock_filters, !!options.locks.filters),
  }), [attrs, options.locks]);

  const radiusLimits = useMemo(() => {
    const minOverride = parseNumber(attrs?.radiusMin ?? attrs?.radius_min);
    const maxOverride = parseNumber(attrs?.radiusMax ?? attrs?.radius_max);
    return {
      min: minOverride ?? options.radiusLimits.min,
      max: maxOverride ?? options.radiusLimits.max,
    };
  }, [attrs, options.radiusLimits]);

  const showPoweredBy = parseBoolean(attrs?.poweredBy ?? attrs?.powered_by, options.showPoweredBy);
  const poweredUrl = attrs?.poweredByUrl || attrs?.powered_by_url || options.poweredByUrl;
  const controlsLayout = useMemo<'left' | 'top'>(() => {
    const raw = String(attrs?.layout || (options as any)?.controlsLayout || 'left').toLowerCase();
    return raw === 'top' ? 'top' : 'left';
  }, [attrs, options]);
  const hideDistanceFilters = !!(options as any)?.hideDistanceFilters;

  const defaultState = useMemo<FinderState>(() => ({
    view: defaultView,
    lat: defaults.lat,
    lng: defaults.lng,
    radius: clamp(defaults.radius ?? 150, radiusLimits.min, radiusLimits.max) || 150,
    from: defaults.from,
    to: defaults.to,
    types: defaults.types,
    subDisciplines: (defaults as any).subDisciplines,
    tiers: defaults.tiers,
    statuses: defaults.statuses,
    seasons: defaults.seasons,
    series: defaults.series,
    seriesMode: ((defaults as any).seriesMode === 'and' ? 'and' : 'or'),
    minEvents: Number.isFinite((defaults as any).minEvents) ? Number((defaults as any).minEvents) : undefined,
    sort: (['dateAsc', 'dateDesc', 'nameAsc', 'nameDesc'].includes(String((defaults as any).sort)) ? (defaults as any).sort : 'dateAsc'),
  }), [defaultView, defaults, radiusLimits.max, radiusLimits.min]);
  const [draftState, setDraftState] = useState<FinderState>(defaultState);
  const [appliedState, setAppliedState] = useState<FinderState>(defaultState);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    const nextDefaults: FinderState = {
      ...defaultState,
      view: locks.view ? defaultView : defaultState.view,
      lat: locks.location ? defaults.lat : defaultState.lat,
      lng: locks.location ? defaults.lng : defaultState.lng,
      radius: locks.radius ? clamp(defaults.radius ?? defaultState.radius, radiusLimits.min, radiusLimits.max) : clamp(defaultState.radius, radiusLimits.min, radiusLimits.max),
      from: locks.filters ? defaults.from : defaultState.from,
      to: locks.filters ? defaults.to : defaultState.to,
      types: locks.filters ? defaults.types : defaultState.types,
      subDisciplines: locks.filters ? (defaults as any).subDisciplines : defaultState.subDisciplines,
      tiers: locks.filters ? defaults.tiers : defaultState.tiers,
      statuses: locks.filters ? defaults.statuses : defaultState.statuses,
      seasons: locks.filters ? defaults.seasons : defaultState.seasons,
      series: locks.filters ? defaults.series : defaultState.series,
      seriesMode: locks.filters ? (((defaults as any).seriesMode === 'and') ? 'and' : 'or') : defaultState.seriesMode,
      minEvents: locks.filters ? (Number.isFinite((defaults as any).minEvents) ? Number((defaults as any).minEvents) : undefined) : defaultState.minEvents,
      sort: locks.filters
        ? (['dateAsc', 'dateDesc', 'nameAsc', 'nameDesc'].includes(String((defaults as any).sort)) ? (defaults as any).sort : 'dateAsc')
        : defaultState.sort,
    };
    setDraftState((prev) => ({
      ...prev,
      view: locks.view ? nextDefaults.view : prev.view,
      lat: locks.location ? nextDefaults.lat : prev.lat,
      lng: locks.location ? nextDefaults.lng : prev.lng,
      radius: locks.radius ? clamp(defaults.radius ?? prev.radius, radiusLimits.min, radiusLimits.max) : clamp(prev.radius, radiusLimits.min, radiusLimits.max),
      from: locks.filters ? nextDefaults.from : prev.from,
      to: locks.filters ? nextDefaults.to : prev.to,
      types: locks.filters ? nextDefaults.types : prev.types,
      subDisciplines: locks.filters ? nextDefaults.subDisciplines : prev.subDisciplines,
      tiers: locks.filters ? nextDefaults.tiers : prev.tiers,
      statuses: locks.filters ? nextDefaults.statuses : prev.statuses,
      seasons: locks.filters ? nextDefaults.seasons : prev.seasons,
      series: locks.filters ? nextDefaults.series : prev.series,
      seriesMode: locks.filters ? nextDefaults.seriesMode : prev.seriesMode,
      minEvents: locks.filters ? nextDefaults.minEvents : prev.minEvents,
      sort: locks.filters ? nextDefaults.sort : prev.sort,
    }));
    setAppliedState((prev) => ({
      ...prev,
      view: locks.view ? nextDefaults.view : prev.view,
      lat: locks.location ? nextDefaults.lat : prev.lat,
      lng: locks.location ? nextDefaults.lng : prev.lng,
      radius: locks.radius ? clamp(defaults.radius ?? prev.radius, radiusLimits.min, radiusLimits.max) : clamp(prev.radius, radiusLimits.min, radiusLimits.max),
      from: locks.filters ? nextDefaults.from : prev.from,
      to: locks.filters ? nextDefaults.to : prev.to,
      types: locks.filters ? nextDefaults.types : prev.types,
      subDisciplines: locks.filters ? nextDefaults.subDisciplines : prev.subDisciplines,
      tiers: locks.filters ? nextDefaults.tiers : prev.tiers,
      statuses: locks.filters ? nextDefaults.statuses : prev.statuses,
      seasons: locks.filters ? nextDefaults.seasons : prev.seasons,
      series: locks.filters ? nextDefaults.series : prev.series,
      seriesMode: locks.filters ? nextDefaults.seriesMode : prev.seriesMode,
      minEvents: locks.filters ? nextDefaults.minEvents : prev.minEvents,
      sort: locks.filters ? nextDefaults.sort : prev.sort,
    }));
  }, [locks, defaults, defaultState, defaultView, radiusLimits]);

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    const storageKey = `sh-finder:${finderMode}:state`;
    let fromStorage: Partial<FinderState> = {};
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') fromStorage = parsed;
      }
    } catch {}
    const fromQuery = parseStateFromQuery();
    const merged = {
      ...defaultState,
      ...fromStorage,
      ...fromQuery,
      radius: clamp(Number((fromQuery as any).radius ?? (fromStorage as any).radius ?? defaultState.radius), radiusLimits.min, radiusLimits.max),
    } as FinderState;
    setDraftState(merged);
    setAppliedState(merged);
  }, [defaultState, finderMode, radiusLimits.max, radiusLimits.min]);

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [expandedFilterGroups, setExpandedFilterGroups] = useState<Record<string, boolean>>({});
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const filterSig = useMemo(() => JSON.stringify({
    lat: draftState.lat,
    lng: draftState.lng,
    radius: draftState.radius,
    from: draftState.from,
    to: draftState.to,
    types: draftState.types,
    subDisciplines: draftState.subDisciplines,
    tiers: draftState.tiers,
    statuses: draftState.statuses,
    seasons: draftState.seasons,
    series: draftState.series,
    seriesMode: draftState.seriesMode,
    minEvents: draftState.minEvents,
  }), [draftState]);
  const appliedFilterSig = useMemo(() => JSON.stringify({
    lat: appliedState.lat,
    lng: appliedState.lng,
    radius: appliedState.radius,
    from: appliedState.from,
    to: appliedState.to,
    types: appliedState.types,
    subDisciplines: appliedState.subDisciplines,
    tiers: appliedState.tiers,
    statuses: appliedState.statuses,
    seasons: appliedState.seasons,
    series: appliedState.series,
    seriesMode: appliedState.seriesMode,
    minEvents: appliedState.minEvents,
  }), [appliedState]);
  const hasPendingChanges = filterSig !== appliedFilterSig;

  useEffect(() => {
    setAppliedState((prev) => (prev.sort === draftState.sort ? prev : { ...prev, sort: draftState.sort }));
  }, [draftState.sort]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = `sh-finder:${finderMode}:state`;
    const snapshot: FinderState = { ...appliedState, view: draftState.view };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {}
    const next = new URLSearchParams(window.location.search);
    const entries = toQueryEntries(snapshot);
    const keys = ['view', 'lat', 'lng', 'radius', 'from', 'to', 'types', 'subDisciplines', 'tiers', 'statuses', 'seasons', 'series', 'seriesMode', 'minEvents', 'sort'];
    keys.forEach((key) => next.delete(key));
    Object.entries(entries).forEach(([key, value]) => next.set(key, value));
    const q = next.toString();
    const url = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', url);
  }, [appliedState, draftState.view, finderMode]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const run = async () => {
      const olcBase = String((options as any)?.olcBase || '').trim();
      try {
        if (olcBase && appliedState.lat != null && appliedState.lng != null) {
          const items = await fetchMatchesViaOlc(olcBase, appliedState, controller.signal);
          if (!controller.signal.aborted) {
            setMatches(items);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // Fall through to /matches fallback.
        console.warn('[finder-ui] OLC fetch failed; falling back to /matches', err);
      }

      const query: MatchQuery = {
        lat: appliedState.lat,
        lng: appliedState.lng,
        radius: appliedState.radius,
        from: appliedState.from,
        to: appliedState.to,
      };
      if (appliedState.types) query.type = appliedState.types;
      if (appliedState.tiers) query.tier = appliedState.tiers;
      if (appliedState.statuses) query.status = appliedState.statuses;
      if (appliedState.seasons) query.seasons = appliedState.seasons;
      if (appliedState.series) query.series = appliedState.series;
      if (appliedState.seriesMode) query.seriesMode = appliedState.seriesMode;
      if (appliedState.sort) query.sort = appliedState.sort;
      try {
        const items = await fetchMatches(restBase, query, controller.signal);
        if (!controller.signal.aborted) {
          const sorted = sortMatchesByDate(items);
          if (appliedState.sort === 'dateDesc') {
            setMatches(sorted.slice().reverse());
          } else if (appliedState.sort === 'nameAsc') {
            setMatches(sorted.slice().sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))));
          } else if (appliedState.sort === 'nameDesc') {
            setMatches(sorted.slice().sort((a, b) => String(b.title || '').localeCompare(String(a.title || ''))));
          } else {
            setMatches(sorted);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(err?.message || 'Unable to load matches');
      }
    };

    void run();
    return () => controller.abort();
  }, [restBase, appliedState, options]);

  const setField = (key: keyof FinderState, value: any) => {
    setDraftState((prev) => ({ ...prev, [key]: value }));
  };

  const onMapCenterChange = useCallback((coords: { lat?: number; lng?: number }) => {
    setDraftState((prev) => {
      const nextLat = coords.lat;
      const nextLng = coords.lng;
      if (
        typeof nextLat === 'number' &&
        typeof nextLng === 'number' &&
        typeof prev.lat === 'number' &&
        typeof prev.lng === 'number' &&
        Math.abs(nextLat - prev.lat) < 0.00001 &&
        Math.abs(nextLng - prev.lng) < 0.00001
      ) {
        return prev;
      }
      return { ...prev, ...coords };
    });
  }, []);

  const onUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setDraftState((prev) => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  };

  const centerLabel = defaults.locationLabel || attrs?.locationLabel || attrs?.location_label || '';

  const clubResults = useMemo<ClubResultItem[]>(() => {
    const byClub = new Map<string, ClubResultItem>();
    matches.forEach((match: any) => {
      const clubIdRaw = String(match?.clubId || match?.location?.name || '').trim();
      if (!clubIdRaw) return;
      const clubName = String(match?.clubName || match?.location?.name || clubIdRaw).trim();
      const lat = Number(match?.location?.lat);
      const lng = Number(match?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const key = clubIdRaw;
      const existing = byClub.get(key) || {
        id: key,
        name: clubName,
        lat,
        lng,
        upcomingCount: 0,
        disciplines: [],
        subDisciplines: [],
        tiers: [],
        statuses: [],
        seriesIds: [],
      };

      existing.upcomingCount += 1;
      const nextDate = typeof match?.date === 'string' ? match.date : '';
      if (nextDate && (!existing.nextEventDate || nextDate < existing.nextEventDate)) {
        existing.nextEventDate = nextDate;
      }

      const addMany = (target: string[], input: any) => {
        const list = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
        list.forEach((entry) => {
          const value = String(entry || '').trim();
          if (value && !target.includes(value)) target.push(value);
        });
      };
      addMany(existing.disciplines, match?.disciplines || match?.type);
      addMany(existing.subDisciplines, match?.subDiscipline || match?.subDisciplines);
      addMany(existing.tiers, [match?.matchTier, match?.tier]);
      addMany(existing.statuses, [match?.status]);
      addMany(existing.seriesIds, match?.seriesIds || match?.series);

      byClub.set(key, existing);
    });
    return Array.from(byClub.values()).sort((a, b) => {
      if (a.nextEventDate && b.nextEventDate) return a.nextEventDate.localeCompare(b.nextEventDate);
      if (a.nextEventDate) return -1;
      if (b.nextEventDate) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [matches]);

  const availableFilters = useMemo(() => {
    const types = new Set<string>(csvToList(defaults.types));
    const subDisciplines = new Set<string>(csvToList((defaults as any).subDisciplines));
    const tiers = new Set<string>(csvToList(defaults.tiers));
    const statuses = new Set<string>(csvToList(defaults.statuses));
    const seasons = new Set<string>(csvToList(defaults.seasons));
    const series = new Set<string>(csvToList(defaults.series));

    const sourceMatches = finderMode === 'clubs' ? matches : matches;
    sourceMatches.forEach((match: any) => {
      const typeCandidates = [
        ...(Array.isArray(match?.disciplines) ? match.disciplines : []),
      ];
      typeCandidates.forEach((entry) => {
        const label = normalizeLabel(entry);
        if (label) types.add(label);
      });
      const subDisciplineCandidates = [
        ...(Array.isArray(match?.subDiscipline) ? match.subDiscipline : [match?.subDiscipline]),
        ...(Array.isArray(match?.subDisciplines) ? match.subDisciplines : [match?.subDisciplines]),
      ];
      subDisciplineCandidates.forEach((entry) => {
        const label = normalizeLabel(entry);
        if (label) subDisciplines.add(label);
      });

      const tier = normalizeLabel(match?.matchTier ?? match?.tier);
      if (tier) tiers.add(tier);
      const status = normalizeLabel(match?.status);
      if (status) statuses.add(status);

      const seasonCandidates = [
        ...(Array.isArray(match?.seasons) ? match.seasons : []),
        ...(Array.isArray(match?.seasonIds) ? match.seasonIds : []),
        match?.seasonId,
      ];
      seasonCandidates.forEach((entry) => {
        const label = normalizeLabel(entry);
        if (label) seasons.add(label);
      });

      const seriesCandidates = [
        ...(Array.isArray(match?.series) ? match.series : []),
        ...(Array.isArray(match?.seriesIds) ? match.seriesIds : []),
        match?.seriesId,
      ];
      seriesCandidates.forEach((entry) => {
        const label = normalizeLabel(entry);
        if (label) series.add(label);
      });
    });

    const sorter = (a: string, b: string) => a.localeCompare(b);
    return {
      types: Array.from(types).sort(sorter),
      subDisciplines: Array.from(subDisciplines).sort(sorter),
      tiers: Array.from(tiers).sort(sorter),
      statuses: Array.from(statuses).sort(sorter),
      seasons: Array.from(seasons).sort(sorter),
      series: Array.from(series).sort(sorter),
    };
  }, [finderMode, matches, defaults, defaults.types, defaults.tiers, defaults.statuses, defaults.seasons, defaults.series]);

  const toggleCsvFilter = useCallback((key: 'types' | 'subDisciplines' | 'tiers' | 'statuses' | 'seasons' | 'series', value: string) => {
    setDraftState((prev) => {
      const current = new Set(csvToList(prev[key]));
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [key]: listToCsv(Array.from(current)) };
    });
  }, []);

  const filteredClubs = useMemo(() => {
    const types = splitCsvSet(appliedState.types);
    const subDisciplines = splitCsvSet(appliedState.subDisciplines);
    const tiers = splitCsvSet(appliedState.tiers);
    const statuses = splitCsvSet(appliedState.statuses);
    const series = splitCsvSet(appliedState.series);
    return clubResults.filter((club: ClubResultItem) => {
      if (types.size) {
        const clubTypes = club.disciplines.map((d) => d.toLowerCase());
        if (!clubTypes.some((d) => types.has(d))) return false;
      }
      if (subDisciplines.size) {
        const clubSubs = club.subDisciplines.map((d) => d.toLowerCase());
        if (!clubSubs.some((d) => subDisciplines.has(d))) return false;
      }
      if (tiers.size) {
        const clubTiers = club.tiers.map((d) => d.toLowerCase());
        if (!clubTiers.some((d) => tiers.has(d))) return false;
      }
      if (statuses.size) {
        const clubStatuses = club.statuses.map((d) => d.toLowerCase());
        if (!clubStatuses.some((d) => statuses.has(d))) return false;
      }
      if (series.size) {
        const clubSeries = club.seriesIds.map((d) => d.toLowerCase());
        if ((appliedState.seriesMode || 'or') === 'and') {
          const needed = Array.from(series.values());
          if (!needed.every((id) => clubSeries.includes(id))) return false;
        } else if (!clubSeries.some((d) => series.has(d))) {
          return false;
        }
      }
      if (Number.isFinite(appliedState.minEvents) && (appliedState.minEvents as number) > 0 && club.upcomingCount < (appliedState.minEvents as number)) {
        return false;
      }
      return true;
    });
  }, [clubResults, appliedState.types, appliedState.subDisciplines, appliedState.tiers, appliedState.statuses, appliedState.series, appliedState.seriesMode, appliedState.minEvents]);

  const listMatchesForView = finderMode === 'clubs'
    ? filteredClubs.map((club) => ({
        id: club.id,
        title: club.name,
        date: club.nextEventDate,
        matchTier: club.tiers[0],
        status: club.statuses[0],
        disciplines: club.disciplines,
        subDiscipline: club.subDisciplines,
        seriesIds: club.seriesIds,
        distanceMi: Number.isFinite(appliedState.lat) && Number.isFinite(appliedState.lng)
          ? distanceMi({ lat: appliedState.lat as number, lng: appliedState.lng as number }, { lat: club.lat, lng: club.lng })
          : undefined,
        location: { lat: club.lat, lng: club.lng, name: club.name },
        clubName: club.name,
        clubId: club.id,
        upcomingCount: club.upcomingCount,
      } as any))
    : matches;
  const mapMatchesForView = finderMode === 'clubs' ? (listMatchesForView as MatchSummary[]) : matches;

  return (
    <div className={`sh-match-finder sh-view-${draftState.view}`}>
      <header className="sh-header">
        <div className="sh-header-left">
          <h2>Shooters Hub Match Finder</h2>
          {centerLabel && <p className="sh-subtle">{centerLabel}</p>}
          {appliedState.lat != null && appliedState.lng != null && (
            <p className="sh-subtle">
              Center at {appliedState.lat.toFixed(4)}, {appliedState.lng.toFixed(4)} · Radius {appliedState.radius} mi
            </p>
          )}
        </div>
        <div className="sh-header-right" />
      </header>

      <div className={`sh-layout sh-layout-${controlsLayout}`}>
        <section className="sh-controls">
          <div className="sh-view-toggle sh-view-toggle-inside" role="group" aria-label="View mode">
            {(allowedViews.length ? allowedViews : ['map', 'list', 'calendar', 'chart']).map((view) => (
              <button
                key={view}
                type="button"
                className={view === draftState.view ? 'active' : ''}
                onClick={() => !locks.view && setField('view', view)}
                disabled={locks.view}
              >
                {view === 'map' ? 'Map' : view === 'list' ? 'List' : view === 'calendar' ? 'Calendar' : 'Chart'}
              </button>
            ))}
          </div>
          <div className="sh-controls-head">
            <h3>Filters</h3>
            <div className="sh-controls-head-actions">
              <button
                type="button"
                className="sh-button secondary"
                onClick={() => {
                  setDraftState(defaultState);
                  setAppliedState(defaultState);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="sh-button"
                onClick={() => setAppliedState((prev) => ({ ...draftState, view: prev.view }))}
                disabled={!hasPendingChanges || loading}
                aria-disabled={!hasPendingChanges || loading}
              >
                {loading ? 'Updating…' : (hasPendingChanges ? 'Update' : 'Updated')}
              </button>
            </div>
          </div>
          {!hideDistanceFilters ? (
            <div className="sh-field-group">
              <label>
                Latitude
                <input
                  type="number"
                  step="0.0001"
                  value={draftState.lat ?? ''}
                  onChange={(e) => setField('lat', e.target.value === '' ? undefined : Number(e.target.value))}
                  disabled={locks.location}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.0001"
                  value={draftState.lng ?? ''}
                  onChange={(e) => setField('lng', e.target.value === '' ? undefined : Number(e.target.value))}
                  disabled={locks.location}
                />
              </label>
              <label>
                Radius (mi)
                <input
                  type="number"
                  min={radiusLimits.min ?? 0}
                  max={radiusLimits.max ?? 1000}
                  value={draftState.radius}
                  onChange={(e) => setField('radius', clamp(Number(e.target.value) || defaults.radius || 150, radiusLimits.min, radiusLimits.max))}
                  disabled={locks.radius}
                />
              </label>
              {!locks.location && (
                <button type="button" className="sh-button secondary" onClick={onUseMyLocation}>
                  Use my location
                </button>
              )}
            </div>
          ) : null}

          <div className="sh-field-group">
            <label>
              Date from
              <input
                type="date"
                value={draftState.from || ''}
                onChange={(e) => setField('from', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
            <label>
              Date to
              <input
                type="date"
                value={draftState.to || ''}
                onChange={(e) => setField('to', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
          </div>

          <details className="sh-advanced" open={!locks.filters && Boolean(draftState.types || draftState.subDisciplines || draftState.tiers || draftState.statuses || draftState.seasons || draftState.series)}>
            <summary>Advanced filters</summary>
            <div className="sh-field-group">
              <label>
                Series mode
                <select
                  value={draftState.seriesMode || 'or'}
                  onChange={(e) => setField('seriesMode', e.target.value === 'and' ? 'and' : 'or')}
                  disabled={locks.filters}
                >
                  <option value="or">Any selected series</option>
                  <option value="and">All selected series</option>
                </select>
              </label>
              {finderMode === 'clubs' ? (
                <label>
                  Min events
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draftState.minEvents ?? ''}
                    onChange={(e) => setField('minEvents', e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                    disabled={locks.filters}
                  />
                </label>
              ) : null}
            </div>
            <div className="sh-filter-groups">
              {([
                ['types', 'Disciplines', availableFilters.types, draftState.types],
                ['subDisciplines', 'Sub-disciplines', availableFilters.subDisciplines, draftState.subDisciplines],
                ['tiers', 'Match Tiers', availableFilters.tiers, draftState.tiers],
                ['statuses', 'Statuses', availableFilters.statuses, draftState.statuses],
                ['seasons', 'Seasons', availableFilters.seasons, draftState.seasons],
                ['series', 'Series', availableFilters.series, draftState.series],
              ] as const).map(([key, label, optionsList, currentCsv]) => {
                const selected = new Set(csvToList(currentCsv));
                const previewCount = 10;
                const expanded = !!expandedFilterGroups[key];
                const visible = expanded ? optionsList : optionsList.slice(0, previewCount);
                const hasOverflow = optionsList.length > previewCount;
                return (
                  <fieldset key={key} className="sh-filter-group" disabled={locks.filters}>
                    <legend>{label}</legend>
                    {optionsList.length ? (
                      <div className="sh-filter-options">
                        {visible.map((option) => (
                          <label key={option} className={`sh-chip ${selected.has(option) ? 'active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selected.has(option)}
                              onChange={() => toggleCsvFilter(key, option)}
                              disabled={locks.filters}
                            />
                            <span>
                              {key === 'types'
                                ? humanizeDiscipline(option)
                                : key === 'subDisciplines'
                                ? humanizeSubDiscipline(option)
                                : key === 'series'
                                ? prettySeriesLabel(option)
                                : option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="sh-subtle">Options appear as matches load.</p>
                    )}
                    {hasOverflow ? (
                      <button
                        type="button"
                        className="sh-filter-more"
                        onClick={() =>
                          setExpandedFilterGroups((prev) => ({
                            ...prev,
                            [key]: !expanded,
                          }))
                        }
                      >
                        {expanded ? 'Show fewer' : `Show ${optionsList.length - previewCount} more`}
                      </button>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
          </details>
        </section>

        <section className="sh-results">
          {draftState.view === 'list' ? (
            <div className="sh-results-toolbar">
              <label>
                Sort
                <select
                  value={draftState.sort || 'dateAsc'}
                  onChange={(e) => setField('sort', e.target.value as FinderState['sort'])}
                  disabled={locks.filters}
                >
                  <option value="dateAsc">Date (Earliest)</option>
                  <option value="dateDesc">Date (Latest)</option>
                  <option value="nameAsc">Name (A-Z)</option>
                  <option value="nameDesc">Name (Z-A)</option>
                </select>
              </label>
            </div>
          ) : null}
          {hasPendingChanges && !loading && (
            <p className="sh-status">Filters changed. Click Update to refresh results.</p>
          )}
          {loading && <p className="sh-status">Loading matches…</p>}
          {error && <p className="sh-status error">{error}</p>}
          {!loading && !error && !matches.length && <p className="sh-status">No matches found for the current filters.</p>}

          {!loading && !error && matches.length > 0 && (
            <div className="sh-results-body">
              {draftState.view === 'map' && (
                <MapView
                  matches={mapMatchesForView}
                  center={{ lat: appliedState.lat, lng: appliedState.lng }}
                  radius={appliedState.radius}
                  mode={finderMode}
                  entityLinkMode={(options as any)?.entityLinkMode || 'external'}
                  entityPathBases={(options as any)?.entityPathBases || {}}
                  publicAppBase={String((options as any)?.poweredByUrl || '').trim()}
                  locked={locks.location}
                  onCenterChange={onMapCenterChange}
                />
              )}
              {draftState.view === 'list' && (
                <ListView
                  matches={listMatchesForView as any}
                  mode={finderMode}
                  entityLinkMode={(options as any)?.entityLinkMode || 'external'}
                  entityPathBases={(options as any)?.entityPathBases || {}}
                  publicAppBase={String((options as any)?.poweredByUrl || '').trim()}
                />
              )}
              {draftState.view === 'calendar' && (
                <CalendarView
                  matches={matches}
                  monthCursor={monthCursor}
                  selectedDateISO={selectedDateISO}
                  onPrevMonth={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  onNextMonth={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  onSelectDate={setSelectedDateISO}
                  entityLinkMode={(options as any)?.entityLinkMode || 'external'}
                  entityPathBases={(options as any)?.entityPathBases || {}}
                  publicAppBase={String((options as any)?.poweredByUrl || '').trim()}
                />
              )}
              {draftState.view === 'chart' && (
                <ChartView
                  matches={listMatchesForView as any}
                  mode={finderMode}
                  entityLinkMode={(options as any)?.entityLinkMode || 'external'}
                  entityPathBases={(options as any)?.entityPathBases || {}}
                  publicAppBase={String((options as any)?.poweredByUrl || '').trim()}
                />
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="sh-footer">
        <PoweredBy visible={showPoweredBy} url={poweredUrl} />
      </footer>
    </div>
  );
};

interface MapViewProps {
  matches: MatchSummary[];
  center: { lat?: number; lng?: number };
  radius: number;
  mode: 'matches' | 'clubs';
  entityLinkMode: 'external' | 'local';
  entityPathBases: Record<string, string>;
  publicAppBase?: string;
  locked: boolean;
  onCenterChange: (coords: { lat?: number; lng?: number }) => void;
}

const MapView: React.FC<MapViewProps> = ({ matches, center, radius, mode, entityLinkMode, entityPathBases, publicAppBase, locked, onCenterChange }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<any>(null);
  const isProgrammaticMoveRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true });
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    });
    tileLayer.addTo(map);
    instanceRef.current = map;
    const makeCluster = (L as any).markerClusterGroup;
    markersRef.current = typeof makeCluster === 'function'
      ? makeCluster({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 60,
        }).addTo(map)
      : L.layerGroup().addTo(map);

    if (!locked) {
      map.on('moveend', () => {
        if (isProgrammaticMoveRef.current) {
          isProgrammaticMoveRef.current = false;
          return;
        }
        const c = map.getCenter();
        onCenterChange({ lat: c.lat, lng: c.lng });
      });
    }
  }, [locked, onCenterChange]);

  useEffect(() => {
    const map = instanceRef.current;
    if (!map) return;
    if (center.lat != null && center.lng != null) {
      const current = map.getCenter();
      const moved = Math.abs(current.lat - center.lat) > 0.00001 || Math.abs(current.lng - center.lng) > 0.00001;
      if (moved) {
        isProgrammaticMoveRef.current = true;
        map.setView([center.lat, center.lng], map.getZoom() || 6);
      }
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = instanceRef.current;
    if (!map || center.lat != null || center.lng != null || !matches.length) return;
    const withCoords = matches.filter((m) => typeof m.location?.lat === 'number' && typeof m.location?.lng === 'number');
    if (withCoords.length) {
      const bounds = L.latLngBounds(withCoords.map((m) => [m.location!.lat!, m.location!.lng!] as [number, number]));
      isProgrammaticMoveRef.current = true;
      map.fitBounds(bounds.pad(0.2));
    }
  }, [matches, center.lat, center.lng]);

  useEffect(() => {
    const layer = markersRef.current;
    const map = instanceRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    matches.forEach((match) => {
      if (typeof match.location?.lat !== 'number' || typeof match.location?.lng !== 'number') return;
      const marker = L.marker([match.location.lat, match.location.lng]);
      const title = resolveMatchTitle(match as any);
      const line2 = mode === 'clubs'
        ? `Upcoming matches: ${Math.max(0, Number((match as any).upcomingCount || 0) || 0)}`
        : (match.date ? formatDate(match.date) : '');
      const html = `
        <div class="sh-popup">
          <strong>${title}</strong><br />
          ${line2}<br />
          ${(match as any)?.clubName || match.location?.name || ''}
          <div style="margin-top:6px">
            <a class="sh-popup-link" href="${resolveEntityHref(mode, String((match as any)?.id || ''), entityLinkMode, entityPathBases, publicAppBase)}">View Page</a>
          </div>
        </div>
      `;
      marker.bindPopup(html);
      marker.addTo(layer);
    });
    if (center.lat != null && center.lng != null) {
      const circle = L.circle([center.lat, center.lng], { radius: radius * 1609.34, color: '#0ea5e9', weight: 1, fillOpacity: 0.05 });
      circle.addTo(layer);
    }
  }, [matches, center.lat, center.lng, radius, mode, entityLinkMode, entityPathBases, publicAppBase]);

  return <div className="sh-map" ref={mapRef} role="region" aria-label="Match locations" />;
};

const resolveEntityHref = (
  mode: 'matches' | 'clubs',
  id: string,
  entityLinkMode: 'external' | 'local',
  entityPathBases: Record<string, string>,
  publicAppBase?: string
): string => {
  if (!id) return '#';
  const entityType = mode === 'clubs' ? 'club' : 'match';
  if (entityLinkMode === 'local') {
    const localBase = String(entityPathBases?.[entityType] || '').trim().replace(/\/+$/, '');
    if (localBase) return `${localBase}/${encodeURIComponent(id)}`;
  }
  const externalBase = String(publicAppBase || 'https://shootershub.fortneyengineering.com').trim().replace(/\/+$/, '');
  return `${externalBase}/${mode === 'clubs' ? 'clubs' : 'matches'}/${encodeURIComponent(id)}`;
};

const ListView: React.FC<{
  matches: MatchSummary[];
  mode: 'matches' | 'clubs';
  entityLinkMode: 'external' | 'local';
  entityPathBases: Record<string, string>;
  publicAppBase?: string;
}> = ({ matches, mode, entityLinkMode, entityPathBases, publicAppBase }) => (
  <ul className="sh-list">
    {matches.map((match) => (
      <li key={match.id} className="sh-list-item">
        <EntityListCard
          title={resolveMatchTitle(match)}
          href={resolveEntityHref(mode, match.id, entityLinkMode, entityPathBases, publicAppBase)}
          ownerName={(match as any).clubName || (match as any).location?.name || ''}
          date={match.date}
          tier={(match as any).matchTier || (match as any).tier}
          status={(match as any).status}
          startTime={(match as any).startTime || (match as any).firstTime}
          disciplines={(Array.isArray((match as any).disciplines) ? (match as any).disciplines : [])
            .map((d: string) => humanizeDiscipline(String(d)))}
          subDisciplines={(Array.isArray((match as any).subDiscipline) ? (match as any).subDiscipline : [])
            .map((d: string) => humanizeSubDiscipline(String(d)))}
          series={(Array.isArray((match as any).seriesIds) ? (match as any).seriesIds : [])
            .map((s: string) => prettySeriesLabel(String(s)))}
          scoringLabel={match.distanceMi != null ? formatDistance(match.distanceMi) : undefined}
          directionsHref={
            typeof (match as any)?.location?.lat === 'number' && typeof (match as any)?.location?.lng === 'number'
              ? `https://www.google.com/maps/dir/?api=1&destination=${(match as any).location.lat},${(match as any).location.lng}`
              : null
          }
          extraBadges={[formatAddress(match.location)].filter(Boolean)}
        />
      </li>
    ))}
  </ul>
);

const ChartView: React.FC<{
  matches: MatchSummary[];
  mode: 'matches' | 'clubs';
  entityLinkMode: 'external' | 'local';
  entityPathBases: Record<string, string>;
  publicAppBase?: string;
}> = ({ matches, mode, entityLinkMode, entityPathBases, publicAppBase }) => {
  const months = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m: any) => {
      if (typeof m?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date)) set.add(m.date.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [matches]);

  const rows = useMemo(() => {
    const byRow = new Map<string, { key: string; label: string; itemsByMonth: Record<string, MatchSummary[]> }>();
    matches.forEach((match: any) => {
      const date = typeof match?.date === 'string' ? match.date : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const month = date.slice(0, 7);
      const label = mode === 'clubs'
        ? String(match?.title || match?.clubName || match?.location?.name || 'Club')
        : String(match?.clubName || match?.location?.name || 'Unknown Club');
      const key = label.toLowerCase();
      const row = byRow.get(key) || { key, label, itemsByMonth: {} };
      if (!row.itemsByMonth[month]) row.itemsByMonth[month] = [];
      row.itemsByMonth[month].push(match);
      byRow.set(key, row);
    });
    return Array.from(byRow.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [matches, mode]);

  return (
    <div className="sh-chart">
      <table className="sh-table sh-chart-table">
        <thead>
          <tr>
            <th>{mode === 'clubs' ? 'Club' : 'Host Club'}</th>
            {months.map((month) => <th key={month}>{month}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              {months.map((month) => {
                const items = row.itemsByMonth[month] || [];
                return (
                  <td key={`${row.key}:${month}`} className="sh-chart-cell">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        href={resolveEntityHref(mode, String(item.id), entityLinkMode, entityPathBases, publicAppBase)}
                        className="sh-chart-day-badge"
                        title={resolveMatchTitle(item)}
                      >
                        {(item.date || '').slice(8, 10)}
                      </a>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CalendarView: React.FC<{
  matches: MatchSummary[];
  monthCursor: Date;
  selectedDateISO: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (iso: string | null) => void;
  entityLinkMode: 'external' | 'local';
  entityPathBases: Record<string, string>;
  publicAppBase?: string;
}> = ({ matches, monthCursor, selectedDateISO, onPrevMonth, onNextMonth, onSelectDate, entityLinkMode, entityPathBases, publicAppBase }) => {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const matchesByDate = useMemo(() => {
    const map = new Map<string, MatchSummary[]>();
    matches.forEach((m) => {
      const iso = typeof m?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : null;
      if (!iso) return;
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso)!.push(m);
    });
    return map;
  }, [matches]);
  const selectedItems = selectedDateISO ? (matchesByDate.get(selectedDateISO) || []) : [];

  return (
    <div className="sh-calendar-grid-wrap">
      <div className="sh-calendar-toolbar">
        <button type="button" className="sh-button secondary" onClick={onPrevMonth}>Prev</button>
        <strong>{monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="sh-button secondary" onClick={onNextMonth}>Next</button>
      </div>
      <div className="sh-calendar-grid">
        {weekdays.map((day) => (
          <div key={day} className="sh-calendar-weekday">{day}</div>
        ))}
        {days.map((day) => {
          const dayMatches = matchesByDate.get(day.iso) || [];
          return (
            <button
              type="button"
              key={day.iso}
              className={`sh-calendar-cell ${day.isOutsideMonth ? 'outside' : ''} ${selectedDateISO === day.iso ? 'active' : ''}`}
              onClick={() => onSelectDate(day.iso)}
            >
              <span className="sh-calendar-date">{day.date.getDate()}</span>
              <span className="sh-calendar-count">{dayMatches.length ? `${dayMatches.length} events` : ''}</span>
            </button>
          );
        })}
      </div>
      {selectedDateISO ? (
        <div className="sh-calendar-selected">
          <div className="sh-calendar-selected-head">
            <h4>{formatDate(selectedDateISO)}</h4>
            <button type="button" className="sh-button secondary" onClick={() => onSelectDate(null)}>Clear</button>
          </div>
          <ul className="sh-list">
            {selectedItems.map((match) => (
              <li key={match.id} className="sh-list-item">
                <EntityListCard
                  title={resolveMatchTitle(match)}
                  href={resolveEntityHref('matches', String(match.id), entityLinkMode, entityPathBases, publicAppBase)}
                  ownerName={(match as any).clubName || (match as any).location?.name || ''}
                  date={match.date}
                  tier={(match as any).matchTier || (match as any).tier}
                  status={(match as any).status}
                  disciplines={(Array.isArray((match as any).disciplines) ? (match as any).disciplines : []).map((d: string) => humanizeDiscipline(String(d)))}
                  subDisciplines={(Array.isArray((match as any).subDiscipline) ? (match as any).subDiscipline : []).map((d: string) => humanizeSubDiscipline(String(d)))}
                  series={(Array.isArray((match as any).seriesIds) ? (match as any).seriesIds : []).map((s: string) => prettySeriesLabel(String(s)))}
                  directionsHref={
                    typeof (match as any)?.location?.lat === 'number' && typeof (match as any)?.location?.lng === 'number'
                      ? `https://www.google.com/maps/dir/?api=1&destination=${(match as any).location.lat},${(match as any).location.lng}`
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
