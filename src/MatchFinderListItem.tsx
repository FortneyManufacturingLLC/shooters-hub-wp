import React from 'react';

export interface MatchFinderListItemProps {
  title?: string;
  matchHref?: string;
  ownerName?: string;
  date?: string;
  tier?: string;
  status?: string;
  startTime?: string;
  disciplines?: string[] | string;
  subDisciplines?: string[] | string;
  series?: string[] | string;
  scoringLabel?: string;
  directionsHref?: string | null;
  extraBadges?: string[];
}

function formatLongDate(iso?: string): string {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function toList(value?: string[] | string): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((entry) => String(entry).split(','))
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );
  }
  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );
  }
  return [];
}

function formatTop(values: string[], max = 3): string {
  if (!values.length) return '';
  if (values.length <= max) return values.join(', ');
  const shown = values.slice(0, max).join(', ');
  return `${shown} +${values.length - max}`;
}

function formatStartTime(value?: string): string {
  if (!value || typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';

  const twentyFourHour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1]);
    const minutes = twentyFourHour[2];
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${minutes}${suffix}`;
  }

  const twelveHour = raw.match(/^(\d{1,2}):([0-5]\d)\s*([aApP][mM])$/);
  if (twelveHour) return `${Number(twelveHour[1])}:${twelveHour[2]}${twelveHour[3].toUpperCase()}`;
  return raw;
}

export const MatchFinderListItem: React.FC<MatchFinderListItemProps> = ({
  title,
  matchHref,
  ownerName,
  date,
  tier,
  status,
  startTime,
  disciplines,
  subDisciplines,
  series,
  scoringLabel,
  directionsHref,
  extraBadges = [],
}) => {
  const dateLabel = formatLongDate(date);
  const disciplineList = toList(disciplines);
  const subDisciplineList = toList(subDisciplines);
  const seriesList = toList(series);
  const formattedStartTime = formatStartTime(startTime);
  const badges = [
    formattedStartTime ? `Starts ${formattedStartTime}` : '',
    disciplineList.length ? `Discipline: ${formatTop(disciplineList)}` : '',
    subDisciplineList.length ? `Sub: ${formatTop(subDisciplineList)}` : '',
    seriesList.length ? `Series: ${formatTop(seriesList)}` : '',
    ...extraBadges,
  ].filter((badge) => typeof badge === 'string' && badge.trim());

  return (
    <div className="finder-entity-card">
      <div className="finder-entity-card__header">
        <div className="finder-entity-card__owner-wrap">
          {ownerName ? <span className="finder-entity-card__owner">{ownerName}</span> : null}
          {ownerName ? <span className="finder-entity-card__dot" aria-hidden="true" /> : null}
        </div>
        {directionsHref ? (
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="finder-entity-card__directions"
          >
            Find Directions
          </a>
        ) : null}
      </div>

      <div>
        {matchHref ? (
          <a href={matchHref} className="finder-entity-card__title">
            {title || 'Match'}
          </a>
        ) : (
          <span className="finder-entity-card__title">{title || 'Match'}</span>
        )}
      </div>

      <div className="finder-entity-card__meta">
        {dateLabel}
        {tier ? <span className="finder-entity-card__badge">{tier}</span> : null}
        {status ? <span className="finder-entity-card__badge finder-entity-card__badge--accent">{status}</span> : null}
        {scoringLabel ? <span className="finder-entity-card__badge">{scoringLabel}</span> : null}
        {badges.map((badge, idx) => (
          <span key={`${badge}-${idx}`} className="finder-entity-card__badge">
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MatchFinderListItem;
