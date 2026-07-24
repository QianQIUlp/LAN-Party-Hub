import Phaser from "phaser";
import * as THREE from "three";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type {
  RouletteActionEvent,
  RouletteItem,
  RoulettePublicState
} from "../protocol.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: {
    phase?: string;
    state?: unknown;
    message?: string;
  } | null;
  room?: {
    code?: string;
    language?: SupportedLanguage;
    players?: Array<{ id: string; name: string; color?: string }>;
  } | null;
}

const palette = {
  background: 0x07090d,
  wine: 0x3d0b14,
  brass: 0xd6a84b,
  ivory: "#fff7dc",
  muted: "#c7b99a",
  live: 0xef3340,
  blank: 0x64748b,
  panel: 0x12151a,
  cyan: 0x55d7ff
};

const itemLabels: Record<SupportedLanguage, Record<RouletteItem, string>> = {
  "zh-CN": {
    field_dress: "止痛绷带",
    lens: "检视镜",
    extractor: "退壳扳手",
    restraint: "锁扣",
    overcharge: "增压线圈",
    inverter: "极性逆转器"
  },
  en: {
    field_dress: "Field Dressing",
    lens: "Inspection Lens",
    extractor: "Extractor",
    restraint: "Restraint",
    overcharge: "Overcharge Coil",
    inverter: "Polarity Inverter"
  },
  de: {
    field_dress: "Verband",
    lens: "Prueflinse",
    extractor: "Auswerfer",
    restraint: "Fixierung",
    overcharge: "Ueberladung",
    inverter: "Polwender"
  }
};

