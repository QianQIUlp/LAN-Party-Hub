// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import Phaser from "phaser";
import type {
  FishEatFishFxEvent,
  FishEatFishPlayerState,
  FishEatFishState,
  FishPowerupState,
  FishState
} from "../protocol.js";
import { FISH_PLAYER_PALETTES } from "../protocol.js";
import { FISH_SPECIES, SAND_Y, ARENA_WIDTH, ARENA_HEIGHT } from "../server/simulation.js";

const MAX_R = 150;

const POWERUP_COLORS: Record<string, string> = {
  star: "#8ad4ff",
  shield: "#ffe08a",
  grow: "#7dff8a",
  freeze: "#9fe8ff"
};

interface FishRenderOptions {
  x: number;
  y: number;
  r: number;
  ang: number;
  phase: number;
  body: string;
  belly: string;
  dark: string;
  pattern: "plain" | "bar" | "stripe" | "spot" | "shark";
  nose?: boolean;
  gold?: boolean;
  munch?: boolean;
  gulp?: number;
  spawnT?: number;
}

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function colorToInt(color: string): number {
  if (color.startsWith("#")) {
    return parseInt(color.slice(1), 16);
  }
  const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return (parseInt(match[1], 10) << 16) | (parseInt(match[2], 10) << 8) | parseInt(match[3], 10);
  }
  return 0xffffff;
}

