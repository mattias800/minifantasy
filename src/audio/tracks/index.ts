// Registry of every song. To add a track: write a SongDef in its own file, add its id to
// MusicId/JingleId in Audio.ts, and register it here (the tests pick it up automatically).

import type { JingleId, MusicId } from '../Audio';
import type { SongDef } from '../song';
import { battle } from './battle';
import { boss } from './boss';
import { dungeon } from './dungeon';
import { ending } from './ending';
import { gameover } from './gameover';
import { inn, item, levelup, save } from './jingles';
import { overworld } from './overworld';
import { title } from './title';
import { town } from './town';
import { victory } from './victory';

export const MUSIC: Record<MusicId, SongDef> = { title, overworld, town, dungeon, battle, boss, victory, gameover, ending };

export const JINGLES: Record<JingleId, SongDef> = { inn, item, levelup, save };
