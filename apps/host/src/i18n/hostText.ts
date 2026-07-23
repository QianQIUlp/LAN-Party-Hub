// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import {
  defaultLanguage,
  normalizeLanguage,
  type RoomLifecycle,
  type SupportedLanguage
} from "@open-party-lab/protocol";

const languagePreferenceKey = "open-party-lab.host-language";

export function readStoredHostLanguage(): SupportedLanguage {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return defaultLanguage;
  }

  return normalizeLanguage(window.localStorage.getItem(languagePreferenceKey));
}

export function writeStoredHostLanguage(language: SupportedLanguage): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(languagePreferenceKey, language);
}

export interface HostText {
  languageLabel: string;
  phoneController: string;
  showPhoneController: string;
  hide: string;
  fullscreen: string;
  exitFullscreen: string;
  fpsLabel: string;
  hostControlsTitle: string;
  hostControlsSubtitle: string;
  close: string;
  noGame: string;
  connected: string;
  waitingForRoom: string;
  offline: string;
  connectionMissing: string;
  players: string;
  playerRange: (min: number, max: number) => string;
  needsPlayers: (min: number) => string;
  tooManyPlayers: (max: number) => string;
  estimatedMinutes: (minutes: number) => string;
  contentScale: (rating: "family" | "optional-adult" | undefined) => string;
  selected: string;
  lobby: string;
  connectedShort: string;
  noPlayersJoined: string;
  noPlayersConnected: string;
  roomListPending: string;
  moderationAllowed: string;
  moderationLocked: string;
  ready: string;
  waiting: string;
  reconnecting: string;
  notReady: string;
  kick: string;
  kickPlayer: (name: string) => string;
  roomCode: string;
  join: string;
  lobbyTitle: string;
  lobbyPlayersTitle: string;
  quickStartTitle: string;
  quickStartLines: string[];
  gameSelectionFallback: string;
  gameSelectRoundActiveSubtitle: string;
  gameSelectAutoReadySubtitle: string;
  gameSelectClassicSubtitle: string;
  playerStatusTitle: string;
  noActiveGameTitle: string;
  noActiveGameSelectLine: string;
  noActiveGameRoundActiveLine: string;
  noActiveGameStartLine: string;
  playersConnected: (count: number, max: number) => string;
  activeRoundLockedLine: string;
  arenaNeedsCharacterLine: string;
  autoReadyLine: string;
  spaceStartLine: string;
  setupControlsLine: string;
  minionsSetupLine: string;
  arenaContinuesLine: string;
  arenaReadyLine: string;
  afterRoundSwitchLine: string;
  autoStartsWhenReadyLine: string;
  readyVisibleLine: string;
  setupFollowsTitle: string;
  readyToStartTitle: string;
  characterSelecting: string;
  morePlayers: (count: number) => string;
  errorLabel: string;
  roundFallbackTitle: string;
  roundFallbackMessage: string;
  roomPrefix: string;
  hostCreatingRoom: string;
  hostConnecting: string;
  scanQr: string;
  joinAddress: string;
  joinAddressHint: string;
  noLanAddress: string;
  hostPageHint: string;
  serverOnline: string;
  serverOffline: string;
  scoreTotal: string;
  noPoints: string;
  roundEndTitle: string;
  readyNextTitle: string;
  scoreboardTitle: string;
  gameCompleted: (gameName: string) => string;
  roundCompleted: string;
  nextAutoHint: string;
  nextSpaceHint: string;
  lifecycle: (phase: RoomLifecycle | string) => string;
}

