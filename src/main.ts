import { audio } from './audio/Audio';
import { startDebugScene } from './debug';
import { SCREEN_H, SCREEN_W } from './engine/constants';
import { Game } from './engine/Game';
import { TitleScene } from './scenes/TitleScene';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const game = new Game(canvas);

/** Integer-scale the 256x224 canvas to fit the window (fractional only if the window is tiny). */
function fitCanvas(): void {
  const helpBar = 26; // keep the controls hint below the canvas visible
  const scale = Math.min(window.innerWidth / SCREEN_W, (window.innerHeight - helpBar) / SCREEN_H);
  const s = scale >= 2 ? Math.floor(scale) : scale;
  canvas.style.width = `${Math.floor(SCREEN_W * s)}px`;
  canvas.style.height = `${Math.floor(SCREEN_H * s)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Browsers only allow audio after a user gesture.
game.input.onAnyPress(() => audio.unlock());

// Global hotkeys.
game.input.onRawKey((code) => {
  if (code === 'KeyM') audio.setMuted(!audio.isMuted());
  if (code === 'KeyF') {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }
});

if (!startDebugScene(game)) game.push(new TitleScene());
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
game.start();