function drawFishShape(g: Phaser.GameObjects.Graphics, o: FishRenderOptions): void {
  const r = o.r;
  const ry = r * 0.62;
  const tail = Math.sin(o.phase) * 0.45 + 0.18;
  const dark = o.dark || shadeHex(o.body, -22);

  if (o.gulp && o.gulp > 0) {
    g.setScale(1 + o.gulp * 0.3, 1 + o.gulp * 0.3);
  }

  g.fillStyle(colorToInt(dark), 1);

  g.fillTriangle(-r * 0.5, 0, -r * 0.95, -ry * 0.9 - tail * r * 0.4, -r * 1.05, 0);
  g.fillTriangle(-r * 0.5, 0, -r * 0.95, ry * 0.9 + tail * r * 0.4, -r * 1.05, 0);

  if (o.nose) {
    g.fillStyle(colorToInt(shadeHex(o.body, 30)), 1);
    g.fillTriangle(r * 0.7, -ry * 0.22, r * 1.42, 0, r * 0.7, ry * 0.22);
  }

  if (o.pattern === "shark") {
    g.fillStyle(colorToInt(dark), 1);
    g.fillTriangle(-r * 0.1, -ry * 0.7, r * 0.05, -ry - r * 0.85, r * 0.35, -ry * 0.6);
  } else {
    g.fillStyle(colorToInt(dark), 1);
    g.fillTriangle(-r * 0.2, -ry * 0.75, -r * 0.05, -ry - r * 0.5, r * 0.28, -ry * 0.7);
  }

  g.fillStyle(colorToInt(o.body), 1);
  g.fillEllipse(0, 0, r * 2, ry * 2, 0);
  g.lineStyle(Math.max(1.2, r * 0.05), colorToInt(shadeHex(o.body, -30)), 0.5);
  g.strokeEllipse(0, 0, r * 2, ry * 2, 0);

  g.fillStyle(colorToInt(o.belly), 1);
  g.fillEllipse(0, ry * 0.14, r * 1.44, ry * 1.04, 0);

  if (o.pattern === "bar") {
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(-r * 0.2, 0, r * 0.16, ry * 1.9, 0);
    g.fillEllipse(r * 0.2, 0, r * 0.14, ry * 1.9, 0);
  } else if (o.pattern === "stripe") {
    g.fillStyle(colorToInt(shadeHex(o.body, -25)), 0.95);
    g.fillEllipse(-r * 0.32, 0, r * 0.22, ry * 1.7, 0.35);
    g.fillEllipse(-r * 0.02, 0, r * 0.22, ry * 1.7, 0.35);
    g.fillEllipse(r * 0.28, 0, r * 0.22, ry * 1.7, 0.35);
  } else if (o.pattern === "spot") {
    g.fillStyle(colorToInt(shadeHex(o.body, -32)), 1);
    g.fillCircle(-r * 0.25, -ry * 0.42, r * 0.13);
    g.fillCircle(r * 0.15, -ry * 0.5, r * 0.1);
    g.fillCircle(r * 0.32, -ry * 0.18, r * 0.12);
  } else if (o.pattern === "shark") {
    g.fillStyle(colorToInt("rgb(80,90,105)"), 0.42);
    g.fillEllipse(0, 0, r * 1.9, ry * 0.62, 0);
    g.lineStyle(Math.max(1, r * 0.05), colorToInt("rgb(40,48,60)"), 0.5);
    for (let i = 0; i < 3; i++) {
      g.strokeEllipse(-r * 0.35 - i * r * 0.1, 0, r * 0.52, r * 0.34, 0);
    }
  }
  if (o.gold) {
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(r * 0.3, -ry * 0.35, r * 0.09);
  }

  g.fillStyle(colorToInt(dark), 1);
  g.fillEllipse(-r * 0.08, ry * 0.22, r * 0.6, r * 0.26, Math.sin(o.phase + 1.6) * 0.4);

  g.lineStyle(Math.max(1, r * 0.045), colorToInt(shadeHex(o.body, -35)), 0.5);
  g.strokeEllipse(-r * 0.28, 0.02 * r, r * 0.58, r * 0.5, 0.5);

  const ex = r * 0.5;
  const ey = -ry * 0.28;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(ex, ey, r * 0.2);
  g.fillStyle(0x22303f, 1);
  g.fillCircle(ex + r * 0.055, ey, r * 0.095);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(ex + r * 0.03, ey - r * 0.04, r * 0.035);

  if (o.munch) {
    g.fillStyle(0x1e2837, 0.92);
    g.fillTriangle(r * 0.85, -r * 0.14, r * 1.08, 0, r * 0.85, r * 0.14);
  } else {
    g.lineStyle(Math.max(1, r * 0.05), colorToInt(shadeHex(o.body, -40)), 1);
    g.strokeEllipse(r * 0.92, 0, r * 0.18, r * 0.1, 0);
  }

  if (o.spawnT && o.spawnT > 0) {
    const a = clamp(o.spawnT / 900, 0, 1);
    g.lineStyle(2, 0xffffff, a * 0.5);
    g.strokeCircle(0, 0, r * 1.45);
  }
}

interface LocalParticle {
  type: "bub" | "spark" | "ring" | "ghostDot";
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface LocalFloater {
  x: number;
  y: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
  textObj: Phaser.GameObjects.Text;
}

interface LocalBubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wob: number;
  phase: number;
}

interface SeaweedBlade {
  x: number;
  y: number;
  h: number;
  w: number;
  sway: number;
  phase: number;
  color: string;
}

export class FishEatFishRenderer {
  private readonly scene: Phaser.Scene;
  private readonly worldG: Phaser.GameObjects.Graphics;
  private readonly overlayG: Phaser.GameObjects.Graphics;
  private readonly fxG: Phaser.GameObjects.Graphics;
  private readonly entityPool = new Map<string, Phaser.GameObjects.Graphics>();
  private readonly speckles: Array<{ x: number; y: number; r: number; a: number }> = [];
  private readonly seaweed: SeaweedBlade[] = [];
  private readonly decor: Array<{ x: number; y: number; type: "shell" | "star"; rot: number; scale: number }> = [];
  private readonly bubbles: LocalBubble[] = [];
  private readonly particles: LocalParticle[] = [];
  private readonly floaters: LocalFloater[] = [];
  private readonly bubbleTimer: { t: number } = { t: 0 };
  private lastFxSeq = 0;
  private hurtFlash = 0;

  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private readonly leaderRows: Phaser.GameObjects.Text[] = [];
  private readonly nameLabels = new Map<string, Phaser.GameObjects.Text>();
  private readonly greens = ["#2f9e63", "#36b06f", "#28945a", "#3fbe7a", "#27a25f"];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.worldG = scene.add.graphics();
    this.overlayG = scene.add.graphics();
    this.fxG = scene.add.graphics();
    this.overlayG.setDepth(10);
    this.fxG.setDepth(20);

