import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchMatches, mergeDefaults, type MatchQuery } from './api';
import type { MatchSummary, PluginOptions, ViewMode } from './types';
import { clamp, formatAddress, formatDate, formatDistance, groupByMonth, sortMatchesByDate } from './utils';
import { PoweredBy } from './powered-by';

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
  tiers?: string;
  statuses?: string;
  seasons?: string;
  series?: string;
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

const useDebounced = <T,>(value: T, delay = 250): T => {
  const [state, setState] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setState(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return state;
};

export const MatchFinder: React.FC<MatchFinderProps> = ({ restBase, options, attrs }) => {
  const allowedViews = useMemo<ViewMode[]>(() => {
    const fromOptions = Array.isArray(options.allowedViews) && options.allowedViews.length
      ? options.allowedViews
      : ['map', 'list', 'calendar'];
    const fromAttrs = parseCsv(attrs?.views || attrs?.allowedViews || attrs?.allowed_views);
    if (!fromAttrs) return fromOptions as ViewMode[];
    const parsed = fromAttrs.split(',').map((v) => v.trim().toLowerCase() as ViewMode);
    return parsed.filter((view) => ['map', 'list', 'calendar'].includes(view));
  }, [options.allowedViews, attrs]);

  const defaults = useMemo(() => mergeDefaults(options.defaults || {}, attrs), [options.defaults, attrs]);
  const defaultView = parseView(defaults.view, allowedViews.length ? allowedViews : ['map', 'list', 'calendar'], allowedViews[0] || 'map');

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

  const [state, setState] = useState<FinderState>(() => ({
    view: defaultView,
    lat: defaults.lat,
    lng: defaults.lng,
    radius: clamp(defaults.radius ?? 150, radiusLimits.min, radiusLimits.max) || 150,
    from: defaults.from,
    to: defaults.to,
    types: defaults.types,
    tiers: defaults.tiers,
    statuses: defaults.statuses,
    seasons: defaults.seasons,
    series: defaults.series,
  }));

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      view: locks.view ? defaultView : prev.view,
      lat: locks.location ? defaults.lat : prev.lat,
      lng: locks.location ? defaults.lng : prev.lng,
      radius: locks.radius ? clamp(defaults.radius ?? prev.radius, radiusLimits.min, radiusLimits.max) : clamp(prev.radius, radiusLimits.min, radiusLimits.max),
      from: locks.filters ? defaults.from : prev.from,
      to: locks.filters ? defaults.to : prev.to,
      types: locks.filters ? defaults.types : prev.types,
      tiers: locks.filters ? defaults.tiers : prev.tiers,
      statuses: locks.filters ? defaults.statuses : prev.statuses,
      seasons: locks.filters ? defaults.seasons : prev.seasons,
      series: locks.filters ? defaults.series : prev.series,
    }));
  }, [locks, defaults, defaultView, radiusLimits]);

  const debouncedState = useDebounced(state, 300);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const query: MatchQuery = {
      lat: debouncedState.lat,
      lng: debouncedState.lng,
      radius: debouncedState.radius,
      from: debouncedState.from,
      to: debouncedState.to,
    };
    if (debouncedState.types) query.type = debouncedState.types;
    if (debouncedState.tiers) query.tier = debouncedState.tiers;
    if (debouncedState.statuses) query.status = debouncedState.statuses;
    if (debouncedState.seasons) query.seasons = debouncedState.seasons;
    if (debouncedState.series) query.series = debouncedState.series;
    fetchMatches(restBase, query, controller.signal)
      .then((items) => {
        setMatches(sortMatchesByDate(items));
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(err?.message || 'Unable to load matches');
      });
    return () => controller.abort();
  }, [restBase, debouncedState]);

  const setField = (key: keyof FinderState, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const onUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setState((prev) => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  };

  const centerLabel = defaults.locationLabel || attrs?.locationLabel || attrs?.location_label || '';

  return (
    <div className={`sh-match-finder sh-view-${state.view}`}>
      <header className="sh-header">
        <div className="sh-header-left">
          <h2>Shooters Hub Match Finder</h2>
          {centerLabel && <p className="sh-subtle">{centerLabel}</p>}
          {state.lat != null && state.lng != null && (
            <p className="sh-subtle">
              Center at {state.lat.toFixed(4)}, {state.lng.toFixed(4)} · Radius {state.radius} mi
            </p>
          )}
        </div>
        <div className="sh-header-right">
          <div className="sh-view-toggle" role="group" aria-label="View mode">
            {(allowedViews.length ? allowedViews : ['map', 'list', 'calendar']).map((view) => (
              <button
                key={view}
                type="button"
                className={view === state.view ? 'active' : ''}
                onClick={() => !locks.view && setField('view', view)}
                disabled={locks.view}
              >
                {view === 'map' ? 'Map' : view === 'list' ? 'List' : 'Calendar'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="sh-controls">
        <div className="sh-field-group">
          <label>
            Latitude
            <input
              type="number"
              step="0.0001"
              value={state.lat ?? ''}
              onChange={(e) => setField('lat', e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={locks.location}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="0.0001"
              value={state.lng ?? ''}
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
              value={state.radius}
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

        <div className="sh-field-group">
          <label>
            Date from
            <input
              type="date"
              value={state.from || ''}
              onChange={(e) => setField('from', e.target.value || undefined)}
              disabled={locks.filters}
            />
          </label>
          <label>
            Date to
            <input
              type="date"
              value={state.to || ''}
              onChange={(e) => setField('to', e.target.value || undefined)}
              disabled={locks.filters}
            />
          </label>
        </div>

        <details className="sh-advanced" open={!locks.filters && Boolean(state.types || state.tiers || state.statuses || state.seasons || state.series)}>
          <summary>Advanced filters</summary>
          <div className="sh-field-group">
            <label>
              Match types (CSV)
              <input
                type="text"
                value={state.types || ''}
                onChange={(e) => setField('types', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
            <label>
              Match tiers (CSV)
              <input
                type="text"
                value={state.tiers || ''}
                onChange={(e) => setField('tiers', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
            <label>
              Statuses (CSV)
              <input
                type="text"
                value={state.statuses || ''}
                onChange={(e) => setField('statuses', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
            <label>
              Seasons (CSV)
              <input
                type="text"
                value={state.seasons || ''}
                onChange={(e) => setField('seasons', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
            <label>
              Series (CSV)
              <input
                type="text"
                value={state.series || ''}
                onChange={(e) => setField('series', e.target.value || undefined)}
                disabled={locks.filters}
              />
            </label>
          </div>
        </details>
      </section>

      <section className="sh-results">
        {loading && <p className="sh-status">Loading matches…</p>}
        {error && <p className="sh-status error">{error}</p>}
        {!loading && !error && !matches.length && <p className="sh-status">No matches found for the current filters.</p>}

        {!loading && !error && matches.length > 0 && (
          <div className="sh-results-body">
            {state.view === 'map' && (
              <MapView
                matches={matches}
                center={{ lat: state.lat, lng: state.lng }}
                radius={state.radius}
                locked={locks.location}
                onCenterChange={(coords) => setState((prev) => ({ ...prev, ...coords }))}
              />
            )}
            {state.view === 'list' && <ListView matches={matches} />}
            {state.view === 'calendar' && <CalendarView matches={matches} />}
          </div>
        )}
      </section>

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
  locked: boolean;
  onCenterChange: (coords: { lat?: number; lng?: number }) => void;
}

const MapView: React.FC<MapViewProps> = ({ matches, center, radius, locked, onCenterChange }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true });
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    });
    tileLayer.addTo(map);
    instanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    if (!locked) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onCenterChange({ lat: c.lat, lng: c.lng });
      });
    }
  }, [locked, onCenterChange]);

  useEffect(() => {
    const map = instanceRef.current;
    if (!map) return;
    if (center.lat != null && center.lng != null) {
      map.setView([center.lat, center.lng], 6);
    } else if (matches.length) {
      const withCoords = matches.filter((m) => typeof m.location?.lat === 'number' && typeof m.location?.lng === 'number');
      if (withCoords.length) {
        const bounds = L.latLngBounds(withCoords.map((m) => [m.location!.lat!, m.location!.lng!] as [number, number]));
        map.fitBounds(bounds.pad(0.2));
      }
    }
  }, [center.lat, center.lng, matches]);

  useEffect(() => {
    const layer = markersRef.current;
    const map = instanceRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    matches.forEach((match) => {
      if (typeof match.location?.lat !== 'number' || typeof match.location?.lng !== 'number') return;
      const marker = L.marker([match.location.lat, match.location.lng]);
      const html = `
        <div class="sh-popup">
          <strong>${match.title || 'Match'}</strong><br />
          ${match.date ? formatDate(match.date) : ''}<br />
          ${match.location?.name || ''}
        </div>
      `;
      marker.bindPopup(html);
      marker.addTo(layer);
    });
    if (center.lat != null && center.lng != null) {
      const circle = L.circle([center.lat, center.lng], { radius: radius * 1609.34, color: '#0ea5e9', weight: 1, fillOpacity: 0.05 });
      circle.addTo(layer);
    }
  }, [matches, center.lat, center.lng, radius]);

  return <div className="sh-map" ref={mapRef} role="region" aria-label="Match locations" />;
};

const ListView: React.FC<{ matches: MatchSummary[] }> = ({ matches }) => (
  <ul className="sh-list">
    {matches.map((match) => (
      <li key={match.id} className="sh-list-item">
        <div>
          <h3>{match.title || 'Match'}</h3>
          <p className="sh-subtle">{formatDate(match.date)}{match.distanceMi != null ? ` · ${formatDistance(match.distanceMi)}` : ''}</p>
          <p className="sh-subtle">{formatAddress(match.location)}</p>
        </div>
        <div className="sh-actions">
          <a href={`https://shooters-hub.com/matches/${match.id}`} target="_blank" rel="noopener noreferrer">
            View →
          </a>
        </div>
      </li>
    ))}
  </ul>
);

const CalendarView: React.FC<{ matches: MatchSummary[] }> = ({ matches }) => {
  const grouped = useMemo(() => groupByMonth(matches), [matches]);
  const keys = Object.keys(grouped).sort();
  return (
    <div className="sh-calendar">
      {keys.map((key) => {
        const [year, month] = key.split('-');
        const title = key === 'Other'
          ? 'Other'
          : new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        return (
          <section key={key} className="sh-calendar-month">
            <h3>{title}</h3>
            <ul>
              {grouped[key].map((match) => (
                <li key={match.id}>
                  <span>{formatDate(match.date)}</span>
                  <span>{match.title || 'Match'}</span>
                  <span>{formatAddress(match.location)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
