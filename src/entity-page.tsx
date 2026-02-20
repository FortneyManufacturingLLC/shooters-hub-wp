import React, { useEffect, useMemo, useState } from 'react';
import { fetchClub, fetchMatch, fetchSeason, fetchSeries } from './api';
import type { EntityEmbedConfig, MatchSummary, ClubSummary, SeasonSummary, SeriesSummary } from './types';
import { formatAddress, formatDate, normalizeLeaderboard, takeTop } from './utils';
import { PoweredBy } from './powered-by';

interface Props {
  config: EntityEmbedConfig;
}

const hasEntityDescription = (value: any): value is string => {
  if (typeof value !== 'string') return false;
  const plain = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 0;
};

const hasLocationBlock = (source: any): boolean => {
  if (!source || typeof source !== 'object') return false;
  const loc = source.location || {};
  const addr = loc?.address || {};
  return Boolean(
    loc.name ||
    loc.fullAddress ||
    addr.line1 ||
    addr.line2 ||
    addr.city ||
    addr.region ||
    addr.postalCode ||
    (loc.lat != null && loc.lng != null)
  );
};

const buildMatchDefaultDescription = (match: any, club?: any): string => {
  const hasClub = Boolean(club?.name || match?.clubName || match?.clubId);
  const hasSeries = Array.isArray(match?.seriesIds) && match.seriesIds.length > 0;
  const hasSeason = Array.isArray(match?.seasonIds) && match.seasonIds.length > 0;
  const pieces: string[] = [];
  pieces.push(`${match?.title || 'This match'} is an organized shooting event hosted on Shooters Hub.`);
  if (match?.date) pieces.push(`It is currently scheduled for ${formatDate(match.date)}.`);
  if (hasClub) pieces.push(`Host club: ${club?.name || match?.clubName || 'Club'}.`);
  if (hasSeries || hasSeason) pieces.push('This event contributes to active series and/or season standings.');
  if (hasLocationBlock(match) || hasLocationBlock(club)) pieces.push('See venue and directions below for travel details.');
  pieces.push('Event details may evolve as squads, stages, and logistics are finalized by organizers.');
  return pieces.join(' ');
};

const buildClubDefaultDescription = (club: any): string => {
  const seasonCount = Array.isArray(club?.seasonIds) ? club.seasonIds.length : 0;
  const pieces: string[] = [];
  pieces.push(`${club?.name || 'This club'} is part of the Shooters Hub network and hosts competitive shooting events.`);
  if (hasLocationBlock(club)) pieces.push('Location and contact details are listed below.');
  if (seasonCount > 0) pieces.push(`This club currently supports ${seasonCount} active season${seasonCount === 1 ? '' : 's'}.`);
  pieces.push('Check upcoming matches for current registration details and local range guidance.');
  return pieces.join(' ');
};

