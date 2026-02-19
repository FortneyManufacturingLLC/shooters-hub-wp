export type FinderMode = 'matches' | 'clubs';
export type FinderView = 'map' | 'list' | 'calendar' | 'chart';

export interface FinderFilters {
  types?: string[];
  subDisciplines?: string[];
  tiers?: string[];
  statuses?: string[];
  series?: string[];
  seriesMode?: 'or' | 'and';
  from?: string;
  to?: string;
  radius?: number;
  zip?: string;
  lat?: number;
  lng?: number;
  sort?: 'dateAsc' | 'dateDesc' | 'nameAsc' | 'nameDesc';
  minEvents?: number;
}

export interface FinderConfig {
  allowedViews?: FinderView[];
  defaultView?: FinderView;
  defaultCenter?: { lat?: number | null; lng?: number | null };
  defaultRadius?: number | null;
  hideDistanceFilters?: boolean;
  controlsLayout?: 'left' | 'top';
  lockedClubId?: string;
  publicAppBase?: string;
  entityLinkMode?: 'external' | 'local';
  entityPathBases?: Record<string, string>;
  initialFilters?: FinderFilters;
}

export interface FinderEmbedConfig {
  type: 'finder';
  mode: FinderMode;
  apiBase: string;
  olcBase: string;
  finder: FinderConfig;
  theme?: {
    tokens?: Record<string, string>;
  };
  poweredByLockedOn?: boolean;
}

export interface EntityEmbedConfig {
  type: 'entity-page';
  entityType: 'match' | 'club' | 'series' | 'leaderboard';
  entityId?: string;
  apiBase: string;
  olcBase: string;
  finder?: FinderConfig;
  theme?: {
    tokens?: Record<string, string>;
  };
  poweredByLockedOn?: boolean;
}

export type EmbedConfig = FinderEmbedConfig | EntityEmbedConfig;

export type ViewMode = FinderView;

export interface PluginDefaults {
  view?: ViewMode;
  lat?: number;
  lng?: number;
  radius?: number;
  from?: string;
  to?: string;
  types?: string;
  subDisciplines?: string;
  tiers?: string;
  statuses?: string;
  seasons?: string;
  series?: string;
  seriesMode?: 'or' | 'and';
  sort?: 'dateAsc' | 'dateDesc' | 'nameAsc' | 'nameDesc';
  minEvents?: number;
  locationLabel?: string;
}

export interface PluginOptions {
  mode?: FinderMode;
  allowedViews: ViewMode[];
  defaults: PluginDefaults;
  locks: {
    view?: boolean;
    location?: boolean;
    radius?: boolean;
    filters?: boolean;
  };
  radiusLimits: {
    min?: number;
    max?: number;
  };
  showPoweredBy: boolean;
  poweredByUrl?: string;
  controlsLayout?: 'left' | 'top';
  hideDistanceFilters?: boolean;
  entityLinkMode?: 'external' | 'local';
  entityPathBases?: Record<string, string>;
  olcBase?: string;
}

export interface MatchLocation {
  lat?: number;
  lng?: number;
  name?: string;
  fullAddress?: string;
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
  };
}

export interface MatchSummary {
  id: string;
  title?: string;
  name?: string;
  date?: string;
  start?: string;
  distanceMi?: number;
  imageUrl?: string;
  description?: string;
  status?: string;
  matchTier?: string;
  type?: string | string[];
  disciplines?: string[];
  subDiscipline?: string[] | string;
  seriesIds?: string[];
  seasons?: string[];
  clubId?: string;
  clubName?: string;
  location?: MatchLocation;
  [key: string]: any;
}

export interface ClubSummary {
  id: string;
  name?: string;
  imageUrl?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
  location?: MatchLocation;
  [key: string]: any;
}

export interface SeasonLeaderboardEntry {
  rank?: number;
  name?: string;
  division?: string;
  class?: string;
  score?: number;
  team?: string;
}

export interface SeasonSummary {
  id: string;
  name?: string;
  leaderboard?: {
    title?: string;
    updatedAt?: string;
    entries?: SeasonLeaderboardEntry[];
  };
  [key: string]: any;
}

export interface SeriesSummary {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  shortName?: string;
  abbreviation?: string;
  website?: string;
  [key: string]: any;
}