export class RouletteHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private latestState?: HostAppStateLike;
  private threeRenderer?: THREE.WebGLRenderer;
  private threeScene?: THREE.Scene;
  private threeCamera?: THREE.PerspectiveCamera;
  private deviceGroup?: THREE.Group;
  private chamberGroup?: THREE.Group;
  private chamberSlots: THREE.Mesh[] = [];
  private flashMesh?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private flashLight?: THREE.PointLight;
  private accentMaterial?: THREE.MeshStandardMaterial;
  private lastEventNumber = -1;
  private lastReloadNumber = -1;
  private spinVelocity = 0;
  private recoil = 0;
  private flash = 0;
  private pulse = 0;
  private previousParentPosition = "";
  private previousGameCanvasPosition = "";
  private previousGameCanvasZIndex = "";

  constructor() {
    super(rouletteManifest.hostView);
  }

  create(): void {
    this.setupThree();
    const client = this.registry.get("hostClient") as HostClientLike;

    this.unsubscribe = client.subscribe((state) => {
      this.latestState = state;
      this.redraw();
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.cleanupThree();
    });
  }

  update(time: number, delta: number): void {
    if (
      !this.threeRenderer
      || !this.threeScene
      || !this.threeCamera
      || !this.deviceGroup
      || !this.chamberGroup
    ) {
      return;
    }

    const dt = Math.min(0.05, Math.max(0, delta / 1_000));
    const seconds = time / 1_000;
    this.spinVelocity *= Math.exp(-3.1 * dt);
    this.recoil *= Math.exp(-11 * dt);
    this.flash *= Math.exp(-16 * dt);
    this.pulse *= Math.exp(-3.8 * dt);

    this.chamberGroup.rotation.z += dt * (0.25 + this.spinVelocity);
    this.deviceGroup.rotation.x = -0.08 + Math.sin(seconds * 0.7) * 0.025;
    this.deviceGroup.rotation.y = 0.2 + Math.sin(seconds * 0.45) * 0.08;
    this.deviceGroup.rotation.z = Math.sin(seconds * 0.55) * 0.018 - this.recoil * 0.025;
    this.deviceGroup.position.x = -this.recoil * 0.42;
    this.deviceGroup.position.y = 0.12 + Math.sin(seconds * 0.8) * 0.035;

    if (this.flashMesh && this.flashLight) {
      this.flashMesh.visible = this.flash > 0.025;
      const flashScale = 0.35 + this.flash * 1.45;
      this.flashMesh.scale.setScalar(flashScale);
      this.flashMesh.material.opacity = Math.min(1, this.flash);
      this.flashLight.intensity = this.flash * 18;
    }

    if (this.accentMaterial) {
      this.accentMaterial.emissiveIntensity = 0.35 + this.pulse * 2.8;
    }

    this.threeRenderer.render(this.threeScene, this.threeCamera);
  }

  private setupThree(): void {
    try {
      const parent = this.game.canvas.parentElement;
      if (!parent) {
        return;
      }

      this.previousParentPosition = parent.style.position;
      this.previousGameCanvasPosition = this.game.canvas.style.position;
      this.previousGameCanvasZIndex = this.game.canvas.style.zIndex;

      if (window.getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
      }
      this.game.canvas.style.position = "relative";
      this.game.canvas.style.zIndex = "0";

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.pointerEvents = "none";
      renderer.domElement.style.zIndex = "1";
      renderer.domElement.setAttribute("aria-hidden", "true");
      parent.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0.25, 7.4);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.HemisphereLight(0x9bdcff, 0x25030a, 2.3));
      const keyLight = new THREE.DirectionalLight(0xffddb0, 4.6);
      keyLight.position.set(-3.5, 4.5, 5);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x4fb8ff, 3.2);
      rimLight.position.set(4, -2, 3);
      scene.add(rimLight);

      this.threeRenderer = renderer;
      this.threeScene = scene;
      this.threeCamera = camera;
      this.buildFateDevice(scene);
      this.resizeThree();
    } catch {
      this.cleanupThree();
    }
  }

  private buildFateDevice(scene: THREE.Scene): void {
    const device = new THREE.Group();
    const chamber = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x202832,
      metalness: 0.88,
      roughness: 0.22
    });
    const blackMetal = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      metalness: 0.72,
      roughness: 0.34
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xd6a84b,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x4a2300,
      emissiveIntensity: 0.35
    });
    const redGlass = new THREE.MeshStandardMaterial({
      color: 0x8f1723,
      metalness: 0.32,
      roughness: 0.2,
      emissive: 0x5d0610,
      emissiveIntensity: 0.35
    });
    this.accentMaterial = brass;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.58, 0.72), darkMetal);
    receiver.position.set(-0.05, 0.05, 0);
    receiver.geometry.rotateY(-0.04);
    device.add(receiver);

    const upperRail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.18), brass);
    upperRail.position.set(-0.05, 0.42, 0.12);
    device.add(upperRail);

    for (const y of [-0.14, 0.16]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.135, 2.35, 18),
        blackMetal
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(1.45, y, -0.02);
      device.add(barrel);

      const barrelRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.035, 8, 20),
        brass
      );
      barrelRing.rotation.y = Math.PI / 2;
      barrelRing.position.set(2.57, y, -0.02);
      device.add(barrelRing);
    }

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.25, 0.58), blackMetal);
    grip.position.set(-0.82, -0.72, -0.02);
    grip.rotation.z = -0.26;
    device.add(grip);

    const gripAccent = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.62), redGlass);
    gripAccent.position.set(-0.91, -0.72, -0.01);
    gripAccent.rotation.z = -0.26;
    device.add(gripAccent);

    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 8, 22), brass);
    triggerGuard.scale.set(1.25, 0.72, 1);
    triggerGuard.position.set(-0.2, -0.43, 0.1);
    device.add(triggerGuard);

    const chamberBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.48, 16),
      darkMetal
    );
    chamberBody.rotation.x = Math.PI / 2;
    chamber.add(chamberBody);

    const chamberRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.075, 10, 28), brass);
    chamberRing.position.z = 0.27;
    chamber.add(chamberRing);

    this.chamberSlots = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI / 4);
      const slotMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b6b32,
        metalness: 0.76,
        roughness: 0.3
      });
      const slot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.115, 0.09, 14),
        slotMaterial
      );
      slot.rotation.x = Math.PI / 2;
      slot.position.set(Math.cos(angle) * 0.49, Math.sin(angle) * 0.49, 0.31);
      chamber.add(slot);
      this.chamberSlots.push(slot);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16), brass);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.34;
    chamber.add(hub);
    chamber.position.set(-0.48, 0.09, 0.48);
    chamber.rotation.x = -0.08;
    device.add(chamber);

    const muzzleLight = new THREE.PointLight(0xff4a26, 0, 4);
    muzzleLight.position.set(2.72, 0.02, 0);
    scene.add(muzzleLight);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc247,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), flashMaterial);
    flashMesh.position.set(2.7, 0.02, 0);
    flashMesh.visible = false;
    device.add(flashMesh);

    device.rotation.set(-0.08, 0.2, 0);
    device.position.y = 0.12;
    scene.add(device);
    this.deviceGroup = device;
    this.chamberGroup = chamber;
    this.flashMesh = flashMesh;
    this.flashLight = muzzleLight;
  }

  private cleanupThree(): void {
    const parent = this.game?.canvas?.parentElement;

    if (this.threeScene) {
      this.threeScene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return;
        }
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    }

    if (this.threeRenderer) {
      this.threeRenderer.domElement.remove();
      this.threeRenderer.dispose();
      this.threeRenderer.forceContextLoss();
    }

    if (parent) {
      parent.style.position = this.previousParentPosition;
    }
    if (this.game?.canvas) {
      this.game.canvas.style.position = this.previousGameCanvasPosition;
      this.game.canvas.style.zIndex = this.previousGameCanvasZIndex;
    }

    this.threeRenderer = undefined;
    this.threeScene = undefined;
    this.threeCamera = undefined;
    this.deviceGroup = undefined;
    this.chamberGroup = undefined;
    this.chamberSlots = [];
    this.flashMesh = undefined;
    this.flashLight = undefined;
    this.accentMaterial = undefined;
    this.lastEventNumber = -1;
    this.lastReloadNumber = -1;
  }

  private handleResize(): void {
    this.resizeThree();
    this.redraw();
  }

  private resizeThree(): void {
    if (!this.threeRenderer || !this.threeCamera) {
      return;
    }
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    this.threeRenderer.setSize(width, height, false);
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }

  private syncThree(state: RoulettePublicState): void {
    const totalRemaining = state.liveShellsRemaining + state.blankShellsRemaining;
    this.chamberSlots.forEach((slot, index) => {
      const material = slot.material as THREE.MeshStandardMaterial;
      const occupied = index < totalRemaining;
      material.color.setHex(occupied ? 0xb78a3d : 0x11161d);
      material.emissive.setHex(occupied ? 0x2a1400 : 0x000000);
      material.emissiveIntensity = occupied ? 0.3 : 0;
    });

    if (state.reloadNumber !== this.lastReloadNumber) {
      this.lastReloadNumber = state.reloadNumber;
      this.spinVelocity = Math.max(this.spinVelocity, 11);
      this.pulse = Math.max(this.pulse, 0.8);
    }

    const event = state.lastEvent;
    if (!event || event.eventNumber === this.lastEventNumber) {
      return;
    }
    this.lastEventNumber = event.eventNumber;

    if (event.kind === "reload") {
      this.spinVelocity = 11;
      this.pulse = 0.8;
      return;
    }

    if (event.kind === "shot") {
      this.recoil = event.shell === "live" ? 1 : 0.28;
      this.flash = event.shell === "live" ? 1 : 0.12;
      this.spinVelocity += event.shell === "live" ? 1.8 : 0.8;
      return;
    }

    if (event.kind === "item") {
      this.pulse = event.item === "overcharge" ? 1 : 0.62;
      if (event.item === "extractor") {
        this.spinVelocity += 4.5;
      } else if (event.item === "inverter") {
        this.spinVelocity -= 7;
      } else if (event.item === "lens") {
        this.spinVelocity += 1.2;
      }
      return;
    }

    this.pulse = 1;
  }

  private redraw(): void {
    if (!this.latestState) {
      return;
    }

    this.children.removeAll(true);
    this.render(this.latestState);
  }

  private render(appState: HostAppStateLike): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const language = appState.room?.language ?? "zh-CN";
    const gameState = appState.game?.state as RoulettePublicState | undefined;
    const players = appState.room?.players ?? [];
    const names = Object.fromEntries(players.map((player) => [player.id, player.name]));

    this.drawBackground(width, height);
    this.add.text(150, 26, this.text(language, "命运轮盘", "FATE CHAMBER", "SCHICKSALSTROMMEL"), {
      fontFamily: "Georgia, serif",
      fontSize: "44px",
      fontStyle: "bold",
      color: palette.ivory
    });
    this.add.text(
      width - 42,
      40,
      this.text(language, "房间 ", "ROOM ", "RAUM ") + (appState.room?.code ?? "----"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: palette.muted
      }
    ).setOrigin(1, 0);

    if (!gameState) {
      this.add.text(
        width / 2,
        height / 2,
        this.text(language, "命运装置启动中……", "Fate engine booting...", "Schicksalsmaschine startet..."),
        {
          fontFamily: "Georgia, serif",
          fontSize: "34px",
          color: palette.ivory
        }
      ).setOrigin(0.5);
      return;
    }

    this.syncThree(gameState);
    const leftPlayerId = gameState.playerOrder[0];
    const rightPlayerId = gameState.playerOrder[1];
    const cardWidth = Math.min(315, Math.max(246, width * 0.255));
    const cardHeight = Math.min(300, Math.max(250, height * 0.36));
    const cardY = Math.max(178, height * 0.24);

    if (leftPlayerId) {
      this.drawPlayerCard(
        38,
        cardY,
        cardWidth,
        cardHeight,
        leftPlayerId,
        names[leftPlayerId] ?? leftPlayerId,
        gameState,
        language
      );
    }

    if (rightPlayerId) {
      this.drawPlayerCard(
        width - cardWidth - 38,
        cardY,
        cardWidth,
        cardHeight,
        rightPlayerId,
        names[rightPlayerId] ?? rightPlayerId,
        gameState,
        language
      );
    }

    if (!this.threeRenderer) {
      this.drawFallbackDevice(width / 2, height * 0.43);
    }
    this.drawDeviceStatus(width / 2, height, gameState, names, language);

    const message = appState.game?.message ?? gameState.message ?? "";
    const messageWidth = Math.max(420, Math.min(900, width - 190));
    const messagePanel = this.add.graphics();
    messagePanel.fillStyle(0x000000, 0.55);
    messagePanel.fillRoundedRect(
      width / 2 - messageWidth / 2,
      height - 106,
      messageWidth,
      66,
      18
    );
    messagePanel.lineStyle(2, palette.brass, 0.62);
    messagePanel.strokeRoundedRect(
      width / 2 - messageWidth / 2,
      height - 106,
      messageWidth,
      66,
      18
    );
    this.add.text(width / 2, height - 73, message, {
      fontFamily: "Arial, sans-serif",
      fontSize: "20px",
      color: palette.ivory,
      align: "center",
      wordWrap: { width: messageWidth - 46 }
    }).setOrigin(0.5);
  }

  private drawBackground(width: number, height: number): void {
    this.cameras.main.setBackgroundColor(palette.background);
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(palette.background, palette.wine, 0x03060a, 0x180812, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, palette.brass, 0.065);

    for (let offset = -height; offset < width; offset += 72) {
      graphics.lineBetween(offset, 0, offset + height, height);
    }

    graphics.fillStyle(0x000000, 0.34);
    graphics.fillEllipse(width / 2, height * 0.7, width * 0.9, height * 0.4);
    graphics.lineStyle(2, palette.cyan, 0.08);
    graphics.strokeEllipse(width / 2, height * 0.45, width * 0.38, height * 0.38);
  }

  private drawPlayerCard(
    x: number,
    y: number,
    width: number,
    height: number,
    playerId: string,
    name: string,
    gameState: RoulettePublicState,
    language: SupportedLanguage
  ): void {
    const isCurrent = gameState.currentPlayerId === playerId && gameState.stage === "duel";
    const isWinner = gameState.winnerPlayerId === playerId;
    const health = gameState.healthByPlayer[playerId] ?? 0;
    const inventory = gameState.inventoryCountByPlayer[playerId] ?? 0;
    const wins = gameState.duelWinsByPlayer[playerId] ?? 0;
    const boosted = gameState.boostedPlayerIds.includes(playerId);
    const restrained = gameState.restrainedPlayerIds.includes(playerId);
    const graphics = this.add.graphics();
    graphics.fillStyle(palette.panel, 0.9);
    graphics.fillRoundedRect(x, y, width, height, 24);
    graphics.lineStyle(
      isCurrent || isWinner ? 5 : 2,
      isWinner ? 0x22c55e : isCurrent ? palette.brass : 0x5b4a2c,
      isCurrent || isWinner ? 1 : 0.72
    );
    graphics.strokeRoundedRect(x, y, width, height, 24);

    this.add.text(x + width / 2, y + 24, name, {
      fontFamily: "Georgia, serif",
      fontSize: "29px",
      fontStyle: "bold",
      color: palette.ivory
    }).setOrigin(0.5, 0);

    const status = isWinner
      ? this.text(language, "整场赢家", "MATCH WINNER", "MATCHSIEGER")
      : isCurrent
        ? this.text(language, "正在决策", "DECIDING", "ENTSCHEIDET")
        : gameState.stage === "intermission"
          ? this.text(language, "盘间结算", "INTERMISSION", "PAUSE")
          : this.text(language, "观察中", "WATCHING", "BEOBACHTET");

    this.add.text(x + width / 2, y + 66, status, {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: isCurrent || isWinner ? "#facc15" : palette.muted
    }).setOrigin(0.5, 0);

    const spacing = Math.min(42, (width - 70) / Math.max(1, gameState.maxHealth - 1));
    const totalWidth = (gameState.maxHealth - 1) * spacing;
    for (let index = 0; index < gameState.maxHealth; index += 1) {
      const alive = index < health;
      const centerX = x + width / 2 - totalWidth / 2 + index * spacing;
      const centerY = y + 122;
      graphics.fillStyle(alive ? 0xc21f35 : 0x27272a, 1);
      graphics.fillCircle(centerX, centerY, 14);
      graphics.lineStyle(3, alive ? 0xff9a9f : 0x52525b, 0.9);
      graphics.strokeCircle(centerX, centerY, 14);
    }

    this.add.text(
      x + 24,
      y + 162,
      this.text(language, "盘分", "DUELS", "DUELLE"),
      { fontFamily: "Arial, sans-serif", fontSize: "15px", color: palette.muted }
    );
    this.add.text(x + width - 24, y + 160, wins + "/" + gameState.duelWinsRequired, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "18px",
      color: "#fde68a"
    }).setOrigin(1, 0);

    this.add.text(
      x + 24,
      y + 194,
      this.text(language, "战术道具", "TOOLS", "WERKZEUGE"),
      { fontFamily: "Arial, sans-serif", fontSize: "15px", color: palette.muted }
    );
    this.add.text(x + width - 24, y + 192, String(inventory), {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "18px",
      color: "#dbeafe"
    }).setOrigin(1, 0);

    const effects = [
      boosted ? this.text(language, "增压", "BOOST", "BOOST") : null,
      restrained ? this.text(language, "锁扣", "LOCKED", "FIXIERT") : null
    ].filter((entry): entry is string => Boolean(entry));
    this.add.text(
      x + width / 2,
      y + 236,
      effects.length > 0
        ? effects.join("  ·  ")
        : this.text(language, "无状态效果", "NO ACTIVE EFFECT", "KEIN EFFEKT"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: effects.length > 0 ? "#67e8f9" : "#71717a"
      }
    ).setOrigin(0.5, 0);
  }

  private drawDeviceStatus(
    x: number,
    height: number,
    gameState: RoulettePublicState,
    names: Record<string, string>,
    language: SupportedLanguage
  ): void {
    const duelLabel =
      this.text(language, "第 ", "DUEL ", "DUELL ")
      + gameState.duelNumber
      + "  ·  "
      + (gameState.duelWinsRequired === 2
        ? this.text(language, "三盘两胜", "BEST OF THREE", "BEST OF THREE")
        : gameState.duelWinsRequired);
    this.add.text(x, 112, duelLabel, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "17px",
      color: "#fde68a",
      backgroundColor: "rgba(10, 14, 20, 0.72)",
      padding: { left: 18, right: 18, top: 8, bottom: 8 }
    }).setOrigin(0.5);

    const shellY = Math.min(height - 265, height * 0.66);
    this.add.text(
      x,
      shellY,
      gameState.liveShellsRemaining
        + this.text(language, " 发实弹", " LIVE", " SCHARF")
        + "  ·  "
        + gameState.blankShellsRemaining
        + this.text(language, " 发空包弹", " BLANK", " LEER"),
      {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "21px",
        color: palette.ivory
      }
    ).setOrigin(0.5);
    this.add.text(
      x,
      shellY + 32,
      this.text(language, "装填批次 #", "LOAD #", "LADUNG #") + gameState.reloadNumber,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: palette.muted
      }
    ).setOrigin(0.5);

    const eventLabel = this.eventLabel(gameState.lastEvent, names, language);
    this.add.text(x, shellY + 70, eventLabel, {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: this.eventColor(gameState.lastEvent),
      align: "center",
      wordWrap: { width: 520 }
    }).setOrigin(0.5);
  }

  private eventLabel(
    event: RouletteActionEvent | undefined,
    names: Record<string, string>,
    language: SupportedLanguage
  ): string {
    if (!event) {
      return this.text(language, "等待第一次行动", "Waiting for the first action", "Warte auf die erste Aktion");
    }
    if (event.kind === "reload") {
      return this.text(language, "命运装置正在旋转洗弹", "The fate engine is shuffling", "Die Maschine mischt");
    }
    if (event.kind === "shot") {
      const target = names[event.targetPlayerId] ?? event.targetPlayerId;
      return event.shell === "live"
        ? this.text(language, "实弹命中 ", "LIVE charge hit ", "SCHARF trifft ") + target
        : this.text(language, "空响 · 目标 ", "BLANK · target ", "LEER · Ziel ") + target;
    }
    if (event.kind === "item") {
      const actor = names[event.playerId] ?? event.playerId;
      const ejected = event.revealedShell
        ? " · " + (event.revealedShell === "live"
          ? this.text(language, "移除实弹", "live removed", "scharf entfernt")
          : this.text(language, "移除空包弹", "blank removed", "leer entfernt"))
        : "";
      return actor + " · " + itemLabels[language][event.item] + ejected;
    }
    return (names[event.winnerPlayerId] ?? event.winnerPlayerId)
      + this.text(language, " 赢下本盘", " wins the duel", " gewinnt das Duell");
  }

  private eventColor(event: RouletteActionEvent | undefined): string {
    if (event?.kind === "shot" && event.shell === "live") {
      return "#fca5a5";
    }
    if (event?.kind === "item") {
      return "#67e8f9";
    }
    return palette.muted;
  }

  private drawFallbackDevice(x: number, y: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x17202b, 0.96);
    graphics.fillRoundedRect(x - 155, y - 42, 310, 84, 22);
    graphics.lineStyle(6, palette.brass, 0.9);
    graphics.strokeRoundedRect(x - 155, y - 42, 310, 84, 22);
    graphics.fillStyle(0x090b10, 1);
    graphics.fillCircle(x - 55, y, 66);
    graphics.lineStyle(5, palette.brass, 0.82);
    graphics.strokeCircle(x - 55, y, 66);
    graphics.fillStyle(palette.live, 0.88);
    graphics.fillCircle(x + 152, y, 16);
  }

  private text(
    language: SupportedLanguage,
    chinese: string,
    english: string,
    german: string
  ): string {
    return language === "zh-CN" ? chinese : language === "en" ? english : german;
  }
}

export const hostGame = {
  id: rouletteManifest.id,
  displayName: rouletteManifest.displayName,
  sceneKey: rouletteManifest.hostView,
  scene: RouletteHostScene
} as const;
