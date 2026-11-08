import { CharacterData } from '../schema/types';
import rawData from './default_data.pf1?raw';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_DATA: CharacterData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  ...JSON.parse(rawData),
};