    for (let i = 0; i < 60; i++) {
      this.speckles.push({
        x: Phaser.Math.FloatBetween(0, ARENA_WIDTH),
        y: SAND_Y + Phaser.Math.FloatBetween(12, 82),
        r: Phaser.Math.FloatBetween(1, 3.5),
        a: Phaser.Math.FloatBetween(0.15, 0.6)
      });
    }

    for (let i = 0; i < 15; i++) {
      this.seaweed.push({
        x: Phaser.Math.FloatBetween(24, ARENA_WIDTH - 24),
        y: SAND_Y + 8,
        h: Phaser.Math.FloatBetween(60, 150),
        w: Phaser.Math.FloatBetween(5, 9),
        sway: Phaser.Math.FloatBetween(0.5, 1.1),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        color: this.greens[Math.floor(Math.random() * this.greens.length)]
      });
    }

    for (let i = 0; i < 9; i++) {
      this.decor.push({
        x: Phaser.Math.FloatBetween(30, ARENA_WIDTH - 30),
        y: SAND_Y + Phaser.Math.FloatBetween(14, 58),
        type: Math.random() < 0.5 ? "shell" : "star",
        rot: Phaser.Math.FloatBetween(0, Math.PI * 2),
        scale: Phaser.Math.FloatBetween(0.8, 1.3)
      });
    }

