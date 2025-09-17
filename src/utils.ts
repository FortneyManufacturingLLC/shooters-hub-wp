import type { MatchLocation, MatchSummary, SeasonLeaderboardEntry } from './types';

export const clamp = (value: number, min?: number, max?: number): number => {
  let next = value;
  if (Number.isFinite(min!)) next = Math.max(next, min!);
  if (Number.isFinite(max!)) next = Math.min(next, max!);
  return next;
};

export const formatDate = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatAddress = (location?: MatchLocation): string => {
  if (!location) return '';
  if (location.fullAddress) return location.fullAddress;
  const parts = [
    location.address?.line1,
    location.address?.city,
    location.address?.region,
    location.address?.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
};

export const formatDistance = (value?: number): string => {
  if (value == null) return '';
  if (!Number.isFinite(value)) return '';
  return `${value.toFixed(value >= 100 ? 0 : 1)} mi`;
};

export const takeTop = <T>(entries: T[] = [], limit?: number): T[] => {
  if (!limit || limit <= 0) return entries.slice();
  return entries.slice(0, limit);
};

export const normalizeLeaderboard = (entries: SeasonLeaderboardEntry[] = []): SeasonLeaderboardEntry[] => {
  return entries
    .filter((entry) => entry && (entry.name || entry.team))
    .map((entry, index) => ({
      rank: entry.rank ?? index + 1,
      name: entry.name ?? entry.team ?? 'Shooter',
      division: entry.division ?? '',
      class: entry.class ?? '',
      score: entry.score ?? 0,
      team: entry.team,
    }));
};

export const sortMatchesByDate = (matches: MatchSummary[]): MatchSummary[] => {
  return matches.slice().sort((a, b) => {
    const aDate = a.date || '';
    const bDate = b.date || '';
    return aDate.localeCompare(bDate);
  });
};

export const groupByMonth = (matches: MatchSummary[]): Record<string, MatchSummary[]> => {
  return matches.reduce<Record<string, MatchSummary[]>>((acc, match) => {
    const date = match.date ? new Date(match.date) : undefined;
    const key = date && !Number.isNaN(date.getTime())
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});
};
