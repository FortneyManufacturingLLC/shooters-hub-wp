import React, { useEffect, useMemo, useState } from 'react';
import { fetchClub, fetchMatch, fetchSeason, fetchSeries } from './api';
import type { EntityEmbedConfig, MatchSummary, ClubSummary, SeasonSummary, SeriesSummary } from './types';
import { formatAddress, formatDate, normalizeLeaderboard, takeTop } from './utils';
import { PoweredBy } from './powered-by';

interface Props {
  config: EntityEmbedConfig;
}

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

const fallbackDescription = (type: string, title: string): string => {
  if (type === 'match') return `${title} is published from Shooters Hub data and rendered through your local WordPress template.`;
  if (type === 'club') return `${title} is synced from Shooters Hub with address, contact, and upcoming activity.`;
  if (type === 'series') return `${title} is a Shooters Hub series page rendered with your site styling and layout controls.`;
  return `${title} leaderboard is rendered from Shooters Hub scoring data.`;
};

export const EntityPage: React.FC<Props> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [series, setSeries] = useState<SeriesSummary | null>(null);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const entityId = String(config.entityId || '').trim();

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setMatch(null);
    setClub(null);
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
    return (
      <article className="sh-entity-page sh-card">
        {match.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${match.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body">
          <header className="sh-entity-header">
            <p className="sh-entity-kicker">Match</p>
            <h2 className="sh-card-title">{title}</h2>
            <p className="sh-card-meta">
              {formatDate(match.date || match.start)}
              {match.matchTier ? ` · ${match.matchTier}` : ''}
              {match.status ? ` · ${match.status}` : ''}
            </p>
          </header>
          <p className="sh-card-location">{formatAddress(match.location)}</p>
          <p className="sh-card-description">{match.description || fallbackDescription('match', title)}</p>
          <p className="sh-card-actions">
            <a className="sh-button" href={toEntityHref(config, 'match', match.id)}>View Full Match</a>
          </p>
          <PoweredBy visible url={config.finder?.publicAppBase} />
        </div>
      </article>
    );
  }

  if (config.entityType === 'club') {
    if (!club) return <p className="sh-card sh-card-empty">Club not found.</p>;
    const title = club.name || 'Club';
    return (
      <article className="sh-entity-page sh-card">
        {club.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${club.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body">
          <header className="sh-entity-header">
            <p className="sh-entity-kicker">Club</p>
            <h2 className="sh-card-title">{title}</h2>
          </header>
          <p className="sh-card-location">{formatAddress(club.location)}</p>
          <p className="sh-card-description">{club.description || fallbackDescription('club', title)}</p>
          <div className="sh-entity-meta-grid">
            {club.website ? <p><strong>Website:</strong> <a href={club.website} target="_blank" rel="noreferrer">{club.website}</a></p> : null}
            {club.contactEmail ? <p><strong>Email:</strong> <a href={`mailto:${club.contactEmail}`}>{club.contactEmail}</a></p> : null}
            {club.phone ? <p><strong>Phone:</strong> {club.phone}</p> : null}
          </div>
          <p className="sh-card-actions">
            <a className="sh-button" href={toEntityHref(config, 'club', club.id)}>View Club</a>
          </p>
          <PoweredBy visible url={config.finder?.publicAppBase} />
        </div>
      </article>
    );
  }

  if (config.entityType === 'series') {
    if (!series) return <p className="sh-card sh-card-empty">Series not found.</p>;
    const title = series.title || series.name || series.shortName || series.abbreviation || 'Series';
    return (
      <article className="sh-entity-page sh-card">
        <div className="sh-card-body">
          <header className="sh-entity-header">
            <p className="sh-entity-kicker">Series</p>
            <h2 className="sh-card-title">{title}</h2>
          </header>
          <p className="sh-card-description">{series.description || fallbackDescription('series', title)}</p>
          <div className="sh-entity-meta-grid">
            {series.shortName ? <p><strong>Short Name:</strong> {series.shortName}</p> : null}
            {series.abbreviation ? <p><strong>Abbreviation:</strong> {series.abbreviation}</p> : null}
            {series.website ? <p><strong>Website:</strong> <a href={series.website} target="_blank" rel="noreferrer">{series.website}</a></p> : null}
          </div>
          <p className="sh-card-actions">
            <a className="sh-button" href={toEntityHref(config, 'series', series.id)}>View Series</a>
          </p>
          <PoweredBy visible url={config.finder?.publicAppBase} />
        </div>
      </article>
    );
  }

  if (!season) return <p className="sh-card sh-card-empty">Leaderboard not found.</p>;
  const title = season.leaderboard?.title || season.name || 'Leaderboard';
  return (
    <article className="sh-entity-page sh-card sh-card-leaderboard">
      <div className="sh-card-body">
        <header className="sh-entity-header">
          <p className="sh-entity-kicker">Leaderboard</p>
          <h2 className="sh-card-title">{title}</h2>
        </header>
        {season.leaderboard?.updatedAt ? <p className="sh-card-meta">Updated {formatDate(season.leaderboard.updatedAt)}</p> : null}
        <p className="sh-card-description">{fallbackDescription('leaderboard', title)}</p>
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
        <p className="sh-card-actions">
          <a className="sh-button" href={toEntityHref(config, 'leaderboard', season.id)}>View Full Leaderboard</a>
        </p>
        <PoweredBy visible url={config.finder?.publicAppBase} />
      </div>
    </article>
  );
};

export default EntityPage;