    this.timerText = scene.add.text(0, 0, "", { fontFamily: "sans-serif", fontSize: "34px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
    this.roundText = scene.add.text(0, 0, "", { fontFamily: "sans-serif", fontSize: "16px", color: "#bfe8ff" }).setOrigin(0.5);
    this.messageText = scene.add.text(0, 0, "", { fontFamily: "sans-serif", fontSize: "30px", fontStyle: "bold", color: "#ffd23f" }).setOrigin(0.5).setVisible(false);
    this.timerText.setDepth(30);
    this.roundText.setDepth(30);
    this.messageText.setDepth(40);
    for (let i = 0; i < 4; i++) {
      const row = scene.add.text(0, 0, "", { fontFamily: "sans-serif", fontSize: "16px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0, 0.5);
      row.setDepth(30);
      this.leaderRows.push(row);
    }
  }

  update(
    state: FishEatFishState,
    playerNames: Map<string, string>,
    language: string,
    timeMs: number,
    deltaMs: number
  ): void {
    const t = timeMs / 1000;
    this.hurtFlash = Math.max(0, this.hurtFlash - deltaMs);

    this.worldG.clear();
    this.overlayG.clear();
    this.fxG.clear();
    this.drawBackground(t);
    this.drawSeaweed(t);
    this.drawDecor();
    this.updateBubbles(deltaMs, t);
    this.drawBubbles(t);

    const entities: Array<{ y: number; draw: () => void }> = [];
    const playerStates = Object.values(state.players);
    for (const p of playerStates) {
      entities.push({ y: p.y, draw: () => this.drawPlayer(p, state, t, playerNames) });
    }
    for (const f of state.fish) {
      entities.push({ y: f.y, draw: () => this.drawFish(f) });
    }
    entities.sort((a, b) => a.y - b.y);
    for (const entity of entities) entity.draw();

    for (const pu of state.powerups) this.drawPowerup(pu, t);

    this.consumeFx(state);
    this.updateParticles(deltaMs);
    this.drawParticles();

    this.drawHud(state, playerNames, playerStates, language, t);

    if (this.hurtFlash > 0) {
      const a = (this.hurtFlash / 500) * 0.4;
      this.fxG.fillStyle(0xff3c2d, a);
      this.fxG.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    }

    const phase = state.phase;
    if (phase === "locked" && state.message) {
      this.messageText.setText(state.message).setVisible(true);
      this.messageText.setPosition(ARENA_WIDTH / 2, 150);
    } else if (phase === "playing") {
      this.messageText.setVisible(false);
    }
  }

  destroy(): void {
    this.worldG.destroy();
    this.overlayG.destroy();
    this.fxG.destroy();
    for (const g of this.entityPool.values()) g.destroy();
    this.entityPool.clear();
    for (const label of this.nameLabels.values()) label.destroy();
    this.nameLabels.clear();
    for (const floater of this.floaters) floater.textObj.destroy();
    this.floaters.length = 0;
    this.timerText.destroy();
    this.roundText.destroy();
    this.messageText.destroy();
    for (const row of this.leaderRows) row.destroy();
    this.leaderRows.length = 0;
  }

  private entityGraphics(key: string): Phaser.GameObjects.Graphics {
    let g = this.entityPool.get(key);
    if (!g) {
      g = this.scene.add.graphics();
      g.setDepth(5);
      this.entityPool.set(key, g);
    }
    return g;
  }

  private drawBackground(t: number): void {
    const g = this.worldG;
    const bands: Array<[number, number, number, number]> = [
      [0, 0.3, 0x66c8f2, 0x3594d8],
      [0.3, 0.55, 0x3594d8, 0x1f6ab5],
      [0.55, 0.8, 0x1f6ab5, 0x164f94],
      [0.8, 1, 0x164f94, 0x164f94]
    ];
    for (const [from, to, c1, c2] of bands) {
      const y1 = Math.floor(ARENA_HEIGHT * from);
      const y2 = Math.ceil(ARENA_HEIGHT * to);
      g.fillGradientStyle(c1, c1, c2, c2, 1);
      g.fillRect(0, y1, ARENA_WIDTH, y2 - y1);
    }
    g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.22);
    g.fillRect(0, 0, ARENA_WIDTH, 70);

    g.fillStyle(0xffffff, 0.05);
    for (let i = 0; i < 5; i++) {
      const cx = (((i * 277 + 90 + Math.sin(t * 0.6 + i * 1.9) * 70) % ARENA_WIDTH) + ARENA_WIDTH) % ARENA_WIDTH;
      const cy = 66 + i * 24 + Math.sin(t * 0.4 + i * 1.3) * 14;
      g.fillEllipse(cx, cy, 240 + Math.sin(t * 0.5 + i * 2.3) * 100, 60, 0);
    }

    const sandPoints: Phaser.Types.Math.Vector2Like[] = [];
    for (let x = 0; x <= ARENA_WIDTH; x += 16) {
      sandPoints.push({
        x,
        y: SAND_Y + Math.sin(x * 0.02 + t * 0.8) * 4 + Math.sin(x * 0.007 - t * 0.35) * 3
      });
    }
    sandPoints.push({ x: ARENA_WIDTH, y: ARENA_HEIGHT });
    sandPoints.push({ x: 0, y: ARENA_HEIGHT });
    g.fillGradientStyle(0xeacb92, 0xeacb92, 0xc39a5c, 0xc39a5c, 1);
    g.fillPoints(sandPoints, true);

    g.fillStyle(0x785a32, 0.35);
    for (const s of this.speckles) {
      g.fillEllipse(s.x, s.y, s.r * 2, s.r * 1.2, 0);
    }
    g.fillGradientStyle(0, 0, 0, 0, 0);
  }

  private drawSeaweed(t: number): void {
    const g = this.worldG;
    g.lineStyle(1, 0xffffff, 1);
    for (const blade of this.seaweed) {
      const n = 6;
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const o = Math.sin(t * blade.sway + blade.phase + f * 2.2) * 17 * f * f;
        pts.push({ x: blade.x + o, y: blade.y - blade.h * f });
      }
      for (let i = 0; i < n; i++) {
        g.lineStyle(blade.w * (1 - i / n * 0.82), colorToInt(blade.color), 1);
        g.beginPath();
        g.moveTo(pts[i].x, pts[i].y);
        g.lineTo(pts[i + 1].x, pts[i + 1].y);
        g.strokePath();
      }
    }
  }

  private drawDecor(): void {
    const g = this.worldG;
    for (const d of this.decor) {
      g.save();
      g.translateCanvas(d.x, d.y);
      g.rotateCanvas(d.rot);
      g.scaleCanvas(d.scale, d.scale);
      if (d.type === "shell") {
        g.fillStyle(colorToInt("#f4e3c0"), 1);
        g.fillEllipse(0, 0, 16, 12, 0);
        g.lineStyle(1.2, colorToInt("#d9b98a"), 1);
        g.strokeEllipse(0, 0, 16, 12, 0);
        g.lineStyle(1.2, colorToInt("#e3c89a"), 1);
        g.strokeEllipse(0, 0, 9, 5, 0);
        g.strokeEllipse(0, 0, 4.8, 2.6, 0);
      } else {
        g.fillStyle(colorToInt("#ffab7a"), 1);
        const pts: Phaser.Types.Math.Vector2Like[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const rr = i % 2 === 0 ? 7.5 : 3.2;
          pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
        }
        g.fillPoints(pts, true);
        g.lineStyle(1.2, colorToInt("#e0804f"), 1);
        g.strokePoints(pts, true);
      }
      g.restore();
    }
  }

  private updateBubbles(deltaMs: number, t: number): void {
    this.bubbleTimer.t -= deltaMs;
    if (this.bubbleTimer.t <= 0) {
      this.bubbleTimer.t = Phaser.Math.FloatBetween(120, 400);
      if (this.bubbles.length < 26) {
        this.bubbles.push({
          x: Phaser.Math.FloatBetween(30, ARENA_WIDTH - 30),
          y: SAND_Y + Phaser.Math.FloatBetween(0, 24),
          r: Phaser.Math.FloatBetween(2.5, 6),
          vy: -Phaser.Math.FloatBetween(50, 95),
          wob: Phaser.Math.FloatBetween(0.5, 1.5),
          phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
        });
      }
    }
    for (const b of this.bubbles) {
      b.y += b.vy * (deltaMs / 1000);
      b.phase += deltaMs * 0.003;
      b.x += Math.sin(b.phase) * 14 * (deltaMs / 1000) * b.wob;
    }
    this.bubbles.splice(0, this.bubbles.length, ...this.bubbles.filter((b) => b.y > 14));
  }

  private drawBubbles(t: number): void {
    const g = this.worldG;
    for (const b of this.bubbles) {
      g.lineStyle(1, 0xffffff, 0.3);
      g.fillStyle(0xffffff, 0.07);
      g.fillCircle(b.x, b.y, b.r);
      g.strokeCircle(b.x, b.y, b.r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.25);
    }
  }

  private drawFish(f: FishState): void {
    const key = `fish-${f.id}`;
    const g = this.entityGraphics(key);
    const pal = this.paletteFor(f.key);
    g.setPosition(f.x, f.y);
    g.setRotation(f.angleRad);
    g.setScale(1, 1);
    g.clear();
    drawFishShape(g, {
      x: 0,
      y: 0,
      r: f.radius,
      ang: f.angleRad,
      phase: f.phase,
      body: pal.body,
      belly: f.key === "shark" ? "#e2e9f0" : shadeHex(pal.body, 42),
      dark: shadeHex(pal.body, -24),
      pattern: pal.pattern,
      nose: pal.nose,
      gold: f.gold,
      munch: f.targetFishId !== null || f.targetPlayerId !== null,
      gulp: f.gulpMs > 0 ? f.gulpMs / 300 : 0,
      spawnT: f.spawnMs
    });
  }

  private paletteFor(key: string): { body: string; pattern: "plain" | "bar" | "stripe" | "spot" | "shark"; nose?: boolean } {
    const spec = FISH_SPECIES[key as keyof typeof FISH_SPECIES];
    if (!spec) {
      return { body: "#ffffff", pattern: "plain" };
    }
    return { body: spec.color, pattern: spec.pattern, nose: spec.nose };
  }

  private drawPlayer(p: FishEatFishPlayerState, state: FishEatFishState, t: number, playerNames: Map<string, string>): void {
    const key = `player-${p.playerId}`;
    const g = this.entityGraphics(key);
    const pal = FISH_PLAYER_PALETTES[p.colorIndex % FISH_PLAYER_PALETTES.length];
    const blink = p.invincibleMs > 0 && Math.floor(t * 12) % 2 === 0;
    g.setPosition(p.x, p.y);
    g.setRotation(p.angleRad);
    g.setScale(1, 1);
    g.clear();
    g.setAlpha(blink ? 0.45 : 1);
    drawFishShape(g, {
      x: 0,
      y: 0,
      r: p.radius,
      ang: p.angleRad,
      phase: p.phase,
      body: pal.body,
      belly: pal.belly,
      dark: pal.dark,
      pattern: pal.pattern,
      munch: p.munchMs > 0 || p.mouth > 0.25,
      gulp: p.gulpMs > 0 ? p.gulpMs / 300 : 0
    });
    g.setAlpha(1);

    const og = this.overlayG;
    const by = Math.max(p.y - p.radius - 24, 26);
    this.ensureNameLabel(p, by, playerNames);

    if (p.shieldMs > 0) {
      const pul = 0.7 + 0.3 * Math.sin(t * 8);
      og.lineStyle(3, 0xffe08a, pul);
      og.strokeCircle(p.x, p.y, p.radius + 10);
      og.fillStyle(0xffe08a, 0.08);
      og.fillCircle(p.x, p.y, p.radius + 10);
    }
    if (p.boostMs > 0) {
      const pul = 0.5 + 0.3 * Math.sin(t * 10);
      og.lineStyle(2, 0x8ad4ff, pul);
      og.strokeCircle(p.x, p.y, p.radius + 15);
    }
    if (p.speedMs > 0) {
      const pul = 0.4 + 0.25 * Math.sin(t * 6);
      og.lineStyle(1.5, 0xffffff, pul);
      og.strokeCircle(p.x, p.y, p.radius + 20);
    }
    if (p.slowMs > 0) {
      og.lineStyle(2, 0x9fe8ff, 0.6 + 0.3 * Math.sin(t * 6));
      og.strokeCircle(p.x, p.y, p.radius + 8);
    }
    if (state.leaderPlayerId === p.playerId && p.invincibleMs <= 0) {
      const pul = 0.55 + 0.3 * Math.sin(t * 5);
      og.lineStyle(2.5, 0xffd23f, pul * 0.75);
      og.strokeCircle(p.x, p.y, p.radius + 7);
    }
  }

  private ensureNameLabel(p: FishEatFishPlayerState, y: number, playerNames: Map<string, string>): void {
    const key = `label-${p.playerId}`;
    let label = this.nameLabels.get(key);
    if (!label) {
      label = this.scene.add.text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#061422",
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(15);
      this.nameLabels.set(key, label);
    }
    label.setText(playerNames.get(p.playerId) ?? `P${p.colorIndex + 1}`);
    label.setPosition(p.x, y);
  }

  private drawPowerup(pu: FishPowerupState, t: number): void {
    const g = this.worldG;
    const bob = Math.sin(pu.phase) * 5;
    const x = pu.x;
    const y = pu.y + bob;
    const blink = pu.lifeMs < 3000 && Math.floor(t * 6) % 2 === 0;
    const alpha = blink ? 0.45 : 1;
    const c = POWERUP_COLORS[pu.key] ?? "#ffffff";

    g.fillStyle(0xffffff, 0.12 * alpha);
    g.lineStyle(1.5, 0xffffff, 0.55 * alpha);
    g.fillCircle(x, y, 15);
    g.strokeCircle(x, y, 15);
    g.fillStyle(0xffffff, 0.5 * alpha);
    g.fillCircle(x - 5, y - 5, 3.5);

    g.fillStyle(colorToInt(c), alpha);
    g.lineStyle(2, colorToInt(c), alpha);
    if (pu.key === "star") {
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const rr = i % 2 === 0 ? 9 : 4;
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      g.fillPoints(pts, true);
    } else if (pu.key === "shield") {
      const pts: Phaser.Types.Math.Vector2Like[] = [
        { x: x, y: y - 8 },
        { x: x + 7, y: y - 5.5 },
        { x: x + 6.5, y: y + 2 },
        { x: x, y: y + 9 },
        { x: x - 6.5, y: y + 2 },
        { x: x - 7, y: y - 5.5 }
      ];
      g.fillPoints(pts, true);
    } else if (pu.key === "grow") {
      g.fillCircle(x, y + 1, 6.5);
      g.fillCircle(x - 4.5, y - 3.5, 4);
      g.fillCircle(x + 4.5, y - 3.5, 4);
      g.fillStyle(0xffffff, 0.75 * alpha);
      g.fillCircle(x - 1.5, y - 0.5, 2.2);
    } else {
      g.lineStyle(2, 0xffffff, alpha);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        g.lineTo(x + Math.cos(a) * -8, y + Math.sin(a) * -8);
        g.strokePath();
      }
    }
  }

