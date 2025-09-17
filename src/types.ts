export type ViewMode = 'map' | 'list' | 'calendar';

export interface PluginLocks {
  view?: boolean;
  location?: boolean;
  radius?: boolean;
  filters?: boolean;
}

export interface PluginDefaults {
  view?: ViewMode;
  lat?: number;
  lng?: number;
  radius?: number;
  from?: string;
  to?: string;
  types?: string;
  tiers?: string;
  statuses?: string;
  seasons?: string;
  series?: string;
  locationLabel?: string;
}

export interface PluginOptions {
  defaults: PluginDefaults;
  locks: PluginLocks;
  allowedViews: ViewMode[];
  radiusLimits: { min?: number; max?: number };
  theme?: { mode?: string; tokens?: Record<string, string> };
  showPoweredBy: boolean;
  poweredByUrl?: string;
}

export interface EmbedConfig {
  type: 'matchFinder' | 'matchCard' | 'clubCard' | 'leaderboard';
  restBase: string;
  attrs?: Record<string, any>;
  options: PluginOptions;
}

export interface MatchLocation {
  lat?: number;
  lng?: number;
  name?: string;
  fullAddress?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface MatchSummary {
  id: string;
  title?: string;
  date?: string;
  type?: string;
  matchTier?: string;
  status?: string;
  location?: MatchLocation;
  clubId?: string;
  clubName?: string;
  distanceMi?: number;
  imageUrl?: string;
  description?: string;
  seriesIds?: string[];
  seasonIds?: string[];
}

export interface ClubSummary {
  id: string;
  name?: string;
  description?: string;
  website?: string;
  location?: MatchLocation;
  contactEmail?: string;
  phone?: string;
  imageUrl?: string;
}

export interface SeasonLeaderboardEntry {
  name?: string;
  division?: string;
  class?: string;
  score?: number;
  rank?: number;
  team?: string;
}

export interface SeasonSummary {
  id: string;
  name?: string;
  description?: string;
  leaderboard?: {
    title?: string;
    updatedAt?: string;
    entries?: SeasonLeaderboardEntry[];
  };
}
