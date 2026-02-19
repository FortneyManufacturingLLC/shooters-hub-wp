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
    return (
      <article className="sh-card">
        {match.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${match.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body">
          <h2 className="sh-card-title">{match.title || match.name || 'Match'}</h2>
          <p className="sh-card-meta">
            {formatDate(match.date || match.start)}
            {match.matchTier ? ` · ${match.matchTier}` : ''}
            {match.status ? ` · ${match.status}` : ''}
          </p>
          <p className="sh-card-location">{formatAddress(match.location)}</p>
          {match.description ? <p className="sh-card-description">{match.description}</p> : null}
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
    return (
      <article className="sh-card">
        {club.imageUrl ? <div className="sh-card-image" style={{ backgroundImage: `url(${club.imageUrl})` }} aria-hidden /> : null}
        <div className="sh-card-body">
          <h2 className="sh-card-title">{club.name || 'Club'}</h2>
          <p className="sh-card-location">{formatAddress(club.location)}</p>
          {club.description ? <p className="sh-card-description">{club.description}</p> : null}
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
    return (
      <article className="sh-card">
        <div className="sh-card-body">
          <h2 className="sh-card-title">{series.title || series.name || series.shortName || series.abbreviation || 'Series'}</h2>
          {series.description ? <p className="sh-card-description">{series.description}</p> : null}
          <p className="sh-card-actions">
            <a className="sh-button" href={toEntityHref(config, 'series', series.id)}>View Series</a>
          </p>
          <PoweredBy visible url={config.finder?.publicAppBase} />
        </div>
      </article>
    );
  }

  if (!season) return <p className="sh-card sh-card-empty">Leaderboard not found.</p>;
  return (
    <article className="sh-card sh-card-leaderboard">
      <div className="sh-card-body">
        <h2 className="sh-card-title">{season.leaderboard?.title || season.name || 'Leaderboard'}</h2>
        {season.leaderboard?.updatedAt ? <p className="sh-card-meta">Updated {formatDate(season.leaderboard.updatedAt)}</p> : null}
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
