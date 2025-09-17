import React, { useEffect, useMemo, useState } from 'react';
import { fetchMatch, fetchClub, fetchSeason } from './api';
import type { MatchSummary, ClubSummary, SeasonSummary } from './types';
import { formatAddress, formatDate, normalizeLeaderboard, takeTop } from './utils';
import { PoweredBy } from './powered-by';

interface PoweredProps {
  visible: boolean;
  url?: string;
}

interface BaseCardProps {
  restBase: string;
  attrs?: Record<string, any>;
  powered: PoweredProps;
}

const attrBoolean = (value: any, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

// --------------------------- Match Card -----------------------------------
export const MatchCard: React.FC<BaseCardProps> = ({ restBase, attrs, powered }) => {
  const matchId = attrs?.matchId || attrs?.id || attrs?.match_id || '';
  const showImage = attrBoolean(attrs?.showImage ?? attrs?.show_image, true);
  const showDescription = attrBoolean(attrs?.showDescription ?? attrs?.show_description, false);
  const showButton = attrBoolean(attrs?.showButton ?? attrs?.show_button, true);
  const poweredVisible = attrBoolean(attrs?.poweredBy ?? attrs?.powered_by, powered.visible);

  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!matchId) return;
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    fetchMatch(restBase, matchId, controller.signal)
      .then((data) => {
        setMatch(data);
        setStatus('idle');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus('error');
        setError(err?.message || 'Unable to load match');
      });
    return () => controller.abort();
  }, [restBase, matchId]);

  if (!matchId) {
    return <p className="sh-card sh-card-empty">Select a match ID to display details.</p>;
  }

  if (status === 'loading') {
    return <p className="sh-card sh-card-loading">Loading match…</p>;
  }

  if (status === 'error') {
    return <p className="sh-card sh-card-error">{error || 'Unable to load match data.'}</p>;
  }

  if (!match) {
    return <p className="sh-card sh-card-empty">Match not found.</p>;
  }

  return (
    <div className="sh-card">
      {showImage && match.imageUrl && (
        <div className="sh-card-image" style={{ backgroundImage: `url(${match.imageUrl})` }} aria-hidden />
      )}
      <div className="sh-card-body">
        <h3 className="sh-card-title">{match.title || 'Match'}</h3>
        <p className="sh-card-meta">
          {formatDate(match.date)}
          {match.matchTier ? ` · ${match.matchTier}` : ''}
          {match.status ? ` · ${match.status}` : ''}
        </p>
        <p className="sh-card-location">{formatAddress(match.location)}</p>
        {showDescription && match.description && (
          <p className="sh-card-description">{match.description}</p>
        )}
        {showButton && match.id && (
          <p className="sh-card-actions">
            <a className="sh-button" href={`https://shooters-hub.com/matches/${match.id}`} target="_blank" rel="noopener noreferrer">
              View match →
            </a>
          </p>
        )}
        <PoweredBy visible={poweredVisible} url={powered.url} />
      </div>
    </div>
  );
};

// --------------------------- Club Card ------------------------------------
export const ClubCard: React.FC<BaseCardProps> = ({ restBase, attrs, powered }) => {
  const clubId = attrs?.clubId || attrs?.id || attrs?.club_id || '';
  const showDescription = attrBoolean(attrs?.showDescription ?? attrs?.show_description, true);
  const showContact = attrBoolean(attrs?.showContact ?? attrs?.show_contact, true);
  const poweredVisible = attrBoolean(attrs?.poweredBy ?? attrs?.powered_by, powered.visible);

  const [club, setClub] = useState<ClubSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!clubId) return;
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    fetchClub(restBase, clubId, controller.signal)
      .then((data) => {
        setClub(data);
        setStatus('idle');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus('error');
        setError(err?.message || 'Unable to load club');
      });
    return () => controller.abort();
  }, [restBase, clubId]);

  if (!clubId) {
    return <p className="sh-card sh-card-empty">Select a club ID to display details.</p>;
  }
  if (status === 'loading') return <p className="sh-card sh-card-loading">Loading club…</p>;
  if (status === 'error') return <p className="sh-card sh-card-error">{error || 'Unable to load club data.'}</p>;
  if (!club) return <p className="sh-card sh-card-empty">Club not found.</p>;

  return (
    <div className="sh-card">
      {club.imageUrl && (
        <div className="sh-card-image" style={{ backgroundImage: `url(${club.imageUrl})` }} aria-hidden />
      )}
      <div className="sh-card-body">
        <h3 className="sh-card-title">{club.name || 'Club'}</h3>
        <p className="sh-card-location">{formatAddress(club.location)}</p>
        {showDescription && club.description && (
          <p className="sh-card-description">{club.description}</p>
        )}
        {showContact && (
          <div className="sh-card-contact">
            {club.website && (
              <p><a href={club.website} target="_blank" rel="noopener noreferrer">Website</a></p>
            )}
            {club.contactEmail && (
              <p><a href={`mailto:${club.contactEmail}`}>{club.contactEmail}</a></p>
            )}
            {club.phone && <p>{club.phone}</p>}
          </div>
        )}
        <PoweredBy visible={poweredVisible} url={powered.url} />
      </div>
    </div>
  );
};

// --------------------------- Leaderboard Card -----------------------------
export const LeaderboardCard: React.FC<BaseCardProps> = ({ restBase, attrs, powered }) => {
  const seasonId = attrs?.seasonId || attrs?.season || '';
  const limit = attrs?.limit ? Number(attrs.limit) : undefined;
  const titleOverride = attrs?.title;
  const poweredVisible = attrBoolean(attrs?.poweredBy ?? attrs?.powered_by, powered.visible);

  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!seasonId) return;
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    fetchSeason(restBase, seasonId, controller.signal)
      .then((data) => {
        setSeason(data);
        setStatus('idle');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus('error');
        setError(err?.message || 'Unable to load leaderboard');
      });
    return () => controller.abort();
  }, [restBase, seasonId]);

  if (!seasonId) {
    return <p className="sh-card sh-card-empty">Select a season ID to display leaderboard data.</p>;
  }
  if (status === 'loading') return <p className="sh-card sh-card-loading">Loading leaderboard…</p>;
  if (status === 'error') return <p className="sh-card sh-card-error">{error || 'Unable to load leaderboard data.'}</p>;
  if (!season) return <p className="sh-card sh-card-empty">Leaderboard not available.</p>;

  const leaderboardEntries = useMemo(() => {
    const entries = normalizeLeaderboard(season.leaderboard?.entries || []);
    return takeTop(entries, limit);
  }, [season, limit]);

  if (!leaderboardEntries.length) {
    return <p className="sh-card sh-card-empty">Leaderboard data is not published yet.</p>;
  }

  const heading = titleOverride || season.leaderboard?.title || season.name || 'Leaderboard';
  const updatedAt = season.leaderboard?.updatedAt;

  return (
    <div className="sh-card sh-card-leaderboard">
      <div className="sh-card-body">
        <h3 className="sh-card-title">{heading}</h3>
        {updatedAt && <p className="sh-card-meta">Updated {formatDate(updatedAt)}</p>}
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
            {leaderboardEntries.map((entry) => (
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
        <PoweredBy visible={poweredVisible} url={powered.url} />
      </div>
    </div>
  );
};
