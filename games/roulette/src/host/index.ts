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
  getState(): HostAppStateLike;
  sendGameHostAction(gameId: string, action: unknown): void;
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

type CameraMode = "wide" | "device" | "terminal" | "crate";

interface CanvasSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

interface PlayerTableView {
  playerId: string;
  side: -1 | 1;
  panel: CanvasSurface;
  rack: THREE.Group;
  tools: THREE.Group;
}

interface ToolFlight {
  object: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  startAt: number;
  duration: number;
  fadeAtEnd: boolean;
}

const colors = {
  background: 0x040608,
  wall: 0x18080c,
  table: 0x273e35,
  tableEdge: 0x6f4a2e,
  brass: 0xd6a84b,
  ivory: "#fff3cf",
  muted: "#a99e87",
  live: 0xe02d43,
  blank: 0x687386,
  cyan: 0x43d7f3,
  panel: 0x090c11,
  red: 0x7d101d
};

const itemColors: Record<RouletteItem, number> = {
  field_dress: 0xf3eee2,
  lens: 0x45c9f0,
  extractor: 0xe2a84c,
  restraint: 0x9ba8b7,
  overcharge: 0xeb4257,
  inverter: 0x9a6cff
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smooth(value: number): number {
  const normalized = clamp(value);
  return normalized * normalized * (3 - 2 * normalized);
}

function currentPlayerId(state: RoulettePublicState): string | undefined {
  return state.currentPlayerId ?? state.playerOrder[0];
}

function disposeMaterial(material: THREE.Material): void {
  const mapped = material as THREE.Material & {
    map?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
  };
  mapped.map?.dispose();
  mapped.emissiveMap?.dispose();
  material.dispose();
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Sprite)) {
      return;
    }
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(disposeMaterial);
  });
}

function clearGroup(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function setObjectOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      const transparentMaterial = material as THREE.Material & {
        opacity: number;
        transparent: boolean;
      };
      transparentMaterial.transparent = opacity < 0.999;
      transparentMaterial.opacity = opacity;
    }
  });
}

function createCanvasSurface(
  width: number,
  height: number,
  worldWidth: number,
  worldHeight: number,
  depthTest = true
): CanvasSurface {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest,
    depthWrite: false,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), material);
  mesh.renderOrder = depthTest ? 2 : 10;
  return { canvas, context, texture, mesh };
}

function itemAdditions(
  previous: readonly RouletteItem[],
  next: readonly RouletteItem[]
): Array<{ item: RouletteItem; index: number }> {
  const remaining = [...previous];
  const additions: Array<{ item: RouletteItem; index: number }> = [];
  next.forEach((item, index) => {
    const matchIndex = remaining.indexOf(item);
    if (matchIndex >= 0) {
      remaining.splice(matchIndex, 1);
    } else {
      additions.push({ item, index });
    }
  });
  return additions;
}

