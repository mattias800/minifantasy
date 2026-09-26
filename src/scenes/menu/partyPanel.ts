import { drawText, drawTextRight } from '../../engine/font';
import type { PartyMember } from '../../game/PartyMember';
import { getPortrait } from '../../gfx/characters';
import { COLOR_BAD, COLOR_HIGHLIGHT, COLOR_LABEL, COLOR_TEXT } from '../../ui/colors';

/** "cur/max" in a colour that warns when low. */
export function drawHpMp(ctx: CanvasRenderingContext2D, label: string, cur: number, max: number, x: number, y: number, right: number): void {
  const color = cur === 0 && label === 'HP' ? COLOR_BAD : cur < max / 4 ? COLOR_HIGHLIGHT : COLOR_TEXT;
  drawText(ctx, label, x, y, { color: COLOR_LABEL });
  drawTextRight(ctx, `${cur}/${max}`, right, y, { color });
}

export function memberNameColor(m: PartyMember): string {
  if (!m.alive) return COLOR_BAD;
  if (m.statuses.has('poison')) return '#d890ff';
  return COLOR_TEXT;
}

/** Full party entry used on the main menu: portrait, name, job, level, HP, MP. 48px tall. */
export function drawMemberCard(ctx: CanvasRenderingContext2D, m: PartyMember, x: number, y: number, width: number): void {
  ctx.drawImage(getPortrait(m.id), x, y + 4);
  const tx = x + 32;
  const right = x + width;
  drawText(ctx, m.name, tx, y, { color: memberNameColor(m) });
  drawTextRight(ctx, !m.alive ? 'KO' : m.statuses.has('poison') ? 'Poison' : m.cls.job, right, y, {
    color: !m.alive ? COLOR_BAD : m.statuses.has('poison') ? '#d890ff' : COLOR_LABEL,
  });
  drawText(ctx, 'Lv', tx, y + 12, { color: COLOR_LABEL });
  drawText(ctx, String(m.level), tx + 16, y + 12);
  drawHpMp(ctx, 'HP', m.hp, m.maxHp, tx, y + 24, right);
  drawHpMp(ctx, 'MP', m.mp, m.maxMp, tx, y + 36, right);
}

/** Compact entry for target pickers: name + HP + MP. 36px tall. */
export function drawMemberCompact(ctx: CanvasRenderingContext2D, m: PartyMember, x: number, y: number, width: number): void {
  drawText(ctx, m.name, x, y, { color: memberNameColor(m) });
  drawHpMp(ctx, 'HP', m.hp, m.maxHp, x + 4, y + 11, x + width);
  drawHpMp(ctx, 'MP', m.mp, m.maxMp, x + 4, y + 22, x + width);
}
