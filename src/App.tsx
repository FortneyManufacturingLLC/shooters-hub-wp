import React, { useEffect } from 'react';
import { MatchFinder } from './match-finder';
import { MatchCard, ClubCard, LeaderboardCard } from './cards';
import type { EmbedConfig } from './types';
import { applyTheme } from './theme';

interface AppProps {
  config: EmbedConfig;
  node: HTMLElement;
}

export const ShootersHubApp: React.FC<AppProps> = ({ config, node }) => {
  useEffect(() => {
    applyTheme(node, config.options?.theme);
  }, [node, config.options?.theme]);

  if (!config?.options || !config.restBase) {
    return <p className="sh-status error">Shooters Hub plugin is not fully configured. Add your API key in the admin settings.</p>;
  }

  const powered = {
    visible: config.options.showPoweredBy,
    url: config.options.poweredByUrl,
  };

  switch (config.type) {
    case 'matchCard':
      return <MatchCard restBase={config.restBase} attrs={config.attrs} powered={powered} />;
    case 'clubCard':
      return <ClubCard restBase={config.restBase} attrs={config.attrs} powered={powered} />;
    case 'leaderboard':
      return <LeaderboardCard restBase={config.restBase} attrs={config.attrs} powered={powered} />;
    case 'matchFinder':
    default:
      return <MatchFinder restBase={config.restBase} options={config.options} attrs={config.attrs} />;
  }
};
