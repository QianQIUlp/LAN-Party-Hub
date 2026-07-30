export type Locale = "en" | "zh";

interface FactCopy {
  label: string;
  value: string;
  detail: string;
}

interface StepCopy {
  label: string;
  title: string;
  body: string;
  note: string;
}

export interface GameCopy {
  id: string;
  glyph: string;
  tone: "cyan" | "mint" | "violet" | "amber" | "rose" | "blue" | "orange" | "lime";
  name: string;
  description: string;
  players: string;
  duration: string;
}

interface ArchitectureNodeCopy {
  kind: string;
  title: string;
  body: string;
}

interface BoundaryCopy {
  title: string;
  body: string;
}

export interface SiteCopy {
  meta: {
    title: string;
    description: string;
  };
  skipLink: string;
  homeLabel: string;
  languageLabel: string;
  navigation: {
    aria: string;
    workflow: string;
    games: string;
    architecture: string;
    source: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleEmphasis: string;
    body: string;
    downloadAction: string;
    sourceAction: string;
    releaseNote: string;
  };
  demo: {
    aria: string;
    title: string;
    status: string;
    roomLabel: string;
    roomCode: string;
    screenTitle: string;
    screenHint: string;
    connected: string;
    playerOne: string;
    playerTwo: string;
    ready: string;
    phoneLabel: string;
    phoneActionOne: string;
    phoneActionTwo: string;
    caption: string;
  };
  factsLabel: string;
  facts: readonly FactCopy[];
  workflow: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: readonly StepCopy[];
  };
  games: {
    eyebrow: string;
    title: string;
    intro: string;
    count: string;
    playersLabel: string;
    durationLabel: string;
    items: readonly GameCopy[];
  };
  architecture: {
    eyebrow: string;
    title: string;
    intro: string;
    nodes: readonly ArchitectureNodeCopy[];
    note: string;
    docsAction: string;
  };
  boundary: {
    eyebrow: string;
    title: string;
    intro: string;
    items: readonly BoundaryCopy[];
  };
  source: {
    eyebrow: string;
    title: string;
    body: string;
    repositoryAction: string;
    releaseAction: string;
    statusLabel: string;
    statusValue: string;
    licenseLabel: string;
    licenseValue: string;
    platformLabel: string;
    platformValue: string;
  };
  footer: {
    tagline: string;
    status: string;
    repository: string;
    documentation: string;
    notices: string;
    license: string;
  };
  notFound: {
    eyebrow: string;
    title: string;
    body: string;
    homeAction: string;
    chineseAction: string;
  };
}

export const links = {
  repository: "https://github.com/QianQIUlp/LAN-Party-Hub",
  releases: "https://github.com/QianQIUlp/LAN-Party-Hub/releases/latest",
  documentation: "https://github.com/QianQIUlp/LAN-Party-Hub/tree/main/docs",
  architecture: "https://github.com/QianQIUlp/LAN-Party-Hub/blob/main/docs/architecture.md",
  notices: "https://github.com/QianQIUlp/LAN-Party-Hub/blob/main/NOTICE.md",
  license: "https://github.com/QianQIUlp/LAN-Party-Hub/blob/main/LICENSE"
} as const;