  private consumeFx(state: FishEatFishState): void {
    if (state.fxSeq <= this.lastFxSeq) return;
    for (const event of state.fx) {
      if (event.id <= this.lastFxSeq) continue;
      this.spawnFx(event);
    }
    this.lastFxSeq = state.fxSeq;
  }

  private spawnFx(event: FishEatFishFxEvent): void {
    if (event.type === "burst") {
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          type: "bub",
          x: event.x + Phaser.Math.FloatBetween(-8, 8),
          y: event.y + Phaser.Math.FloatBetween(-8, 8),
          vx: Phaser.Math.FloatBetween(-22, 22),
          vy: -Phaser.Math.FloatBetween(30, 90),
          g: 0,
          life: Phaser.Math.FloatBetween(0.5, 0.9),
          max: 0.9,
          size: Phaser.Math.FloatBetween(2, 4.5),
          color: event.color || "#bfe8ff"
        });
      }
    } else if (event.type === "ring") {
      this.particles.push({
        type: "ring",
        x: event.x,
        y: event.y,
        vx: 0,
        vy: 0,
        g: 0,
        life: 0.45,
        max: 0.45,
        size: 5,
        color: event.color || "rgba(255,255,255,.9)"
      });
    } else if (event.type === "milestone") {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const sp = Phaser.Math.FloatBetween(60, 165);
        this.particles.push({
          type: "spark",
          x: event.x,
          y: event.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 40,
          g: 240,
          life: Phaser.Math.FloatBetween(0.5, 0.8),
          max: 0.8,
          size: Phaser.Math.FloatBetween(2, 3.5),
          color: "#ffd23f"
        });
      }
      this.spawnFloater(event.x, event.y - 20, "milestone!", "#ffd23f", 19);
    } else if (event.type === "text" && event.text) {
      this.spawnFloater(event.x, event.y, event.text, event.color || "#ffffff", event.size || 17);
    } else if (event.type === "hurt") {
      this.hurtFlash = 500;
      this.scene.cameras.main.shake(300, 0.012);
    }
  }

  private spawnFloater(x: number, y: number, text: string, color: string, size: number): void {
    const textObj = this.scene.add.text(x, y, text, {
      fontFamily: "sans-serif",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#040e1a",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(35);
    this.floaters.push({ x, y, life: 1, max: 1, text, color, size, textObj });
  }

  private updateParticles(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.type === "ring") p.size += 175 * dt;
      else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.g * dt;
        if (p.type === "bub") p.x += Math.sin(p.life * 9) * 10 * dt;
      }
    }
    this.particles.splice(0, this.particles.length, ...this.particles.filter((p) => p.life > 0));

    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 48 * dt;
      const prog = 1 - f.life / f.max;
      const pop = prog < 0.18 ? 1 + ((0.18 - prog) / 0.18) * 0.55 : 1;
      f.textObj.setText(f.text);
      f.textObj.setPosition(f.x, f.y);
      f.textObj.setScale(pop, pop);
      f.textObj.setAlpha(Math.min(1, (f.life / f.max) * 1.6));
    }
    for (const f of this.floaters) {
      if (f.life <= 0) f.textObj.destroy();
    }
    this.floaters.splice(0, this.floaters.length, ...this.floaters.filter((f) => f.life > 0));
  }

  private drawParticles(): void {
    const g = this.fxG;
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      if (p.type === "ring") {
        g.lineStyle(2.5, colorToInt(p.color), a);
        g.strokeCircle(p.x, p.y, p.size);
      } else {
        g.fillStyle(colorToInt(p.color), a);
        g.fillCircle(p.x, p.y, p.size);
      }
    }
  }

  private drawHud(
    state: FishEatFishState,
    playerNames: Map<string, string>,
    playerStates: FishEatFishPlayerState[],
    language: string,
    t: number
  ): void {
    const sec = Math.max(0, Math.ceil(state.timeLeftMs / 1000));
    const danger = sec <= 10 && state.phase === "playing";
    this.timerText.setText(`${sec}`);
    this.timerText.setColor(danger && Math.floor(t * 4) % 2 === 0 ? "#ff6a52" : "#ffffff");
    this.timerText.setPosition(ARENA_WIDTH / 2, 26);
    const zh = language === "zh-CN";
    this.roundText.setText(zh ? `第 ${state.roundNumber} 局` : language === "en" ? `Round ${state.roundNumber}` : `Runde ${state.roundNumber}`);
    this.roundText.setPosition(ARENA_WIDTH / 2, 52);

    const ranked = [...playerStates].sort((a, b) => b.radius - a.radius);
    const sizeLabel = zh ? "体型" : language === "en" ? "Size" : "Groesse";
    for (let i = 0; i < this.leaderRows.length; i++) {
      const row = this.leaderRows[i];
      const p = ranked[i];
      if (!p) {
        row.setText("");
        continue;
      }
      const name = playerNames.get(p.playerId) ?? `P${p.colorIndex + 1}`;
      const isLeader = state.leaderPlayerId === p.playerId;
      row.setText(`${i + 1}. ${name}  ${sizeLabel} ${Math.round(p.radius)}${isLeader ? " ★" : ""}`);
      row.setColor(isLeader ? "#ffd23f" : "#ffffff");
      row.setPosition(16, 16 + i * 24);
      const barW = clamp((p.radius / MAX_R) * 200, 4, 200);
      this.overlayG.fillStyle(0xffffff, 0.15);
      this.overlayG.fillRect(16, 30 + i * 24, 200, 5);
      const pal = FISH_PLAYER_PALETTES[p.colorIndex % FISH_PLAYER_PALETTES.length];
      this.overlayG.fillStyle(colorToInt(pal.body), 0.9);
      this.overlayG.fillRect(16, 30 + i * 24, barW, 5);
    }
  }
}