export class RouletteHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private hostClient?: HostClientLike;
  private latestState?: HostAppStateLike;
  private lastSyncedGameState?: unknown;
  private threeRenderer?: THREE.WebGLRenderer;
  private threeScene?: THREE.Scene;
  private threeCamera?: THREE.PerspectiveCamera;
  private cameraLook = new THREE.Vector3(0, -0.55, 0);
  private cameraMode: CameraMode = "wide";
  private cameraFocusUntil = 0;
  private queuedTerminalAt = 0;
  private tableGroup?: THREE.Group;
  private tableRimMaterial?: THREE.MeshStandardMaterial;
  private dangerLight?: THREE.PointLight;
  private deviceGroup?: THREE.Group;
  private chamberGroup?: THREE.Group;
  private chamberSlots: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[] = [];
  private muzzleFlash?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private muzzleLight?: THREE.PointLight;
  private deviceAccent?: THREE.MeshStandardMaterial;
  private terminalGroup?: THREE.Group;
  private terminalSurface?: CanvasSurface;
  private terminalGlow?: THREE.PointLight;
  private terminalFocusAmount = 0;
  private crateGroup?: THREE.Group;
  private crateLid?: THREE.Group;
  private crateLight?: THREE.PointLight;
  private crateAnimationStartedAt = -1;
  private crateAnimationEndsAt = -1;
  private promptSurface?: CanvasSurface;
  private playerViews = new Map<string, PlayerTableView>();
  private previousToolsByPlayer: Record<string, RouletteItem[]> = {};
  private toolFlights: ToolFlight[] = [];
  private dealerGroup?: THREE.Group;
  private dealerEyeMaterial?: THREE.MeshStandardMaterial;
  private dust?: THREE.Points;
  private lastEventNumber = -1;
  private lastReloadNumber = -1;
  private spinVelocity = 0;
  private recoil = 0;
  private deviceFocusAmount = 0;
  private flash = 0;
  private accentPulse = 0;
  private impact = 0;
  private previousParentPosition = "";
  private previousGameCanvasPosition = "";
  private previousGameCanvasZIndex = "";

  constructor() {
    super(rouletteManifest.hostView);
  }

  create(): void {
    this.setupThree();
    const client = this.registry.get("hostClient") as HostClientLike;
    this.hostClient = client;
    this.unsubscribe = client.subscribe((state) => {
      this.consumeHostState(state);
    });
    this.consumeHostState(client.getState());
    this.time.delayedCall(120, () => {
      client.sendGameHostAction(rouletteManifest.id, { type: "request_host_sync" });
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
    if (!this.threeRenderer || !this.threeScene || !this.threeCamera) {
      return;
    }

    const dt = Math.min(0.05, Math.max(0, delta / 1_000));
    const now = performance.now();
    const seconds = time / 1_000;
    const liveState = this.hostClient?.getState();
    if (liveState && liveState.game?.state !== this.lastSyncedGameState) {
      this.consumeHostState(liveState);
    }
    this.updateCamera(now, dt);
    this.updateEnvironment(seconds, dt);
    this.updateDevice(seconds, dt);
    this.updateCrate(now);
    this.updateToolFlights(now);
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
        alpha: false,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setClearColor(colors.background, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.34;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.pointerEvents = "none";
      renderer.domElement.style.zIndex = "1";
      renderer.domElement.setAttribute("aria-hidden", "true");
      parent.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(colors.background);
      scene.fog = new THREE.FogExp2(0x070608, 0.045);
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
      camera.position.set(0, 5.4, 8.6);
      camera.lookAt(this.cameraLook);

      scene.add(new THREE.HemisphereLight(0x8bc6d3, 0x3f0a0f, 2.7));
      const key = new THREE.SpotLight(0xffd5a0, 58, 22, Math.PI / 4.5, 0.62, 1.35);
      key.position.set(-3.5, 7.5, 4.5);
      key.target.position.set(0, -0.8, 0);
      key.castShadow = true;
      scene.add(key, key.target);
      const opposing = new THREE.SpotLight(0x77d9ff, 38, 19, Math.PI / 4.7, 0.68, 1.45);
      opposing.position.set(4.5, 5.5, -2.5);
      opposing.target.position.set(0, -0.8, 0);
      scene.add(opposing, opposing.target);
      const dealerFill = new THREE.PointLight(0xff8a6b, 14, 8, 1.7);
      dealerFill.position.set(0, 1.8, -1.4);
      scene.add(dealerFill);
      const tableFill = new THREE.PointLight(0x62d4b5, 9, 9, 1.6);
      tableFill.position.set(0, 1.8, 3.6);
      scene.add(tableFill);
      const danger = new THREE.PointLight(colors.live, 0, 9, 1.8);
      danger.position.set(0, 1.2, 1.4);
      scene.add(danger);

      this.threeRenderer = renderer;
      this.threeScene = scene;
      this.threeCamera = camera;
      this.dangerLight = danger;
      this.buildRoom(scene);
      this.buildTable(scene);
      this.buildDealer(scene);
      this.buildFateDevice(scene);
      this.buildTerminal(scene);
      this.buildToolCrate(scene);
      this.buildPrompt(scene);
      this.buildDust(scene);
      this.resizeThree();
    } catch (error) {
      console.warn("[roulette] Falling back to the 2D table view.", error);
      this.cleanupThree();
    }
  }

  private buildRoom(scene: THREE.Scene): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: colors.wall,
      roughness: 0.88,
      metalness: 0.18
    });
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x17191d,
      roughness: 0.45,
      metalness: 0.68
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 0.45), wallMaterial);
    wall.position.set(0, 1.2, -4.65);
    wall.receiveShadow = true;
    scene.add(wall);

    for (const x of [-5.8, -3, 3, 5.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.2, 0.35), beamMaterial);
      beam.position.set(x, 1.2, -4.32);
      scene.add(beam);
    }

    for (const side of [-1, 1] as const) {
      const speaker = new THREE.Group();
      const cabinet = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 2.45, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x101319, roughness: 0.75, metalness: 0.28 })
      );
      speaker.add(cabinet);
      for (const y of [-0.55, 0.52]) {
        const cone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.5, 0.16, 24),
          new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.56, metalness: 0.2 })
        );
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, y, 0.43);
        speaker.add(cone);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.44, 0.045, 8, 28),
          new THREE.MeshStandardMaterial({ color: 0x6f4a31, roughness: 0.5, metalness: 0.54 })
        );
        ring.position.set(0, y, 0.53);
        speaker.add(ring);
      }
      speaker.position.set(side * 5.2, 0.2, -3.75);
      speaker.rotation.y = side * -0.16;
      scene.add(speaker);
    }

    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      roughness: 0.72,
      metalness: 0.32
    });
    for (let index = 0; index < 4; index += 1) {
      const startX = -6 + index * 3.9;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, 4.6, -4.05),
        new THREE.Vector3(startX + 1.2, 3.9 - index * 0.12, -3.95),
        new THREE.Vector3(startX + 2.6, 4.5, -4.05)
      ]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 7, false), cableMaterial));
    }

    for (const side of [-1, 1] as const) {
      const rig = new THREE.Group();
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.78, 0.82),
        new THREE.MeshStandardMaterial({ color: 0x24272e, metalness: 0.7, roughness: 0.35 })
      );
      rig.add(housing);
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.34, 0.24, 18),
        new THREE.MeshStandardMaterial({
          color: side < 0 ? 0xffb06b : 0x74d8ff,
          emissive: side < 0 ? 0x7a2200 : 0x034d70,
          emissiveIntensity: 1.7,
          roughness: 0.2
        })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.5;
      rig.add(lens);
      rig.position.set(side * 3.1, 3.15, -3.7);
      rig.rotation.set(-0.18, side * -0.24, side * 0.08);
      scene.add(rig);
    }
  }

  private buildTable(scene: THREE.Scene): void {
    const table = new THREE.Group();
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: colors.tableEdge,
      roughness: 0.52,
      metalness: 0.4,
      emissive: 0x2f1407,
      emissiveIntensity: 0.28
    });
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.3, 6.2),
      new THREE.MeshStandardMaterial({ color: colors.table, roughness: 0.93, metalness: 0.05 })
    );
    cloth.position.y = -1.05;
    cloth.receiveShadow = true;
    table.add(cloth);

    const rails: Array<[number, number, number, number]> = [
      [0, -0.79, -3.02, 10.9],
      [0, -0.79, 3.02, 10.9]
    ];
    for (const [x, y, z, width] of rails) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.46, 0.34), edgeMaterial);
      rail.position.set(x, y, z);
      rail.castShadow = true;
      table.add(rail);
    }
    for (const x of [-5.27, 5.27]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 6.38), edgeMaterial);
      rail.position.set(x, -0.79, 0);
      rail.castShadow = true;
      table.add(rail);
    }

    const markMaterial = new THREE.MeshBasicMaterial({ color: 0xc1b78d, transparent: true, opacity: 0.42 });
    const circle = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.026, 6, 80), markMaterial);
    circle.rotation.x = Math.PI / 2;
    circle.position.y = -0.87;
    table.add(circle);
    for (const x of [-2.65, 2.65]) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.012, 0.035), markMaterial);
      lane.position.set(x, -0.86, 1.8);
      table.add(lane);
    }

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.35, 11),
      new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.8, metalness: 0.2 })
    );
    floor.position.set(0, -1.65, 0.4);
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(table);
    this.tableGroup = table;
    this.tableRimMaterial = edgeMaterial;
  }

  private buildDealer(scene: THREE.Scene): void {
    const dealer = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({
      color: 0x171a20,
      metalness: 0.72,
      roughness: 0.34
    });
    const face = new THREE.MeshStandardMaterial({
      color: 0x342229,
      metalness: 0.38,
      roughness: 0.5
    });
    const eye = new THREE.MeshStandardMaterial({
      color: 0x9cf7ff,
      emissive: 0x11b9e6,
      emissiveIntensity: 2.2,
      roughness: 0.15
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.35, 0.7), shell);
    torso.position.y = -0.35;
    dealer.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.45, 12), shell);
    neck.position.y = 0.48;
    dealer.add(neck);
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), face);
    head.scale.set(1, 0.86, 0.72);
    head.position.y = 1.18;
    dealer.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.18), shell);
    visor.position.set(0, 1.25, 0.55);
    dealer.add(visor);
    for (const x of [-0.25, 0.25]) {
      const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), eye);
      eyeMesh.position.set(x, 1.26, 0.66);
      dealer.add(eyeMesh);
    }
    for (const side of [-1, 1] as const) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 10), shell);
      shoulder.scale.set(1.2, 0.65, 0.8);
      shoulder.position.set(side * 1.25, -0.12, 0);
      dealer.add(shoulder);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.25, 12), shell);
      forearm.rotation.z = side * -1.05;
      forearm.position.set(side * 1.52, -0.62, 0.58);
      dealer.add(forearm);
    }
    dealer.position.set(0, 0.15, -3.55);
    scene.add(dealer);
    this.dealerGroup = dealer;
    this.dealerEyeMaterial = eye;
  }

  private buildFateDevice(scene: THREE.Scene): void {
    const device = new THREE.Group();
    const chamber = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1b222b,
      metalness: 0.88,
      roughness: 0.24
    });
    const blackMetal = new THREE.MeshStandardMaterial({
      color: 0x07090c,
      metalness: 0.74,
      roughness: 0.33
    });
    const brass = new THREE.MeshStandardMaterial({
      color: colors.brass,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x4a2300,
      emissiveIntensity: 0.35
    });
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f1322,
      metalness: 0.25,
      roughness: 0.48
    });
    this.deviceAccent = brass;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.52, 2.0), darkMetal);
    receiver.castShadow = true;
    device.add(receiver);
    for (const x of [-0.15, 0.15]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 18), blackMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x, 0.03, -2.18);
      barrel.castShadow = true;
      device.add(barrel);
      const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.025, 7, 18), brass);
      muzzleRing.position.set(x, 0.03, -3.48);
      device.add(muzzleRing);
    }
    const upperRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 2.3), brass);
    upperRail.position.set(0, 0.36, -0.75);
    device.add(upperRail);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.75, 0.62), gripMaterial);
    grip.position.set(0, -0.32, 1.15);
    grip.rotation.x = -0.3;
    grip.castShadow = true;
    device.add(grip);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 1.35), blackMetal);
    stock.position.set(0, 0, 1.65);
    stock.rotation.x = 0.05;
    device.add(stock);

    const chamberBody = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.42, 18), darkMetal);
    chamber.add(chamberBody);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 8, 26), brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.24;
    chamber.add(ring);
    this.chamberSlots = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      const slotMaterial = new THREE.MeshStandardMaterial({
        color: 0x171b21,
        emissive: 0x000000,
        metalness: 0.65,
        roughness: 0.35
      });
      const slot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12), slotMaterial);
      slot.position.set(Math.cos(angle) * 0.31, 0.26, Math.sin(angle) * 0.31);
      chamber.add(slot);
      this.chamberSlots.push(slot);
    }
    chamber.position.set(0, 0.17, 0.1);
    device.add(chamber);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc04a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), flashMaterial);
    flash.position.set(0, 0.03, -3.62);
    flash.visible = false;
    device.add(flash);
    const flashLight = new THREE.PointLight(0xff4a24, 0, 7, 1.6);
    flashLight.position.set(0, 0.5, -3.45);
    device.add(flashLight);

    device.position.set(0, -0.48, 0.2);
    device.scale.setScalar(0.74);
    scene.add(device);
    this.deviceGroup = device;
    this.chamberGroup = chamber;
    this.muzzleFlash = flash;
    this.muzzleLight = flashLight;
  }

  private buildTerminal(scene: THREE.Scene): void {
    const terminal = new THREE.Group();
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.22, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.55, metalness: 0.58 })
    );
    casing.castShadow = true;
    terminal.add(casing);
    const screen = createCanvasSurface(960, 480, 2.08, 0.92);
    screen.mesh.position.z = 0.19;
    terminal.add(screen.mesh);
    for (const x of [-0.98, 0.98]) {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10),
        new THREE.MeshStandardMaterial({ color: colors.brass, metalness: 0.85, roughness: 0.25 })
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(x, -0.48, 0.2);
      terminal.add(bolt);
    }
    terminal.position.set(3.55, -0.18, -2.4);
    terminal.rotation.y = -0.25;
    scene.add(terminal);
    const glow = new THREE.PointLight(0x74ffc5, 2.8, 4.5, 1.8);
    glow.position.set(3.35, 0.25, -1.7);
    scene.add(glow);
    this.terminalGroup = terminal;
    this.terminalSurface = screen;
    this.terminalGlow = glow;
  }

  private buildToolCrate(scene: THREE.Scene): void {
    const crate = new THREE.Group();
    const casing = new THREE.MeshStandardMaterial({
      color: 0x29231f,
      roughness: 0.54,
      metalness: 0.6
    });
    const accent = new THREE.MeshStandardMaterial({
      color: colors.brass,
      roughness: 0.28,
      metalness: 0.88,
      emissive: 0x3a1b00,
      emissiveIntensity: 0.25
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 1.05), casing);
    base.castShadow = true;
    crate.add(base);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.1, 1.18), accent);
    lip.position.y = 0.3;
    crate.add(lip);
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.08, 0.78),
      new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.9 })
    );
    inset.position.y = 0.36;
    crate.add(inset);
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.35, -0.52);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 1.08), casing);
    lid.position.z = 0.52;
    lid.castShadow = true;
    lidPivot.add(lid);
    const lidAccent = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.72), accent);
    lidAccent.position.set(0, 0.1, 0.52);
    lidPivot.add(lidAccent);
    crate.add(lidPivot);
    const light = new THREE.PointLight(0xffc45c, 0, 4.5, 1.4);
    light.position.set(0, 0.85, 0);
    crate.add(light);
    crate.position.set(-2.05, -0.55, 1.25);
    crate.rotation.y = 0.12;
    crate.scale.setScalar(0.88);
    scene.add(crate);
    this.crateGroup = crate;
    this.crateLid = lidPivot;
    this.crateLight = light;
  }

  private buildPrompt(scene: THREE.Scene): void {
    const prompt = createCanvasSurface(1024, 128, 4.9, 0.62, false);
    prompt.mesh.position.set(0, 1.75, 1.55);
    scene.add(prompt.mesh);
    this.promptSurface = prompt;
  }

  private buildDust(scene: THREE.Scene): void {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 13;
      positions[index * 3 + 1] = Math.random() * 6 - 1.1;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 9;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xd8b77e, size: 0.025, transparent: true, opacity: 0.24 })
    );
    scene.add(points);
    this.dust = points;
  }

  private syncScene(state: RoulettePublicState): void {
    const now = performance.now();
    this.ensurePlayerViews(state);
    this.updatePlayerPanels(state);
    this.updateToolRacks(state);
    this.updateTerminal(state);
    this.updatePrompt(state);
    this.updateShellSlots(state);
    this.updateTableMood(state);

    if (state.reloadNumber !== this.lastReloadNumber) {
      this.animateReload(state, now);
      this.lastReloadNumber = state.reloadNumber;
    }

    const event = state.lastEvent;
    if (event && event.eventNumber !== this.lastEventNumber) {
      if (event.kind === "shot") {
        this.animateShot(event, state, now);
      } else if (event.kind === "item") {
        this.animateItemUse(event, state, now);
      }
      this.lastEventNumber = event.eventNumber;
    }

    this.previousToolsByPlayer = Object.fromEntries(
      state.playerOrder.map((playerId) => [
        playerId,
        [...(state.visibleToolsByPlayer[playerId] ?? [])]
      ])
    );
  }

  private consumeHostState(state: HostAppStateLike): void {
    this.latestState = state;
    const gameState = state.game?.state as RoulettePublicState | undefined;
    if (gameState) {
      this.lastSyncedGameState = state.game?.state;
    }
    const visibleState = gameState ?? this.placeholderState(state);
    if (visibleState && this.threeScene) {
      this.syncScene(visibleState);
    } else if (!this.threeRenderer) {
      this.drawFallback(visibleState);
    }
  }

  private placeholderState(state: HostAppStateLike): RoulettePublicState | undefined {
    const playerOrder = (state.room?.players ?? []).slice(0, 2).map((player) => player.id);
    if (playerOrder.length === 0) {
      return undefined;
    }
    return {
      stage: "duel",
      playerOrder,
      currentPlayerId: playerOrder[0],
      healthByPlayer: Object.fromEntries(playerOrder.map((playerId) => [playerId, 3])),
      maxHealth: 3,
      liveShellsRemaining: 0,
      blankShellsRemaining: 0,
      reloadNumber: 0,
      actionNumber: 0,
      inventoryCountByPlayer: Object.fromEntries(playerOrder.map((playerId) => [playerId, 0])),
      visibleToolsByPlayer: Object.fromEntries(playerOrder.map((playerId) => [playerId, []])),
      restrainedPlayerIds: [],
      boostedPlayerIds: [],
      duelNumber: 1,
      duelWinsRequired: 2,
      duelWinsByPlayer: Object.fromEntries(playerOrder.map((playerId) => [playerId, 0])),
      intermissionEndsAt: null,
      message: ""
    };
  }

  private ensurePlayerViews(state: RoulettePublicState): void {
    if (!this.threeScene) {
      return;
    }
    const activeIds = new Set(state.playerOrder);
    for (const [playerId, view] of this.playerViews) {
      if (activeIds.has(playerId)) {
        continue;
      }
      this.threeScene.remove(view.panel.mesh, view.rack);
      disposeObject(view.panel.mesh);
      disposeObject(view.rack);
      this.playerViews.delete(playerId);
    }

    state.playerOrder.slice(0, 2).forEach((playerId, index) => {
      if (this.playerViews.has(playerId)) {
        return;
      }
      const side = (index === 0 ? -1 : 1) as -1 | 1;
      const panel = createCanvasSurface(768, 300, 3.0, 1.18, false);
      panel.mesh.position.set(side * 3.86, 1.05, 1.7);
      const rack = new THREE.Group();
      rack.position.set(side * 3.55, -0.57, 1.24);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.13, 1.04),
        new THREE.MeshStandardMaterial({
          color: 0x11151a,
          metalness: 0.62,
          roughness: 0.38,
          emissive: side < 0 ? 0x431904 : 0x063449,
          emissiveIntensity: 0.26
        })
      );
      base.position.y = -0.06;
      rack.add(base);
      for (let slot = 0; slot < 8; slot += 1) {
        const column = slot % 4;
        const row = Math.floor(slot / 4);
        const socket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.19, 0.19, 0.055, 16),
          new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.45, roughness: 0.58 })
        );
        socket.position.set((column - 1.5) * 0.52, 0.04, (row - 0.5) * 0.42);
        rack.add(socket);
      }
      const tools = new THREE.Group();
      rack.add(tools);
      this.threeScene?.add(panel.mesh, rack);
      this.playerViews.set(playerId, { playerId, side, panel, rack, tools });
    });
  }

  private updatePlayerPanels(state: RoulettePublicState): void {
    const names = Object.fromEntries(
      (this.latestState?.room?.players ?? []).map((player) => [player.id, player.name])
    );
    for (const [playerId, view] of this.playerViews) {
      const { context, canvas, texture } = view.panel;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const active = state.currentPlayerId === playerId && state.stage === "duel";
      const winner = state.winnerPlayerId === playerId;
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, active ? "rgba(106,64,12,.96)" : "rgba(8,11,15,.94)");
      gradient.addColorStop(1, winner ? "rgba(12,100,62,.96)" : "rgba(8,12,17,.88)");
      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 34);
      context.fill();
      context.strokeStyle = winner ? "#62f2aa" : active ? "#f2bf56" : "#665338";
      context.lineWidth = active || winner ? 9 : 5;
      context.stroke();

      context.fillStyle = colors.ivory;
      context.font = "800 64px Arial, sans-serif";
      context.textAlign = view.side < 0 ? "left" : "right";
      const textX = view.side < 0 ? 52 : canvas.width - 52;
      context.fillText(names[playerId] ?? playerId, textX, 88);
      context.fillStyle = active ? "#ffd66f" : "#8e988f";
      context.font = "700 28px Arial, sans-serif";
      context.fillText(active ? "● ACTIVE" : winner ? "◆ WINNER" : "○ STANDBY", textX, 132);

      const health = state.healthByPlayer[playerId] ?? 0;
      const startX = view.side < 0 ? 64 : canvas.width - 64;
      const direction = view.side < 0 ? 1 : -1;
      for (let index = 0; index < state.maxHealth; index += 1) {
        const x = startX + direction * index * 56;
        context.beginPath();
        context.arc(x, 208, 19, 0, Math.PI * 2);
        context.fillStyle = index < health ? "#d72f49" : "#242930";
        context.fill();
        context.lineWidth = 5;
        context.strokeStyle = index < health ? "#ff8495" : "#4f5762";
        context.stroke();
      }

      const wins = state.duelWinsByPlayer[playerId] ?? 0;
      for (let index = 0; index < state.duelWinsRequired; index += 1) {
        const x = view.side < 0 ? canvas.width - 72 - index * 52 : 72 + index * 52;
        context.save();
        context.translate(x, 210);
        context.rotate(Math.PI / 4);
        context.fillStyle = index < wins ? "#f4c65a" : "#2b3037";
        context.fillRect(-14, -14, 28, 28);
        context.restore();
      }
      texture.needsUpdate = true;
    }
  }

  private updateToolRacks(state: RoulettePublicState): void {
    for (const [playerId, view] of this.playerViews) {
      clearGroup(view.tools);
      const tools = state.visibleToolsByPlayer[playerId] ?? [];
      tools.slice(0, 8).forEach((item, index) => {
        const token = this.createToolToken(item);
        const column = index % 4;
        const row = Math.floor(index / 4);
        token.position.set((column - 1.5) * 0.52, 0.16, (row - 0.5) * 0.42);
        token.scale.setScalar(0.2);
        view.tools.add(token);
      });
    }
  }

  private updateTerminal(state: RoulettePublicState): void {
    if (!this.terminalSurface) {
      return;
    }
    const names = Object.fromEntries(
      (this.latestState?.room?.players ?? []).map((player) => [player.id, player.name])
    );
    const { context, canvas, texture } = this.terminalSurface;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#020705";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#5affba";
    context.lineWidth = 10;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = "#9effcf";
    context.font = "800 48px monospace";
    context.textAlign = "left";
    context.fillText("FATE TABLE // " + String(state.duelNumber).padStart(2, "0"), 46, 68);

    const players = state.playerOrder.slice(0, 2);
    players.forEach((playerId, playerIndex) => {
      const y = 150 + playerIndex * 112;
      context.fillStyle = "#bafdd7";
      context.font = "700 34px monospace";
      context.fillText((names[playerId] ?? playerId).slice(0, 12), 48, y);
      const health = state.healthByPlayer[playerId] ?? 0;
      for (let index = 0; index < state.maxHealth; index += 1) {
        context.beginPath();
        context.arc(370 + index * 48, y - 11, 16, 0, Math.PI * 2);
        context.fillStyle = index < health ? "#ff405c" : "#26332e";
        context.fill();
      }
      context.font = "800 42px monospace";
      context.fillStyle = "#f2cf70";
      context.fillText(String(state.duelWinsByPlayer[playerId] ?? 0), 720, y);
    });

    const live = state.liveShellsRemaining;
    const blank = state.blankShellsRemaining;
    const total = live + blank;
    context.fillStyle = "#7bd9a8";
    context.font = "700 28px monospace";
    context.fillText("LOAD " + String(state.reloadNumber).padStart(2, "0"), 48, 408);
    for (let index = 0; index < total; index += 1) {
      context.beginPath();
      context.arc(316 + index * 58, 397, 18, 0, Math.PI * 2);
      context.fillStyle = index < live ? "#ef4055" : "#718095";
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = index < live ? "#ff9ba8" : "#bac2cc";
      context.stroke();
    }
    texture.needsUpdate = true;
  }

  private updatePrompt(state: RoulettePublicState): void {
    if (!this.promptSurface) {
      return;
    }
    const language = this.latestState?.room?.language ?? "zh-CN";
    const names = Object.fromEntries(
      (this.latestState?.room?.players ?? []).map((player) => [player.id, player.name])
    );
    const activeId = currentPlayerId(state);
    const winnerId = state.winnerPlayerId;
    const label = winnerId
      ? (names[winnerId] ?? winnerId) + (language === "zh-CN" ? " // 整场胜出" : " // MATCH WON")
      : state.stage === "intermission"
        ? language === "zh-CN" ? "本盘结束 // 终端结算" : "DUEL COMPLETE // STATUS"
        : (names[activeId ?? ""] ?? activeId ?? "-")
          + (language === "zh-CN" ? " // 正在决策" : " // DECIDING");
    const { context, canvas, texture } = this.promptSurface;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.17, "rgba(5,8,11,.88)");
    gradient.addColorStop(0.83, "rgba(5,8,11,.88)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 12, canvas.width, canvas.height - 24);
    context.fillStyle = colors.ivory;
    context.font = "800 38px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(label, canvas.width / 2, 78);
    texture.needsUpdate = true;
  }

  private updateShellSlots(state: RoulettePublicState): void {
    const total = state.liveShellsRemaining + state.blankShellsRemaining;
    this.chamberSlots.forEach((slot, index) => {
      const occupied = index < total;
      slot.material.color.setHex(occupied ? 0xb98736 : 0x12161c);
      slot.material.emissive.setHex(occupied ? 0x351700 : 0x000000);
      slot.material.emissiveIntensity = occupied ? 0.42 : 0;
    });
  }

  private updateTableMood(state: RoulettePublicState): void {
    if (!this.tableRimMaterial) {
      return;
    }
    const activeIndex = Math.max(0, state.playerOrder.indexOf(state.currentPlayerId ?? ""));
    const color = state.stage === "resolved"
      ? 0x1b9c66
      : activeIndex === 0 ? 0x8a4615 : 0x0a6784;
    this.tableRimMaterial.emissive.setHex(color);
    this.tableRimMaterial.emissiveIntensity = state.stage === "duel" ? 0.52 : 0.8;
  }

  private animateReload(state: RoulettePublicState, now: number): void {
    this.setCamera("crate", 7_000, now);
    this.spinVelocity = Math.max(this.spinVelocity, 9);
    this.accentPulse = 1;
    this.crateAnimationStartedAt = now + 320;
    this.crateAnimationEndsAt = now + 6_850;
    let flightIndex = 0;
    for (const playerId of state.playerOrder) {
      const previous = this.previousToolsByPlayer[playerId] ?? [];
      const next = state.visibleToolsByPlayer[playerId] ?? [];
      for (const addition of itemAdditions(previous, next)) {
        this.launchTool(
          addition.item,
          new THREE.Vector3(-2.05 + (flightIndex % 2) * 0.18, -0.05, 1.25),
          this.toolSlotWorld(playerId, addition.index),
          now + 1_020 + flightIndex * 210,
          4_200,
          false
        );
        flightIndex += 1;
      }
    }
  }

  private animateItemUse(
    event: Extract<RouletteActionEvent, { kind: "item" }>,
    state: RoulettePublicState,
    now: number
  ): void {
    const previous = this.previousToolsByPlayer[event.playerId] ?? [];
    const sourceIndex = Math.max(0, previous.indexOf(event.item));
    const from = this.toolSlotWorld(event.playerId, sourceIndex);
    const rival = state.playerOrder.find((playerId) => playerId !== event.playerId);
    let to = new THREE.Vector3(0, 0.2, 0);
    let mode: CameraMode = "device";
    if (event.item === "lens") {
      to = new THREE.Vector3(3.35, 0.3, -1.65);
      mode = "terminal";
    } else if (event.item === "field_dress") {
      to = this.playerPanelWorld(event.playerId);
      mode = "wide";
    } else if (event.item === "restraint" && rival) {
      to = this.playerPanelWorld(rival);
      mode = "wide";
    }
    this.launchTool(event.item, from, to, now, 860, true);
    this.setCamera(mode, 1_850, now);
    this.accentPulse = 1;
    if (event.item === "extractor") {
      this.spinVelocity += 5;
    } else if (event.item === "inverter") {
      this.spinVelocity -= 7;
    }
  }

  private animateShot(
    event: Extract<RouletteActionEvent, { kind: "shot" }>,
    state: RoulettePublicState,
    now: number
  ): void {
    this.setCamera("device", 1_450, now);
    this.recoil = event.shell === "live" ? 1 : 0.32;
    this.flash = event.shell === "live" ? 1 : 0.12;
    this.impact = event.shell === "live" ? 1 : 0.25;
    this.spinVelocity += event.shell === "live" ? 2.4 : 0.9;
    this.queuedTerminalAt = now + 980;
    if (state.stage !== "duel") {
      this.queuedTerminalAt = now + 720;
    }
  }

  private launchTool(
    item: RouletteItem,
    from: THREE.Vector3,
    to: THREE.Vector3,
    startAt: number,
    duration: number,
    fadeAtEnd: boolean
  ): void {
    if (!this.threeScene) {
      return;
    }
    const object = this.createToolToken(item);
    object.position.copy(from);
    object.scale.setScalar(0.24);
    object.visible = false;
    this.threeScene.add(object);
    this.toolFlights.push({ object, from, to, startAt, duration, fadeAtEnd });
  }

  private createToolToken(item: RouletteItem): THREE.Group {
    const group = new THREE.Group();
    const color = itemColors[item];
    const metal = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.18),
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.62
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.42, metalness: 0.68 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), dark);
    base.castShadow = true;
    group.add(base);

    if (item === "field_dress") {
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.2), metal);
      horizontal.position.y = 0.12;
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.62), metal);
      vertical.position.y = 0.12;
      group.add(horizontal, vertical);
    } else if (item === "lens") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 8, 20), metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.13;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), dark);
      handle.position.set(0.28, 0.13, 0.28);
      handle.rotation.y = Math.PI / 4;
      group.add(ring, handle);
    } else if (item === "extractor") {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.64), metal);
      handle.position.y = 0.13;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.16), metal);
      head.position.set(0, 0.13, -0.22);
      group.add(handle, head);
    } else if (item === "restraint") {
      for (const x of [-0.2, 0.2]) {
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 7, 18), metal);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(x, 0.13, 0);
        group.add(cuff);
      }
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), metal);
      link.position.y = 0.13;
      group.add(link);
    } else if (item === "overcharge") {
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 12), metal);
      core.rotation.z = Math.PI / 2;
      core.position.y = 0.14;
      group.add(core);
      for (const x of [-0.18, 0, 0.18]) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 7, 16), metal);
        coil.rotation.y = Math.PI / 2;
        coil.position.set(x, 0.14, 0);
        group.add(coil);
      }
    } else {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.12), metal);
      bar.position.y = 0.13;
      group.add(bar);
      for (const x of [-0.31, 0.31]) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 12), metal);
        arrow.position.set(x, 0.13, 0);
        arrow.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(arrow);
      }
    }
    return group;
  }

  private toolSlotWorld(playerId: string, index: number): THREE.Vector3 {
    const view = this.playerViews.get(playerId);
    const side = view?.side ?? -1;
    const column = index % 4;
    const row = Math.floor(index / 4);
    return new THREE.Vector3(
      side * 3.55 + (column - 1.5) * 0.52,
      -0.39,
      1.24 + (row - 0.5) * 0.42
    );
  }

  private playerPanelWorld(playerId: string): THREE.Vector3 {
    const side = this.playerViews.get(playerId)?.side ?? -1;
    return new THREE.Vector3(side * 3.6, 1.0, 1.55);
  }

  private setCamera(mode: CameraMode, duration: number, now = performance.now()): void {
    this.cameraMode = mode;
    this.cameraFocusUntil = now + duration;
  }

  private updateCamera(now: number, dt: number): void {
    if (!this.threeCamera) {
      return;
    }
    if (this.queuedTerminalAt > 0 && now >= this.queuedTerminalAt) {
      this.queuedTerminalAt = 0;
      this.setCamera("terminal", 1_850, now);
    } else if (now >= this.cameraFocusUntil && this.cameraMode !== "wide") {
      this.cameraMode = "wide";
    }

    const targets: Record<CameraMode, { position: THREE.Vector3; look: THREE.Vector3 }> = {
      wide: {
        position: new THREE.Vector3(0, 5.4, 8.6),
        look: new THREE.Vector3(0, -0.62, -0.05)
      },
      device: {
        position: new THREE.Vector3(1.85, 1.4, 2.75),
        look: new THREE.Vector3(0, -0.5, -0.45)
      },
      terminal: {
        position: new THREE.Vector3(4.65, 0.72, -0.18),
        look: new THREE.Vector3(3.45, -0.15, -2.35)
      },
      crate: {
        position: new THREE.Vector3(-0.15, 3.15, 3.2),
        look: new THREE.Vector3(-1.82, -0.43, 1.16)
      }
    };
    const target = targets[this.cameraMode];
    const factor = 1 - Math.exp(-3.4 * dt);
    this.threeCamera.position.lerp(target.position, factor);
    this.cameraLook.lerp(target.look, factor);
    if (this.impact > 0.02) {
      const strength = this.impact * 0.035;
      this.threeCamera.position.x += (Math.random() - 0.5) * strength;
      this.threeCamera.position.y += (Math.random() - 0.5) * strength;
    }
    this.threeCamera.lookAt(this.cameraLook);
    const showTableUi = this.cameraMode === "wide" || this.cameraMode === "crate";
    for (const view of this.playerViews.values()) {
      view.panel.mesh.visible = showTableUi;
      view.rack.visible = showTableUi;
    }
    if (this.promptSurface) {
      this.promptSurface.mesh.visible = this.cameraMode !== "terminal";
    }
  }

  private updateEnvironment(seconds: number, dt: number): void {
    this.impact *= Math.exp(-7.5 * dt);
    this.accentPulse *= Math.exp(-3.4 * dt);
    if (this.dealerGroup) {
      this.dealerGroup.position.y = 0.15 + Math.sin(seconds * 0.85) * 0.045;
      this.dealerGroup.rotation.y = Math.sin(seconds * 0.35) * 0.04;
    }
    if (this.dealerEyeMaterial) {
      this.dealerEyeMaterial.emissiveIntensity = 1.9 + Math.sin(seconds * 2.2) * 0.35 + this.accentPulse * 1.8;
    }
    if (this.terminalGlow) {
      this.terminalGlow.intensity = 2.4 + Math.sin(seconds * 1.8) * 0.45 + (this.cameraMode === "terminal" ? 2 : 0);
    }
    const terminalTarget = this.cameraMode === "terminal" ? 1 : 0;
    this.terminalFocusAmount += (terminalTarget - this.terminalFocusAmount) * (1 - Math.exp(-4.5 * dt));
    if (this.terminalGroup) {
      this.terminalGroup.position.set(
        THREE.MathUtils.lerp(3.55, 2.35, this.terminalFocusAmount),
        THREE.MathUtils.lerp(-0.18, 0.32, this.terminalFocusAmount),
        THREE.MathUtils.lerp(-2.4, -0.85, this.terminalFocusAmount)
      );
      this.terminalGroup.rotation.y = THREE.MathUtils.lerp(-0.25, -0.08, this.terminalFocusAmount);
      this.terminalGroup.scale.setScalar(1 + this.terminalFocusAmount * 1.05);
    }
    if (this.tableRimMaterial) {
      this.tableRimMaterial.emissiveIntensity = 0.34 + this.accentPulse * 1.2 + Math.sin(seconds * 1.2) * 0.08;
    }
    if (this.dangerLight) {
      this.dangerLight.intensity = this.impact * 16;
    }
    if (this.dust) {
      this.dust.rotation.y += dt * 0.018;
      this.dust.position.y = Math.sin(seconds * 0.2) * 0.08;
    }
  }

  private updateDevice(seconds: number, dt: number): void {
    this.spinVelocity *= Math.exp(-2.9 * dt);
    this.recoil *= Math.exp(-10 * dt);
    this.flash *= Math.exp(-15 * dt);
    const focusTarget = this.cameraMode === "device" ? 1 : 0;
    this.deviceFocusAmount += (focusTarget - this.deviceFocusAmount) * (1 - Math.exp(-5 * dt));
    if (this.chamberGroup) {
      this.chamberGroup.rotation.y += dt * (0.3 + this.spinVelocity);
    }
    if (this.deviceGroup) {
      this.deviceGroup.position.y = -0.48 + Math.sin(seconds * 1.1) * 0.018;
      this.deviceGroup.position.z = 0.2 + this.recoil * 0.34;
      this.deviceGroup.rotation.z = Math.sin(seconds * 0.62) * 0.012;
      this.deviceGroup.rotation.x = -this.recoil * 0.035;
      this.deviceGroup.scale.setScalar(0.74 + this.deviceFocusAmount * 0.22);
    }
    if (this.muzzleFlash && this.muzzleLight) {
      this.muzzleFlash.visible = this.flash > 0.02;
      this.muzzleFlash.material.opacity = Math.min(1, this.flash);
      this.muzzleFlash.scale.setScalar(0.55 + this.flash * 1.55);
      this.muzzleLight.intensity = this.flash * 24;
    }
    if (this.deviceAccent) {
      this.deviceAccent.emissiveIntensity = 0.32 + this.accentPulse * 2.4;
    }
  }

  private updateCrate(now: number): void {
    if (!this.crateLid || !this.crateLight) {
      return;
    }
    let openness = 0;
    if (
      now >= this.crateAnimationStartedAt
      && now < this.crateAnimationEndsAt
      && this.crateAnimationStartedAt >= 0
    ) {
      const elapsed = now - this.crateAnimationStartedAt;
      if (elapsed < 760) {
        openness = smooth(elapsed / 760);
      } else if (elapsed < 5_650) {
        openness = 1;
      } else {
        openness = 1 - smooth((elapsed - 5_650) / 900);
      }
    }
    this.crateLid.rotation.x = -1.45 * openness;
    this.crateLight.intensity = openness * 11;
  }

  private updateToolFlights(now: number): void {
    const remaining: ToolFlight[] = [];
    for (const flight of this.toolFlights) {
      const raw = (now - flight.startAt) / flight.duration;
      if (raw < 0) {
        flight.object.visible = false;
        remaining.push(flight);
        continue;
      }
      flight.object.visible = true;
      const progress = smooth(raw);
      flight.object.position.lerpVectors(flight.from, flight.to, progress);
      flight.object.position.y += Math.sin(progress * Math.PI) * 1.55;
      flight.object.rotation.y = progress * Math.PI * 3;
      flight.object.rotation.x = progress * Math.PI * 0.8;
      const scale = 0.24 + Math.sin(progress * Math.PI) * 0.12;
      flight.object.scale.setScalar(scale);
      if (flight.fadeAtEnd) {
        setObjectOpacity(flight.object, 1 - smooth((progress - 0.72) / 0.28));
      }
      if (raw >= 1) {
        this.threeScene?.remove(flight.object);
        disposeObject(flight.object);
      } else {
        remaining.push(flight);
      }
    }
    this.toolFlights = remaining;
  }

  private drawFallback(state: RoulettePublicState | undefined): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor(colors.background);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x14080c, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(colors.table, 1);
    graphics.fillPoints([
      new Phaser.Geom.Point(width * 0.12, height * 0.28),
      new Phaser.Geom.Point(width * 0.88, height * 0.28),
      new Phaser.Geom.Point(width * 0.98, height * 0.92),
      new Phaser.Geom.Point(width * 0.02, height * 0.92)
    ], true);
    graphics.lineStyle(8, colors.brass, 0.72);
    graphics.strokePoints([
      new Phaser.Geom.Point(width * 0.12, height * 0.28),
      new Phaser.Geom.Point(width * 0.88, height * 0.28),
      new Phaser.Geom.Point(width * 0.98, height * 0.92),
      new Phaser.Geom.Point(width * 0.02, height * 0.92)
    ], true, true);
    graphics.fillStyle(0x151a21, 1);
    graphics.fillRoundedRect(width * 0.42, height * 0.42, width * 0.16, height * 0.32, 22);
    graphics.fillStyle(colors.red, 1);
    graphics.fillRoundedRect(width * 0.46, height * 0.65, width * 0.08, height * 0.2, 14);
    graphics.fillStyle(0x0a0d12, 1);
    graphics.fillRoundedRect(width * 0.68, height * 0.34, width * 0.2, height * 0.14, 16);

    if (!state) {
      return;
    }
    const names = Object.fromEntries(
      (this.latestState?.room?.players ?? []).map((player) => [player.id, player.name])
    );
    state.playerOrder.slice(0, 2).forEach((playerId, index) => {
      const x = index === 0 ? width * 0.04 : width * 0.72;
      const y = height * 0.1;
      graphics.fillStyle(0x090c11, 0.95);
      graphics.fillRoundedRect(x, y, width * 0.24, height * 0.16, 20);
      this.add.text(x + 24, y + 18, names[playerId] ?? playerId, {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color: colors.ivory
      });
      const health = state.healthByPlayer[playerId] ?? 0;
      for (let point = 0; point < state.maxHealth; point += 1) {
        graphics.fillStyle(point < health ? colors.live : 0x30343a, 1);
        graphics.fillCircle(x + 34 + point * 34, y + 86, 11);
      }
      const tools = state.visibleToolsByPlayer[playerId] ?? [];
      tools.forEach((item, toolIndex) => {
        graphics.fillStyle(itemColors[item], 1);
        graphics.fillCircle(x + 34 + toolIndex * 30, y + 124, 8);
      });
    });
  }

  private handleResize(): void {
    this.resizeThree();
    if (!this.threeRenderer) {
      this.drawFallback(this.latestState?.game?.state as RoulettePublicState | undefined);
    }
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

  private cleanupThree(): void {
    const parent = this.game?.canvas?.parentElement;
    for (const flight of this.toolFlights) {
      this.threeScene?.remove(flight.object);
      disposeObject(flight.object);
    }
    this.toolFlights = [];
    if (this.threeScene) {
      disposeObject(this.threeScene);
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
    this.tableGroup = undefined;
    this.tableRimMaterial = undefined;
    this.dangerLight = undefined;
    this.deviceGroup = undefined;
    this.chamberGroup = undefined;
    this.chamberSlots = [];
    this.muzzleFlash = undefined;
    this.muzzleLight = undefined;
    this.deviceAccent = undefined;
    this.terminalGroup = undefined;
    this.terminalSurface = undefined;
    this.terminalGlow = undefined;
    this.terminalFocusAmount = 0;
    this.crateGroup = undefined;
    this.crateLid = undefined;
    this.crateLight = undefined;
    this.promptSurface = undefined;
    this.playerViews.clear();
    this.previousToolsByPlayer = {};
    this.dealerGroup = undefined;
    this.dealerEyeMaterial = undefined;
    this.dust = undefined;
    this.deviceFocusAmount = 0;
    this.lastEventNumber = -1;
    this.lastReloadNumber = -1;
  }
}

export const hostGame = {
  id: rouletteManifest.id,
  displayName: rouletteManifest.displayName,
  sceneKey: rouletteManifest.hostView,
  scene: RouletteHostScene
} as const;