const hostText = {
  "zh-CN": {
    languageLabel: "语言",
    phoneController: "手机控制器",
    showPhoneController: "显示手机控制器",
    hide: "隐藏",
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    fpsLabel: "帧率",
    hostControlsTitle: "主机控制",
    hostControlsSubtitle: "帧率、语言、玩家",
    close: "关闭",
    noGame: "未选择游戏",
    connected: "已连接",
    waitingForRoom: "正在等待房间",
    offline: "离线",
    connectionMissing: "连接中断",
    players: "玩家",
    playerRange: (min: number, max: number) => `${min}–${max} 人`,
    needsPlayers: (min: number) => `至少需要 ${min} 人`,
    tooManyPlayers: (max: number) => `最多支持 ${max} 人`,
    estimatedMinutes: (minutes: number) => `约 ${minutes} 分钟`,
    contentScale: (rating) => rating === "optional-adult" ? "全年龄默认 · 成人可选" : "全年龄",
    selected: "已选择",
    lobby: "大厅",
    connectedShort: "在线",
    noPlayersJoined: "还没有玩家加入。",
    noPlayersConnected: "还没有玩家在线。",
    roomListPending: "房间创建后，玩家列表会显示在这里。",
    moderationAllowed: "可在大厅或两局之间移除玩家。",
    moderationLocked: "游戏进行中不能移除玩家。",
    ready: "已准备",
    waiting: "等待中",
    reconnecting: "重连中",
    notReady: "未准备",
    kick: "移除",
    kickPlayer: (name: string) => `移除玩家 ${name}`,
    roomCode: "房间码",
    join: "加入",
    lobbyTitle: "派对大厅",
    lobbyPlayersTitle: "大厅玩家",
    quickStartTitle: "快速开始",
    quickStartLines: ["点击游戏卡或按数字键选择游戏。", "所有人准备后自动开始，部分游戏可按空格开始。"],
    gameSelectionFallback: "选择游戏",
    gameSelectRoundActiveSubtitle: "当前游戏仍在进行，结束前不能切换或重新开始。",
    gameSelectAutoReadySubtitle: "用鼠标或数字键切换游戏；所有人准备后自动开始。",
    gameSelectClassicSubtitle: "用鼠标或数字键切换游戏；准备完成后按空格开始。",
    playerStatusTitle: "玩家状态",
    noActiveGameTitle: "尚未选择游戏",
    noActiveGameSelectLine: "请从上方选择一张游戏卡。",
    noActiveGameRoundActiveLine: "当前一局仍在进行，结束后可以选择其他游戏。",
    noActiveGameStartLine: "选好后，游戏会在所有人准备后自动开始，或由主机按空格开始。",
    playersConnected: (count: number, max: number) => `在线玩家：${count}/${max}`,
    activeRoundLockedLine: "当前一局正在进行，游戏列表暂时锁定。",
    arenaNeedsCharacterLine: "所有玩家需要先选择角色。",
    autoReadyLine: "所有玩家都需要在手机上点击准备。",
    spaceStartLine: "人数足够且准备完成后，按空格开始。",
    setupControlsLine: "可在这里设置本局选项。",
    minionsSetupLine: "可设置地图、生命和初始金币。",
    arenaContinuesLine: "返回主菜单不会暂停当前生存挑战。",
    arenaReadyLine: "所有人选好角色并准备后开始。",
    afterRoundSwitchLine: "本局结束后可自由切换游戏。",
    autoStartsWhenReadyLine: "所有人再次准备后，下一局自动开始。",
    readyVisibleLine: "准备与开始状态会一直显示在这里。",
    setupFollowsTitle: "下一步：设置",
    readyToStartTitle: "可以开始",
    characterSelecting: "正在选择角色",
    morePlayers: (count: number) => `另有 ${count} 名玩家`,
    errorLabel: "错误",
    roundFallbackTitle: "本局",
    roundFallbackMessage: "马上开始。",
    roomPrefix: "房间",
    hostCreatingRoom: "正在创建房间……",
    hostConnecting: "正在连接服务器……",
    scanQr: "用手机扫描二维码，或打开加入链接",
    joinAddress: "手机加入地址",
    joinAddressHint: "如果二维码无法访问，请切换到与手机同一 Wi‑Fi 的地址。",
    noLanAddress: "未检测到可供手机连接的局域网地址。请确认 Windows 网络设为“专用网络”、允许防火墙访问，并暂时关闭 VPN 或虚拟网卡后重启。",
    hostPageHint: "如果手机打开了主机画面，请重新扫描二维码。",
    serverOnline: "服务器在线",
    serverOffline: "服务器离线",
    scoreTotal: "总分",
    noPoints: "还没有得分。",
    roundEndTitle: "本局结束",
    readyNextTitle: "准备下一局",
    scoreboardTitle: "积分榜",
    gameCompleted: (gameName: string) => `${gameName} 已结束。`,
    roundCompleted: "本局已结束。",
    nextAutoHint: "所有人再次准备后，下一局自动开始。",
    nextSpaceHint: "空格键 = 下一局",
    lifecycle: (phase: RoomLifecycle | string) => {
      switch (phase) {
        case "lobby": return "大厅";
        case "game_selected": return "已选择游戏";
        case "round_intro": return "准备";
        case "countdown": return "倒计时";
        case "playing": return "游戏中";
        case "locked": return "已锁定";
        case "result": return "结果";
        case "scoreboard": return "积分榜";
        case "finished": return "已结束";
        default: return phase;
      }
    }
  },
  de: {
    languageLabel: "Sprache",
    phoneController: "Handy-Controller",
    showPhoneController: "Handy-Controller anzeigen",
    hide: "Verstecken",
    fullscreen: "Vollbild",
    exitFullscreen: "Vollbild beenden",
    fpsLabel: "FPS",
    hostControlsTitle: "Host-Steuerung",
    hostControlsSubtitle: "FPS, Sprache, Spieler",
    close: "Schliessen",
    noGame: "Kein Spiel",
    connected: "Verbunden",
    waitingForRoom: "Warte auf Raum",
    offline: "Offline",
    connectionMissing: "Verbindung fehlt",
    players: "Spieler",
    playerRange: (min: number, max: number) => `${min}-${max} Spieler`,
    needsPlayers: (min: number) => `Mindestens ${min} Spieler`,
    tooManyPlayers: (max: number) => `Maximal ${max} Spieler`,
    estimatedMinutes: (minutes: number) => `ca. ${minutes} Min.`,
    contentScale: (rating) => rating === "optional-adult" ? "Familie · Erwachsene optional" : "Familie",
    selected: "Ausgewaehlt",
    lobby: "Lobby",
    connectedShort: "verbunden",
    noPlayersJoined: "Noch keine Spieler beigetreten.",
    noPlayersConnected: "Noch keine Spieler verbunden.",
    roomListPending: "Sobald ein Raum da ist, erscheint die Liste hier.",
    moderationAllowed: "Spieler koennen im Lobby- oder Zwischenrunden-Zustand entfernt werden.",
    moderationLocked: "Waehrend einer aktiven Runde ist Kicken gesperrt.",
    ready: "bereit",
    waiting: "wartet",
    reconnecting: "verbindet neu",
    notReady: "nicht bereit",
    kick: "Kicken",
    kickPlayer: (name: string) => `Spieler ${name} kicken`,
    roomCode: "RAUMCODE",
    join: "Join",
    lobbyTitle: "Party Lobby",
    lobbyPlayersTitle: "Spieler in der Lobby",
    quickStartTitle: "Schnellstart",
    quickStartLines: [
      "Klick oder Zahlentaste waehlt ein Spiel.",
      "Start danach automatisch oder mit SPACE."
    ],
    gameSelectionFallback: "Spielauswahl",
    gameSelectRoundActiveSubtitle:
      "Die Spieluebersicht ist offen. Solange eine Runde laeuft, bleiben Auswahl und Start gesperrt.",
    gameSelectAutoReadySubtitle:
      "Spiel per Maus oder Zahlentaste wechseln. Ready-basierte Runden starten automatisch.",
    gameSelectClassicSubtitle:
      "Spiel per Maus oder Zahlentaste wechseln. Standard-Runden starten mit SPACE.",
    playerStatusTitle: "Spielerstatus",
    noActiveGameTitle: "Noch kein Spiel aktiv",
    noActiveGameSelectLine: "Waehle oben eine Spielkarte aus.",
    noActiveGameRoundActiveLine:
      "Die aktuelle Runde laeuft noch. Nach dem Ende kannst du hier wieder ein neues Spiel waehlen.",
    noActiveGameStartLine:
      "Danach startet die Runde je nach Spiel automatisch ueber Bereitschaft oder klassisch mit SPACE.",
    playersConnected: (count: number, max: number) => `Spieler verbunden: ${count}/${max}`,
    activeRoundLockedLine:
      "Aktive Runde laeuft gerade. Die Auswahl bleibt sichtbar, ist aber bis zum Rundenende gesperrt.",
    arenaNeedsCharacterLine: "Alle Spieler brauchen fuer Arena Survivor zuerst eine Charakterwahl.",
    autoReadyLine: "Alle Spieler muessen am Handy bereit sein.",
    spaceStartLine: "SPACE startet die Runde, sobald genug Spieler verbunden sind.",
    setupControlsLine: "Dieses Spiel hat Setup-Optionen, die direkt hier gesetzt werden.",
    minionsSetupLine: "MinionsTD nutzt ein Setup fuer Map, Leben und Startgeld.",
    arenaContinuesLine: "Arena Survivor laeuft weiter, auch wenn der Host ins Hauptmenue wechselt.",
    arenaReadyLine: "Nach der Charakterwahl startet die Runde ueber Bereitschaft.",
    afterRoundSwitchLine: "Nach dem Rundenende kannst du hier wieder frei umschalten.",
    autoStartsWhenReadyLine: "Sobald alle wieder bereit sind, startet die Runde automatisch.",
    readyVisibleLine: "Bereitschaft und Startstatus bleiben hier sichtbar.",
    setupFollowsTitle: "Setup folgt",
    readyToStartTitle: "Startbereit",
    characterSelecting: "Charakter waehlt noch",
    morePlayers: (count: number) => `+${count} weitere Spieler`,
    errorLabel: "Fehler",
    roundFallbackTitle: "Runde",
    roundFallbackMessage: "Gleich geht es los.",
    roomPrefix: "Raum",
    hostCreatingRoom: "Raum wird erstellt ...",
    hostConnecting: "Verbinde Host mit Server ...",
    scanQr: "QR scannen oder Link am Handy oeffnen",
    joinAddress: "Beitrittsadresse",
    joinAddressHint: "Wenn der QR-Code nicht erreichbar ist, waehle die Adresse im selben WLAN.",
    noLanAddress: "Keine lokale Netzwerkadresse fuer Handys gefunden. Privates Windows-Netzwerk, Firewall und VPN-Einstellungen pruefen und dann neu starten.",
    hostPageHint: "Wenn am Handy die Host-Seite erscheint, stattdessen den QR-Code oder Port 5174 nutzen.",
    serverOnline: "Server online",
    serverOffline: "Server offline",
    scoreTotal: "Gesamt",
    noPoints: "Noch keine Punkte.",
    roundEndTitle: "Rundenende",
    readyNextTitle: "Bereit fuer die naechste Runde",
    scoreboardTitle: "Scoreboard",
    gameCompleted: (gameName: string) => `${gameName} abgeschlossen.`,
    roundCompleted: "Runde abgeschlossen.",
    nextAutoHint: "Naechste Runde startet automatisch, sobald alle wieder bereit sind.",
    nextSpaceHint: "Leertaste = Naechste Runde",
    lifecycle: (phase: RoomLifecycle | string) => phase
  },
  en: {
    languageLabel: "Language",
    phoneController: "Phone Controller",
    showPhoneController: "Show phone controller",
    hide: "Hide",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    fpsLabel: "FPS",
    hostControlsTitle: "Host Controls",
    hostControlsSubtitle: "FPS, language, players",
    close: "Close",
    noGame: "No game",
    connected: "Connected",
    waitingForRoom: "Waiting for room",
    offline: "Offline",
    connectionMissing: "Connection missing",
    players: "Players",
    playerRange: (min: number, max: number) => `${min}-${max} players`,
    needsPlayers: (min: number) => `At least ${min} players`,
    tooManyPlayers: (max: number) => `Up to ${max} players`,
    estimatedMinutes: (minutes: number) => `about ${minutes} min`,
    contentScale: (rating) => rating === "optional-adult" ? "Family · adult optional" : "Family",
    selected: "Selected",
    lobby: "Lobby",
    connectedShort: "connected",
    noPlayersJoined: "No players have joined yet.",
    noPlayersConnected: "No players connected yet.",
    roomListPending: "The player list appears here once a room exists.",
    moderationAllowed: "Players can be removed in the lobby or between rounds.",
    moderationLocked: "Kicking is locked during an active round.",
    ready: "ready",
    waiting: "waiting",
    reconnecting: "reconnecting",
    notReady: "not ready",
    kick: "Kick",
    kickPlayer: (name: string) => `Kick player ${name}`,
    roomCode: "ROOM CODE",
    join: "Join",
    lobbyTitle: "Party Lobby",
    lobbyPlayersTitle: "Players in Lobby",
    quickStartTitle: "Quick Start",
    quickStartLines: [
      "Click or press a number key to pick a game.",
      "Then start automatically or with SPACE."
    ],
    gameSelectionFallback: "Game Selection",
    gameSelectRoundActiveSubtitle:
      "The game overview is open. While a round is running, selection and start stay locked.",
    gameSelectAutoReadySubtitle:
      "Switch games with the mouse or number keys. Ready-based rounds start automatically.",
    gameSelectClassicSubtitle:
      "Switch games with the mouse or number keys. Standard rounds start with SPACE.",
    playerStatusTitle: "Player Status",
    noActiveGameTitle: "No active game",
    noActiveGameSelectLine: "Select a game card above.",
    noActiveGameRoundActiveLine:
      "The current round is still running. Once it ends, you can choose a new game here.",
    noActiveGameStartLine:
      "After that, the round starts either through readiness or classically with SPACE.",
    playersConnected: (count: number, max: number) => `Players connected: ${count}/${max}`,
    activeRoundLockedLine:
      "An active round is running. The selection stays visible, but it is locked until the round ends.",
    arenaNeedsCharacterLine: "All players need to choose an Arena Survivor character first.",
    autoReadyLine: "All players need to be ready on their phones.",
    spaceStartLine: "SPACE starts the round once enough players are connected.",
    setupControlsLine: "This game has setup options that can be configured here.",
    minionsSetupLine: "Minions TD uses setup for map, lives, and starting gold.",
    arenaContinuesLine: "Arena Survivor keeps running when the host opens the main menu.",
    arenaReadyLine: "After character selection, the round starts through readiness.",
    afterRoundSwitchLine: "After the round ends, you can switch freely again.",
    autoStartsWhenReadyLine: "As soon as everyone is ready again, the round starts automatically.",
    readyVisibleLine: "Readiness and start status stay visible here.",
    setupFollowsTitle: "Setup Next",
    readyToStartTitle: "Ready to Start",
    characterSelecting: "Choosing character",
    morePlayers: (count: number) => `+${count} more players`,
    errorLabel: "Error",
    roundFallbackTitle: "Round",
    roundFallbackMessage: "Starting soon.",
    roomPrefix: "Room",
    hostCreatingRoom: "Creating room ...",
    hostConnecting: "Connecting host to server ...",
    scanQr: "Scan QR code or open the link on your phone",
    joinAddress: "Phone join address",
    joinAddressHint: "If the QR code is unreachable, choose the address on the same Wi-Fi as the phone.",
    noLanAddress: "No local network address for phones was detected. Check Windows private-network and firewall access, disable VPN or virtual adapters, then restart.",
    hostPageHint: "If the host page opens on the phone, use the QR code or port 5174 instead.",
    serverOnline: "Server online",
    serverOffline: "Server offline",
    scoreTotal: "Total",
    noPoints: "No points yet.",
    roundEndTitle: "Round End",
    readyNextTitle: "Ready for the next round",
    scoreboardTitle: "Scoreboard",
    gameCompleted: (gameName: string) => `${gameName} complete.`,
    roundCompleted: "Round complete.",
    nextAutoHint: "The next round starts automatically once everyone is ready again.",
    nextSpaceHint: "Space = Next round",
    lifecycle: (phase: RoomLifecycle | string) => {
      switch (phase) {
        case "lobby":
          return "lobby";
        case "game_selected":
          return "game selected";
        case "round_intro":
          return "intro";
        case "countdown":
          return "countdown";
        case "playing":
          return "playing";
        case "locked":
          return "locked";
        case "result":
          return "result";
        case "scoreboard":
          return "scoreboard";
        case "finished":
          return "finished";
        default:
          return phase;
      }
    }
  }
} satisfies Record<SupportedLanguage, HostText>;

export function getHostText(language: SupportedLanguage | null | undefined): HostText {
  return hostText[normalizeLanguage(language)];
}
