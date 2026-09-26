import { cave1, cave2 } from './grotto';
import { elderHouse, inn, shop } from './interiors';
import { overworld } from './overworld';
import { town } from './town';
import type { MapDef, MapId } from './types';

export type { MapDef, MapId } from './types';

export const MAPS: Readonly<Record<MapId, MapDef>> = {
  overworld,
  town,
  inn,
  shop,
  elder_house: elderHouse,
  cave1,
  cave2,
};
