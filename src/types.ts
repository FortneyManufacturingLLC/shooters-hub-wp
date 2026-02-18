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
  lockedClubId?: string;
  publicAppBase?: string;
  initialFilters?: FinderFilters;
}

export interface EmbedConfig {
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
