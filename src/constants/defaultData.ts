import { CharacterData } from '../schema/types';
import defaultData from './default_data.pf1?url'; // We need to handle this as JSON or Raw

// Since .pf1 is just JSON, we can import it directly if we tell Vite/TS it's JSON
// Or we can just use the previous object since Vite doesn't know .pf1 is JSON by default
import rawData from './default_data.pf1?raw';

export const DEFAULT_DATA: CharacterData = JSON.parse(rawData);

