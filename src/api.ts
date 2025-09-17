import type {
  MatchSummary,
  ClubSummary,
  SeasonSummary,
  ViewMode,
  PluginDefaults,
} from './types';

export type MatchQuery = {
  view?: ViewMode;
  lat?: number;
  lng?: number;
  radius?: number;
  from?: string;
  to?: string;
  type?: string;
  tier?: string;
  status?: string;
  seasons?: string;
  series?: string;
  seasonsMode?: string;
  seriesMode?: string;
  zip?: string;
  sort?: string;
};

const toParams = (query: MatchQuery): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  return params;
};

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  const data = await res.json().catch(() => {
    throw new Error('Invalid server response');
  });
  return data as T;
}

export async function fetchMatches(restBase: string, query: MatchQuery, signal?: AbortSignal): Promise<MatchSummary[]> {
  const params = toParams(query);
  params.set('path', '/matches');
  const url = `${restBase}?${params.toString()}`;
  const body = await fetchJSON<{ items?: MatchSummary[] }>(url, { signal });
  if (Array.isArray(body?.items)) return body.items;
  return Array.isArray((body as any)) ? (body as any) : [];
}

export async function fetchMatch(restBase: string, id: string, signal?: AbortSignal): Promise<MatchSummary | null> {
  if (!id) return null;
  const params = new URLSearchParams({ path: `/matches/${encodeURIComponent(id)}` });
  const url = `${restBase}?${params.toString()}`;
  const data = await fetchJSON<MatchSummary>(url, { signal });
  return data ?? null;
}

export async function fetchClub(restBase: string, id: string, signal?: AbortSignal): Promise<ClubSummary | null> {
  if (!id) return null;
  const params = new URLSearchParams({ path: `/clubs/${encodeURIComponent(id)}` });
  const url = `${restBase}?${params.toString()}`;
  const data = await fetchJSON<ClubSummary>(url, { signal });
  return data ?? null;
}

export async function fetchSeason(restBase: string, id: string, signal?: AbortSignal): Promise<SeasonSummary | null> {
  if (!id) return null;
  const params = new URLSearchParams({ path: `/seasons/${encodeURIComponent(id)}` });
  const url = `${restBase}?${params.toString()}`;
  const data = await fetchJSON<SeasonSummary>(url, { signal });
  return data ?? null;
}

export function mergeDefaults(defaults: PluginDefaults, attrs?: Record<string, any>): PluginDefaults {
  const merged: PluginDefaults = { ...defaults };
  if (!attrs) return merged;
  const maybe = (key: keyof PluginDefaults) => {
    const value = attrs[key];
    if (value === undefined || value === null || value === '') return;
    if (key === 'lat' || key === 'lng' || key === 'radius') {
      const num = Number(value);
      if (Number.isFinite(num)) (merged as any)[key] = num;
      return;
    }
    (merged as any)[key] = value;
  };
  (Object.keys(merged) as (keyof PluginDefaults)[]).forEach(maybe);
  (['view', 'from', 'to', 'types', 'tiers', 'statuses', 'seasons', 'series', 'locationLabel'] as (keyof PluginDefaults)[]).forEach((key) => maybe(key));
  return merged;
}