const buildSeriesDefaultDescription = (series: any): string => {
  const seasonCount = Array.isArray(series?.seasonIds) ? series.seasonIds.length : 0;
  const clubCount = Array.isArray(series?.clubIds) ? series.clubIds.length : 0;
  const pieces: string[] = [];
  pieces.push(`${series?.name || series?.title || 'This series'} is a multi-event competition series hosted on Shooters Hub.`);
  if (seasonCount > 0 || clubCount > 0) {
    const scope = [
      seasonCount > 0 ? `${seasonCount} season${seasonCount === 1 ? '' : 's'}` : '',
      clubCount > 0 ? `${clubCount} participating club${clubCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' and ');
    if (scope) pieces.push(`Current scope includes ${scope}.`);
  }
  pieces.push('Follow this page for updates, match postings, and leaderboard progress.');
  return pieces.join(' ');
};

const resolveEntityDescription = (kind: 'match' | 'club' | 'series', source: any, relatedClub?: any): string => {
  if (hasEntityDescription(source?.description)) return String(source.description);
  if (kind === 'match') return buildMatchDefaultDescription(source, relatedClub);
  if (kind === 'club') return buildClubDefaultDescription(source);
  return buildSeriesDefaultDescription(source);
};

const toEntityHref = (config: EntityEmbedConfig, entityType: 'match' | 'club' | 'series' | 'leaderboard', id?: string): string => {
  if (!id) return '#';
  const mode = config.finder?.entityLinkMode || 'external';
  if (mode === 'local') {
    const base = config.finder?.entityPathBases?.[entityType];
    if (base) return `${String(base).replace(/\/+$/, '')}/${encodeURIComponent(id)}`;
  }
  const externalBase = String(config.finder?.publicAppBase || 'https://shootershub.fortneyengineering.com').replace(/\/+$/, '');
  if (entityType === 'match') return `${externalBase}/matches/${encodeURIComponent(id)}`;
  if (entityType === 'club') return `${externalBase}/clubs/${encodeURIComponent(id)}`;
  if (entityType === 'series') return `${externalBase}/series/${encodeURIComponent(id)}`;
  return `${externalBase}/seasons/${encodeURIComponent(id)}`;
};

const EmptyState: React.FC<{ entityType: string }> = ({ entityType }) => (
  <p className="sh-card sh-card-empty">No {entityType} ID was provided for this template route.</p>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <section className="sh-card">
    <div className="sh-card-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <h3 className="sh-card-title" style={{ fontSize: '1.05rem' }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  </section>
);

const LocationSection: React.FC<{ location?: any }> = ({ location }) => {
  if (!location) return null;
  const address = formatAddress(location);
  const hasCoords = Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  return (
    <SectionCard
      title="Location"
      right={
        hasCoords ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.lat},${location.lng}`)}`}
            target="_blank"
            rel="noreferrer"
            className="sh-button secondary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
          >
            Directions
          </a>
        ) : null
      }
    >
      {location?.name ? <p className="sh-card-meta"><strong>{location.name}</strong></p> : null}
      {address ? <p className="sh-card-location">{address}</p> : <p className="sh-card-meta">No location details published.</p>}
    </SectionCard>
  );
};

const MapSection: React.FC<{ location?: any }> = ({ location }) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const bbox = `${lng - 0.05}%2C${lat - 0.03}%2C${lng + 0.05}%2C${lat + 0.03}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <SectionCard title="Map">
      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--sh-border)' }}>
        <iframe title="Entity map" src={src} style={{ width: '100%', height: '290px', border: 0 }} loading="lazy" />
      </div>
    </SectionCard>
  );
};