export const siteCopy = {
  en: {
    meta: {
      title: "LAN Party Hub — One computer, every phone is a controller",
      description:
        "An open-source, local-first browser party game hub for Windows. Put the shared screen on one PC and let friends join from their phones over the same Wi-Fi."
    },
    skipLink: "Skip to content",
    homeLabel: "LAN Party Hub home",
    languageLabel: "中文",
    navigation: {
      aria: "Primary navigation",
      workflow: "How it works",
      games: "Games",
      architecture: "Architecture",
      source: "Source"
    },
    hero: {
      eyebrow: "LOCAL-FIRST · 8 BUILT-IN GAMES · OPEN SOURCE",
      titleLead: "One computer.",
      titleEmphasis: "Every phone is a controller.",
      body:
        "LAN Party Hub turns a Windows PC into the shared screen and authoritative game server. Friends scan a QR code on the same Wi-Fi—no accounts, cloud service, or internet connection required.",
      downloadAction: "Download for Windows",
      sourceAction: "Inspect the source",
      releaseNote: "Public alpha. The portable Windows build is currently unsigned."
    },
    demo: {
      aria: "Diagram of a shared game screen with two phone controllers connected over local Wi-Fi",
      title: "Living-room party link",
      status: "LOCAL ONLY",
      roomLabel: "ROOM CODE",
      roomCode: "QIUP",
      screenTitle: "Ready when everyone is",
      screenHint: "Scan once. Pick a name. Keep the same phone for every game.",
      connected: "2 PLAYERS CONNECTED",
      playerOne: "Mika",
      playerTwo: "Lin",
      ready: "READY",
      phoneLabel: "PHONE CONTROLLER",
      phoneActionOne: "TAP!",
      phoneActionTwo: "DRAW",
      caption: "The game stays in the room. Phones send input; the PC decides the result."
    },
    factsLabel: "Project facts",
    facts: [
      { label: "BUILT IN", value: "8 party games", detail: "Cards, drawing, trivia and quick reflexes" },
      { label: "PLAYERS", value: "2–52 range", detail: "Each game defines its own party size" },
      { label: "CONNECTION", value: "Same local Wi-Fi", detail: "No account or public lobby" }
    ],
    workflow: {
      eyebrow: "FROM ZIP TO GAME NIGHT",
      title: "Three steps. No controller drawer.",
      intro:
        "The portable release carries the server, host screen, phone interface, and bundled games together.",
      steps: [
        {
          label: "LAUNCH",
          title: "Run it on the shared Windows PC",
          body: "Unzip the release and open LAN-Party-Hub.exe. The launcher starts the local server and opens the host screen.",
          note: "Portable package · no developer tools"
        },
        {
          label: "JOIN",
          title: "Scan the room QR code",
          body: "Friends open the local address on their phones, choose a name, and stay connected through the same Wi-Fi.",
          note: "Phone browser · no app install"
        },
        {
          label: "PLAY",
          title: "Switch games without reconnecting",
          body: "The host selects a game. Every phone automatically becomes the controller that round needs.",
          note: "One room · eight built-in games"
        }
      ]
    },
    games: {
      eyebrow: "THE BUILT-IN LINEUP",
      title: "A whole party shelf in one download.",
      intro:
        "Every bundled game ships in the repository and portable release. Player limits, hidden information, timers, and scoring are enforced by the local server.",
      count: "08 / INCLUDED",
      playersLabel: "PLAYERS",
      durationLabel: "ROUND",
      items: [
        {
          id: "tap-race",
          glyph: "↯",
          tone: "cyan",
          name: "Tap Race",
          description: "Tap faster than everyone else and be first across the finish line.",
          players: "2–4",
          duration: "< 20 sec"
        },
        {
          id: "zeichnen-und-erraten",
          glyph: "✎",
          tone: "mint",
          name: "Draw & Guess",
          description: "One player draws on a phone while everyone else races to name the word.",
          players: "2–4",
          duration: "1–2 min"
        },
        {
          id: "schaetzorama",
          glyph: "≈",
          tone: "violet",
          name: "Schaetzorama",
          description: "Estimate, sort, and classify facts on a bright shared quiz board.",
          players: "2–4",
          duration: "2–3 min"
        },
        {
          id: "imposter",
          glyph: "?",
          tone: "amber",
          name: "Imposter",
          description: "Give careful clues, read the room, and vote for the player without the secret word.",
          players: "3–4",
          duration: "~ 2 min"
        },
        {
          id: "bullshit",
          glyph: "♠",
          tone: "rose",
          name: "Bullshit",
          description: "Play face down, bluff freely, and challenge the most recent move.",
          players: "2–52",
          duration: "Varies"
        },
        {
          id: "roulette",
          glyph: "◎",
          tone: "blue",
          name: "Fate Chamber",
          description: "Read a hidden chamber, use tactical items, and choose where the next risk lands.",
          players: "2",
          duration: "2–4 min"
        },
        {
          id: "liars-table",
          glyph: "♚",
          tone: "orange",
          name: "Liars' Table",
          description: "Play in secret, claim in public, and challenge at exactly the right moment.",
          players: "3–4",
          duration: "4–8 min"
        },
        {
          id: "auction-king",
          glyph: "◆",
          tone: "lime",
          name: "Mystery Warehouse",
          description: "Combine private clues and instruments, then bid through five escalating rounds.",
          players: "2–6",
          duration: "4–7 min"
        }
      ]
    },
    architecture: {
      eyebrow: "SERVER-AUTHORITATIVE BY DESIGN",
      title: "The PC keeps the truth. Screens only show it.",
      intro:
        "LAN Party Hub separates rules, presentation, and player input so a refreshed phone or enthusiastic tap cannot decide an outcome by itself.",
      nodes: [
        {
          kind: "AUTHORITY",
          title: "Local server",
          body: "Owns rooms, timers, rules, private state, scores, reconnects, and round transitions."
        },
        {
          kind: "SHARED VIEW",
          title: "Host screen",
          body: "Shows the lobby, QR code, game board, results, and shared information for the room."
        },
        {
          kind: "PLAYER INTENT",
          title: "Phone controller",
          body: "Sends each player's actions and reveals only the private information that player may see."
        }
      ],
      note:
        "This public website is an introduction, not a playable cloud demo. Actual games run from the Windows package on your local network.",
      docsAction: "Read the architecture notes"
    },
    boundary: {
      eyebrow: "CURRENT PUBLIC-ALPHA BOUNDARY",
      title: "Local by design, candid by default.",
      intro:
        "The project is usable now, but the remaining limits matter when deciding where and how to run it.",
      items: [
        {
          title: "No cloud relay or matchmaking",
          body: "Everyone joins the Windows host over the same reachable local network."
        },
        {
          title: "No accounts or telemetry",
          body: "Rooms and recovery data remain with the portable server; there is no hosted player profile."
        },
        {
          title: "Unsigned Windows build",
          body: "SmartScreen and the firewall may ask for confirmation until release signing is available."
        },
        {
          title: "Games remain alpha",
          body: "Real-device and real-party testing is still needed for pacing, balance, and mobile ergonomics."
        }
      ]
    },
    source: {
      eyebrow: "SOURCE AND RELEASES",
      title: "Inspect it, download it, keep it in the room.",
      body:
        "The platform, eight bundled games, tests, Windows packaging, attribution records, and architecture notes are developed in public under Apache-2.0.",
      repositoryAction: "View on GitHub",
      releaseAction: "Get the latest release",
      statusLabel: "PROJECT STATUS",
      statusValue: "Public alpha",
      licenseLabel: "SOURCE LICENSE",
      licenseValue: "Apache-2.0",
      platformLabel: "RUNTIME",
      platformValue: "Windows + phone browsers"
    },
    footer: {
      tagline: "Local-first browser party games for one shared screen and everyone's phone.",
      status: "Built in public. Designed to play offline together.",
      repository: "GitHub",
      documentation: "Docs",
      notices: "Notices",
      license: "Apache-2.0"
    },
    notFound: {
      eyebrow: "ROOM NOT FOUND · 404",
      title: "This link left the party.",
      body: "The page does not exist, but the main project introduction is still one click away.",
      homeAction: "Back to the homepage",
      chineseAction: "阅读中文介绍"
    }
  },
  zh: {
    meta: {
      title: "LAN Party Hub — 一台电脑，让每部手机都成为手柄",
      description:
        "面向 Windows 的开源、本地优先浏览器派对游戏平台。一台电脑显示共享主屏，朋友通过同一 Wi-Fi 用手机加入。"
    },
    skipLink: "跳到正文",
    homeLabel: "LAN Party Hub 首页",
    languageLabel: "EN",
    navigation: {
      aria: "主导航",
      workflow: "怎么玩",
      games: "游戏阵容",
      architecture: "架构",
      source: "源码"
    },
    hero: {
      eyebrow: "本地优先 · 8 款内置游戏 · 开源",
      titleLead: "一台电脑，",
      titleEmphasis: "让每部手机都成为手柄。",
      body:
        "LAN Party Hub 把 Windows 电脑变成共享主屏和权威游戏服务器。朋友连上同一 Wi-Fi 后扫码加入——不需要账号、云服务或公网连接。",
      downloadAction: "下载 Windows 版",
      sourceAction: "查看源码",
      releaseNote: "当前为公开 alpha；Windows 便携版暂未签名。"
    },
    demo: {
      aria: "共享游戏主屏与两台通过本地 Wi-Fi 连接的手机控制器示意图",
      title: "客厅派对连接",
      status: "仅限本地",
      roomLabel: "房间码",
      roomCode: "QIUP",
      screenTitle: "所有人准备好就开局",
      screenHint: "扫码一次、取个名字，切换游戏也继续使用同一部手机。",
      connected: "2 位玩家已连接",
      playerOne: "小米",
      playerTwo: "阿琳",
      ready: "已准备",
      phoneLabel: "手机控制器",
      phoneActionOne: "点击！",
      phoneActionTwo: "绘画",
      caption: "游戏留在房间里。手机只发送操作，结果由电脑决定。"
    },
    factsLabel: "项目概况",
    facts: [
      { label: "内置", value: "8 款派对游戏", detail: "卡牌、绘画、问答与反应挑战" },
      { label: "人数", value: "覆盖 2–52 人", detail: "每款游戏有自己的适配人数" },
      { label: "连接", value: "同一局域网 Wi-Fi", detail: "不需要账号或公网大厅" }
    ],
    workflow: {
      eyebrow: "从解压到开局",
      title: "三步开始，不用翻找手柄。",
      intro: "便携发行包把服务器、共享主屏、手机界面和内置游戏放在一起。",
      steps: [
        {
          label: "启动",
          title: "在共享的 Windows 电脑上运行",
          body: "解压发行包并打开 LAN-Party-Hub.exe，启动器会运行本地服务器并打开主屏。",
          note: "便携包 · 不需要开发工具"
        },
        {
          label: "加入",
          title: "用手机扫描房间二维码",
          body: "朋友用手机打开本地地址、输入名字，然后通过同一 Wi-Fi 保持连接。",
          note: "手机浏览器 · 不用安装 App"
        },
        {
          label: "开玩",
          title: "换游戏也不用重新连接",
          body: "主机选择游戏后，每部手机都会自动变成这一局所需的控制器。",
          note: "一个房间 · 八款内置游戏"
        }
      ]
    },
    games: {
      eyebrow: "内置游戏阵容",
      title: "一次下载，摆满整张派对游戏桌。",
      intro:
        "每款内置游戏都随仓库和便携发行包一起提供；人数限制、隐藏信息、计时和计分全部由本地服务器执行。",
      count: "08 / 已内置",
      playersLabel: "人数",
      durationLabel: "时长",
      items: [
        {
          id: "tap-race",
          glyph: "↯",
          tone: "cyan",
          name: "疯狂点击",
          description: "在手机上快速点击，抢先冲过终点。",
          players: "2–4",
          duration: "20 秒内"
        },
        {
          id: "zeichnen-und-erraten",
          glyph: "✎",
          tone: "mint",
          name: "你画我猜",
          description: "一名玩家在手机上作画，其他人争先猜出答案。",
          players: "2–4",
          duration: "1–2 分钟"
        },
        {
          id: "schaetzorama",
          glyph: "≈",
          tone: "violet",
          name: "估个大概",
          description: "估数字、排顺序、做归类，在轻松问答中比谁更接近真相。",
          players: "2–4",
          duration: "2–3 分钟"
        },
        {
          id: "imposter",
          glyph: "?",
          tone: "amber",
          name: "谁是卧底",
          description: "根据轮流给出的提示，找出不知道秘密词的卧底。",
          players: "3–4",
          duration: "约 2 分钟"
        },
        {
          id: "bullshit",
          glyph: "♠",
          tone: "rose",
          name: "吹牛牌",
          description: "背面出牌、真假混杂；跟牌、质疑，或者把风险传给下一位。",
          players: "2–52",
          duration: "视人数而定"
        },
        {
          id: "roulette",
          glyph: "◎",
          tone: "blue",
          name: "命运轮盘",
          description: "读懂隐藏弹序、使用战术道具，并决定下一次风险落向哪里。",
          players: "2",
          duration: "2–4 分钟"
        },
        {
          id: "liars-table",
          glyph: "♚",
          tone: "orange",
          name: "谎言牌桌",
          description: "秘密出牌、公开宣称，并在恰当时机发起质疑。",
          players: "3–4",
          duration: "4–8 分钟"
        },
        {
          id: "auction-king",
          glyph: "◆",
          tone: "lime",
          name: "迷雾仓库",
          description: "组合私人角色与仪器情报，在五轮递进竞拍中抢先落槌。",
          players: "2–6",
          duration: "4–7 分钟"
        }
      ]
    },
    architecture: {
      eyebrow: "服务端权威架构",
      title: "电脑掌管真相，屏幕只负责呈现。",
      intro:
        "LAN Party Hub 将规则、画面和玩家操作分开；手机刷新或兴奋地狂点，都不能自行决定游戏结果。",
      nodes: [
        {
          kind: "权威",
          title: "本地服务器",
          body: "负责房间、计时、规则、私人状态、计分、重连和回合切换。"
        },
        {
          kind: "共享画面",
          title: "主机主屏",
          body: "展示大厅、二维码、游戏画面、结果与房间内所有人可见的信息。"
        },
        {
          kind: "玩家意图",
          title: "手机控制器",
          body: "发送每位玩家的操作，并且只显示该玩家有权看到的私人信息。"
        }
      ],
      note: "这个公开网页只是项目介绍，不是云端试玩。真正的游戏仍从 Windows 便携包在本地网络中运行。",
      docsAction: "阅读架构说明"
    },
    boundary: {
      eyebrow: "当前公开 ALPHA 的边界",
      title: "本地优先，也如实说明限制。",
      intro: "项目已经可以使用，但在决定怎么运行之前，仍需了解这些现实边界。",
      items: [
        {
          title: "没有云端中继或公网匹配",
          body: "所有人都要通过可互访的同一本地网络连接 Windows 主机。"
        },
        {
          title: "没有账号或遥测",
          body: "房间与恢复数据留在便携服务器中，不存在托管玩家档案。"
        },
        {
          title: "Windows 程序暂未签名",
          body: "在提供发行签名前，SmartScreen 和防火墙可能要求用户确认。"
        },
        {
          title: "所有游戏仍为 alpha",
          body: "节奏、平衡与移动端操作仍需要更多真实设备和真人聚会测试。"
        }
      ]
    },
    source: {
      eyebrow: "源码与发行版",
      title: "先检查，再下载，然后留在房间里开玩。",
      body:
        "平台、八款内置游戏、自动化测试、Windows 打包、署名记录和架构说明都以 Apache-2.0 在公开仓库开发。",
      repositoryAction: "前往 GitHub",
      releaseAction: "下载最新发行版",
      statusLabel: "项目状态",
      statusValue: "公开 alpha",
      licenseLabel: "源码许可",
      licenseValue: "Apache-2.0",
      platformLabel: "运行环境",
      platformValue: "Windows + 手机浏览器"
    },
    footer: {
      tagline: "一块共享主屏，加上每个人的手机，就是本地优先的浏览器派对。",
      status: "公开开发，为面对面离线同乐而设计。",
      repository: "GitHub",
      documentation: "文档",
      notices: "署名",
      license: "Apache-2.0"
    },
    notFound: {
      eyebrow: "房间不存在 · 404",
      title: "这个链接已经离开派对。",
      body: "当前页面不存在，但项目中文介绍仍然只需点击一次。",
      homeAction: "返回英文首页",
      chineseAction: "阅读中文介绍"
    }
  }
} as const satisfies Record<Locale, SiteCopy>;
