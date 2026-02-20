import React from 'react';
import type { EntityListCardProps } from '@shooters-hub/entity-ui';
import { EntityListCard } from '@shooters-hub/entity-ui';

export interface MatchFinderListItemProps extends EntityListCardProps {
  matchHref?: string;
}

export const MatchFinderListItem: React.FC<MatchFinderListItemProps> = ({ matchHref, href, ...rest }) => (
  <EntityListCard href={matchHref ?? href} {...rest} />
);

export default MatchFinderListItem;