const ScheduleSection: React.FC<{ schedule?: any }> = ({ schedule }) => {
  const days = Array.isArray(schedule?.days) ? schedule.days : [];
  if (!days.length) return null;
  return (
    <SectionCard title="Schedule">
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {days.map((day: any, idx: number) => {
          const slots = Array.isArray(day?.slots) ? day.slots : [];
          const rawDate = typeof day?.date === 'string' ? day.date : '';
          const dateLabel = rawDate ? formatDate(rawDate) : '';
          return (
            <div key={idx} style={{ border: '1px solid var(--sh-border)', borderRadius: '8px', padding: '0.6rem' }}>
              <p className="sh-card-meta"><strong>{day?.label || 'Day'}</strong>{dateLabel ? ` · ${dateLabel}` : ''}</p>
              {slots.length ? (
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {slots.map((slot: any, i: number) => (
                    <li key={i} className="sh-card-meta">{slot?.time || ''} {slot?.name || ''}</li>
                  ))}
                </ul>
              ) : <p className="sh-card-meta">No slot details listed.</p>}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

const MatchLinksSection: React.FC<{ match: any }> = ({ match }) => {
  const links: Array<{ label: string; href?: string }> = [];
  const registration = match?.registration?.externalLink || match?.externalRegLink;
  if (registration) links.push({ label: 'Register', href: registration });
  if (match?.documents?.cofUrl) links.push({ label: 'Course of Fire', href: match.documents.cofUrl });
  if (match?.matchLink) links.push({ label: 'More Info', href: match.matchLink });
  if (!links.length) return null;
  return (
    <SectionCard title="Links">
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {links.map((link) => (
          <a key={link.label} href={String(link.href)} target="_blank" rel="noreferrer" className="sh-card-meta" style={{ color: 'var(--sh-accent)', textDecoration: 'none', fontWeight: 600 }}>
            {link.label} →
          </a>
        ))}
      </div>
    </SectionCard>
  );
};

export const EntityPage: React.FC<Props> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [clubForMatch, setClubForMatch] = useState<ClubSummary | null>(null);
  const [series, setSeries] = useState<SeriesSummary | null>(null);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const entityId = String(config.entityId || '').trim();

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setMatch(null);
    setClub(null);
    setClubForMatch(null);
    setSeries(null);
    setSeason(null);
    setError('');

    if (!entityId) return () => controller.abort();

    setLoading(true);
    const run = async () => {
      try {
        if (config.entityType === 'match') {
          const data = await fetchMatch(config.apiBase, entityId, controller.signal);
          if (!mounted) return;
          setMatch(data);
          const clubId = String((data as any)?.clubId || '').trim();
          if (clubId) {
            try {
              const c = await fetchClub(config.apiBase, clubId, controller.signal);
              if (mounted) setClubForMatch(c);
            } catch {
              if (mounted) setClubForMatch(null);
            }
          }
        } else if (config.entityType === 'club') {
          const data = await fetchClub(config.apiBase, entityId, controller.signal);
          if (!mounted) return;
          setClub(data);
        } else if (config.entityType === 'series') {
          const data = await fetchSeries(config.apiBase, entityId, controller.signal);
          if (!mounted) return;
          setSeries(data);
        } else {
          const data = await fetchSeason(config.apiBase, entityId, controller.signal);
          if (!mounted) return;
          setSeason(data);
        }
      } catch (err: any) {
        if (!mounted || controller.signal.aborted) return;
        setError(err?.message || 'Unable to load entity');
      } finally {
        if (mounted && !controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [config.apiBase, config.entityType, entityId]);

  const leaderboard = useMemo(() => normalizeLeaderboard(season?.leaderboard?.entries || []), [season?.leaderboard?.entries]);

  if (!entityId) return <EmptyState entityType={config.entityType} />;
  if (loading) return <p className="sh-card sh-card-loading">Loading {config.entityType}…</p>;
  if (error) return <p className="sh-card sh-card-error">{error}</p>;

  if (config.entityType === 'match') {
    if (!match) return <p className="sh-card sh-card-empty">Match not found.</p>;
    const title = match.title || match.name || 'Match';
    const description = resolveEntityDescription('match', match, clubForMatch || undefined);
    return (
      <article className="sh-entity-page">
        {match.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${match.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body sh-entity-layout">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SectionCard title="About Match">
              <header className="sh-entity-header">
                <p className="sh-entity-kicker">Match</p>
                <h2 className="sh-card-title">{title}</h2>
                <p className="sh-card-meta">
                  {formatDate(match.date || match.start)}
                  {(match as any).matchTier ? ` · ${(match as any).matchTier}` : ''}
                  {(match as any).status ? ` · ${(match as any).status}` : ''}
                </p>
              </header>
              <p className="sh-card-description">{description}</p>
              <p className="sh-card-actions">
                <a className="sh-button" href={toEntityHref(config, 'match', match.id)}>View Full Match</a>
              </p>
            </SectionCard>
            <ScheduleSection schedule={(match as any)?.schedule} />
            <MatchLinksSection match={match} />
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {clubForMatch ? (
              <SectionCard title="Host Club">
                <p className="sh-card-meta"><strong>{clubForMatch.name || (match as any).clubName || 'Club'}</strong></p>
                <p className="sh-card-actions">
                  <a className="sh-button secondary" href={toEntityHref(config, 'club', clubForMatch.id)}>Open Club</a>
                </p>
              </SectionCard>
            ) : null}
            <LocationSection location={(match as any).location || (clubForMatch as any)?.location} />
            <MapSection location={(match as any).location || (clubForMatch as any)?.location} />
            <SectionCard title="Ownership">
              <p className="sh-card-meta">Manage this match page through Shooters Hub ownership and permissions.</p>
            </SectionCard>
            <PoweredBy visible url={config.finder?.publicAppBase} />
          </div>
        </div>
      </article>
    );
  }

  if (config.entityType === 'club') {
    if (!club) return <p className="sh-card sh-card-empty">Club not found.</p>;
    const title = club.name || 'Club';
    const description = resolveEntityDescription('club', club);
    return (
      <article className="sh-entity-page">
        {club.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${club.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body sh-entity-layout">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SectionCard title="About Club">
              <header className="sh-entity-header">
                <p className="sh-entity-kicker">Club</p>
                <h2 className="sh-card-title">{title}</h2>
              </header>
              <p className="sh-card-description">{description}</p>
              <p className="sh-card-actions">
                <a className="sh-button" href={toEntityHref(config, 'club', club.id)}>View Club</a>
              </p>
            </SectionCard>
            <SectionCard title="Contact">
              <div className="sh-entity-meta-grid">
                <p><strong>Website:</strong> {club.website ? <a href={club.website} target="_blank" rel="noreferrer">{club.website}</a> : '—'}</p>
                <p><strong>Email:</strong> {club.contactEmail ? <a href={`mailto:${club.contactEmail}`}>{club.contactEmail}</a> : '—'}</p>
                <p><strong>Phone:</strong> {club.phone || '—'}</p>
              </div>
            </SectionCard>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <LocationSection location={club.location} />
            <MapSection location={club.location} />
            <PoweredBy visible url={config.finder?.publicAppBase} />
          </div>
        </div>
      </article>
    );
  }

  if (config.entityType === 'series') {
    if (!series) return <p className="sh-card sh-card-empty">Series not found.</p>;
    const title = series.title || series.name || series.shortName || series.abbreviation || 'Series';
    const description = resolveEntityDescription('series', series);
    return (
      <article className="sh-entity-page">
        <div className="sh-card-body sh-entity-layout">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SectionCard title="About Series">
              <header className="sh-entity-header">
                <p className="sh-entity-kicker">Series</p>
                <h2 className="sh-card-title">{title}</h2>
              </header>
              <p className="sh-card-description">{description}</p>
            </SectionCard>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SectionCard title="Series Metadata">
              <div className="sh-entity-meta-grid">
                <p><strong>Short Name:</strong> {series.shortName || '—'}</p>
                <p><strong>Abbreviation:</strong> {series.abbreviation || '—'}</p>
                <p><strong>Website:</strong> {series.website ? <a href={series.website} target="_blank" rel="noreferrer">{series.website}</a> : '—'}</p>
              </div>
              <p className="sh-card-actions">
                <a className="sh-button" href={toEntityHref(config, 'series', series.id)}>View Series</a>
              </p>
            </SectionCard>
            <PoweredBy visible url={config.finder?.publicAppBase} />
          </div>
        </div>
      </article>
    );
  }

  if (!season) return <p className="sh-card sh-card-empty">Leaderboard not found.</p>;
  const title = season.leaderboard?.title || season.name || 'Leaderboard';
  return (
    <article className="sh-entity-page">
      <div className="sh-card-body sh-entity-layout">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <SectionCard title="Leaderboard">
            <header className="sh-entity-header">
              <p className="sh-entity-kicker">Leaderboard</p>
              <h2 className="sh-card-title">{title}</h2>
              {season.leaderboard?.updatedAt ? <p className="sh-card-meta">Updated {formatDate(season.leaderboard.updatedAt)}</p> : null}
            </header>
            {leaderboard.length ? (
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Shooter</th>
                    <th>Division</th>
                    <th>Class</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {takeTop(leaderboard, 100).map((entry) => (
                    <tr key={`${entry.rank}-${entry.name}`}>
                      <td>{entry.rank}</td>
                      <td>{entry.name}</td>
                      <td>{entry.division || '—'}</td>
                      <td>{entry.class || '—'}</td>
                      <td>{entry.score != null ? entry.score : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="sh-card-empty">Leaderboard data is not published yet.</p>
            )}
          </SectionCard>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <SectionCard title="Leaderboard Info">
            <p className="sh-card-meta">Entries: {leaderboard.length}</p>
            <p className="sh-card-meta">Updated: {season.leaderboard?.updatedAt ? formatDate(season.leaderboard.updatedAt) : '—'}</p>
            <p className="sh-card-actions">
              <a className="sh-button" href={toEntityHref(config, 'leaderboard', season.id)}>View Full Leaderboard</a>
            </p>
          </SectionCard>
          <PoweredBy visible url={config.finder?.publicAppBase} />
        </div>
      </div>
    </article>
  );
};

export default EntityPage;
