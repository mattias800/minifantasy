// Jukebox for auditioning every track, jingle and sound effect, plus an offline render check
// (also callable as `window.audioCheck()` from automated tests).

import { audio, type JingleId, type MusicId } from '../src/audio/Audio';
import { SongPlayer } from '../src/audio/player';
import { playSfx, SFX_IDS } from '../src/audio/sfx';
import { compileSong, type SongDef } from '../src/audio/song';
import { Synth } from '../src/audio/synth';
import { JINGLES, MUSIC } from '../src/audio/tracks';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const status = $('status');

function addButton(parent: HTMLElement, label: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', () => {
    audio.unlock();
    onClick(b);
  });
  parent.append(b);
  return b;
}

const musicButtons = new Map<MusicId, HTMLButtonElement>();
function refresh(): void {
  const current = audio.currentMusic();
  for (const [id, b] of musicButtons) b.classList.toggle('playing', id === current);
  status.textContent = current ? `Playing: ${MUSIC[current].title} (${current})` : 'Music stopped.';
}

for (const id of Object.keys(MUSIC) as MusicId[]) {
  musicButtons.set(
    id,
    addButton($('music'), `${id} — ${MUSIC[id].title}`, () => {
      audio.playMusic(id);
      refresh();
    }),
  );
}
for (const id of Object.keys(JINGLES) as JingleId[]) {
  addButton($('jingles'), id, async (b) => {
    b.classList.add('playing');
    await audio.playJingle(id);
    b.classList.remove('playing');
  });
}
for (const id of SFX_IDS) addButton($('sfx'), id, () => audio.playSfx(id));

$('stop').addEventListener('click', () => {
  audio.stopMusic();
  refresh();
});
$<HTMLInputElement>('mute').addEventListener('change', (e) => audio.setMuted((e.target as HTMLInputElement).checked));
$<HTMLInputElement>('musicVol').addEventListener('input', (e) => audio.setMusicVolume(Number((e.target as HTMLInputElement).value)));
$<HTMLInputElement>('sfxVol').addEventListener('input', (e) => audio.setSfxVolume(Number((e.target as HTMLInputElement).value)));

// --- offline render check -----------------------------------------------------------------

const SAMPLE_RATE = 44100;

/** Window for short-term loudness (s). */
const WINDOW_S = 0.1;

interface Level {
  name: string;
  seconds: number;
  peak: number;
  /** Loudest short-term RMS (dBFS), so short effects aren't judged by their trailing silence. */
  loudestDb: number;
  ok: boolean;
}

const toDb = (power: number): number => 10 * Math.log10(power + 1e-12);

function measure(name: string, buf: AudioBuffer): Level {
  const channels = Array.from({ length: buf.numberOfChannels }, (_, ch) => buf.getChannelData(ch));
  const window = Math.floor(buf.sampleRate * WINDOW_S);
  let peak = 0;
  let loudest = 0;
  for (let start = 0; start < buf.length; start += window) {
    let sum = 0;
    const end = Math.min(buf.length, start + window);
    for (const data of channels) {
      for (let i = start; i < end; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        sum += data[i] * data[i];
      }
    }
    loudest = Math.max(loudest, sum / ((end - start) * channels.length));
  }
  const loudestDb = toDb(loudest);
  return { name, seconds: buf.duration, peak, loudestDb, ok: peak < 1 && loudestDb > -45 };
}

async function render(seconds: number, setup: (synth: Synth) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * seconds), SAMPLE_RATE);
  const synth = new Synth(ctx);
  synth.setMusicVolume(0.5);
  synth.setSfxVolume(0.7);
  setup(synth);
  return ctx.startRendering();
}

async function renderSong(name: string, def: SongDef, bodySeconds: number): Promise<Level> {
  const song = compileSong(def);
  const full = (song.introLength + song.bodyLength) * song.secondsPerTick;
  const seconds = Math.min(full, song.introLength * song.secondsPerTick + bodySeconds);
  const buf = await render(seconds + 1, (synth) => {
    new SongPlayer(synth, song, { startTime: 0.05 }).scheduleUntil(seconds);
  });
  return measure(name, buf);
}

/** Renders every song (intro + `bodySeconds` of the loop) and effect; returns their levels. */
async function audioCheck(bodySeconds = 10): Promise<Level[]> {
  const levels: Level[] = [];
  for (const [id, def] of Object.entries(MUSIC)) levels.push(await renderSong(`music:${id}`, def, bodySeconds));
  for (const [id, def] of Object.entries(JINGLES)) levels.push(await renderSong(`jingle:${id}`, def, bodySeconds));
  for (const id of SFX_IDS) levels.push(measure(`sfx:${id}`, await render(2.5, (synth) => playSfx(synth, id, 0.05))));
  return levels;
}

declare global {
  interface Window {
    audioCheck: typeof audioCheck;
  }
}
window.audioCheck = audioCheck;

$('check').addEventListener('click', async () => {
  const table = $('report');
  table.innerHTML = '<tr><td>Rendering…</td></tr>';
  const levels = await audioCheck();
  table.innerHTML =
    '<tr><th>Name</th><th>Seconds</th><th>Peak</th><th>Loudest 100 ms (dBFS)</th><th></th></tr>' +
    levels
      .map(
        (l) =>
          `<tr><td>${l.name}</td><td>${l.seconds.toFixed(1)}</td><td>${l.peak.toFixed(3)}</td>` +
          `<td>${l.loudestDb.toFixed(1)}</td><td class="${l.ok ? '' : 'bad'}">${l.ok ? 'ok' : 'CHECK'}</td></tr>`,
      )
      .join('');
});
