import { GameState, type SaveData } from './GameState';

const SAVE_KEY = 'minifantasy.save.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // e.g. blocked by privacy settings
  }
}

export function saveGame(state: GameState): boolean {
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(state.toSave()));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): SaveData | null {
  try {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === 1 ? data : null;
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  const data = readSave();
  return data ? GameState.fromSave(data) : null;
}

export function hasSave(): boolean {
  return readSave() !== null;
}
