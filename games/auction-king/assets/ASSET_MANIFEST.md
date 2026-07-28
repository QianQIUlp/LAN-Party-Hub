# 即刻落槌 — 图片资源清单 (Asset Manifest)

> 本文件列出游戏所需的全部图片资源。每张图附有详细的 AI 生成提示词（英文）。
> 生成后将图片放入 `games/auction-king/assets/images/` 对应位置即可。
> 代码已实现"有图用图、无图用代码绘制兜底"的逻辑，图片到位前游戏可正常运行。

## 视觉风格总则

**风格关键词**：modern urban fantasy, dark elegance, neon accents, mysterious atmosphere, game UI, 2D digital painting, clean composition

**色彩基调**：
- 主背景：深蓝黑 (#0a0e27 ~ #0f172a)
- 强调色：琥珀金 (#f59e0b)、霓虹青 (#22d3ee)
- 稀有度色系：普通=灰蓝 (#94a3b8)、稀有=蓝 (#3b82f6)、史诗=紫 (#a855f7)、传说=金 (#f59e0b)

**参考游戏**：《异环》(Neverness to Everness) 的拍卖行场景 — 现代都市奇幻风格，暗调环境 + 发光元素。

---

## 1. 背景图

### 1.1 `bg-auction-hall.png`
- **尺寸**：1920 × 1080
- **用途**：Host 主屏游戏阶段的背景
- **放置路径**：`games/auction-king/assets/images/bg-auction-hall.png`

**Prompt**:
```
A dark, atmospheric auction hall interior in a modern urban fantasy style.
The scene depicts an elegant underground auction venue with deep navy and black tones.
Soft amber spotlight from above illuminates a central podium area.
The background shows blurred rows of luxury seats and display cases with faint glowing artifacts.
Subtle neon cyan accent lights line the walls.
The atmosphere is mysterious and sophisticated, like a high-stakes underground auction.
No text, no characters, no specific objects in focus.
Style: 2D digital painting, game background art, clean composition, dark elegance.
Color palette: deep navy (#0a0e27), black (#0f172a), amber gold accents (#f59e0b), faint neon cyan (#22d3ee).
```

### 1.2 `bg-scoreboard.png`
- **尺寸**：1920 × 1080
- **用途**：Host 主屏最终计分板阶段的背景
- **放置路径**：`games/auction-king/assets/images/bg-scoreboard.png`

**Prompt**:
```
A dark, celebratory auction hall background for a results screen.
Deep navy-to-black gradient with golden light rays emanating from the top center.
Faint floating gold particles and sparkles scattered across the upper third.
The lower portion is darker, creating a stage-like spotlight effect for displaying text overlays.
Subtle ornate golden frame elements in the corners.
No text, no characters.
Style: 2D digital painting, game UI background, dark luxury aesthetic.
Color palette: black (#0f172a), deep navy (#0a0e27), gold (#f59e0b, #fbbf24), warm amber glow.
```

---

## 2. 品类插图

这 4 张图用作拍品卡牌的中央插图区域。每张图应能独立识别品类风格，且背景透明或深色。

### 2.1 `cat-antique.png`
- **尺寸**：400 × 400
- **用途**：古董类拍品的通用插图
- **放置路径**：`games/auction-king/assets/images/cat-antique.png`

**Prompt**:
```
A collection of elegant antique items arranged in a still-life composition:
a blue-and-white Ming dynasty porcelain vase, a bronze mirror with intricate relief patterns,
and a carved jade pendant. The items rest on a dark velvet surface with soft amber spotlight.
Dark navy background with subtle warm glow.
Style: 2D digital painting, game item illustration, clean composition, dark elegance.
No text, no frame.
```

### 2.2 `cat-jewelry.png`
- **尺寸**：400 × 400
- **用途**：珠宝类拍品的通用插图
- **放置路径**：`games/auction-king/assets/images/cat-jewelry.png`

**Prompt**:
```
A collection of luxury jewelry items arranged in a still-life composition:
a pigeon-blood ruby ring, a pair of diamond earrings, and a sapphire tiara.
The items rest on a dark velvet surface with soft amber and cyan spotlight.
Gems catch the light with subtle sparkle effects.
Dark navy background.
Style: 2D digital painting, game item illustration, clean composition, dark luxury.
No text, no frame.
```

### 2.3 `cat-artwork.png`
- **尺寸**：400 × 400
- **用途**：艺术品类拍品的通用插图
- **放置路径**：`games/auction-king/assets/images/cat-artwork.png`

**Prompt**:
```
A collection of fine art pieces arranged in a still-life composition:
a Chinese ink wash landscape painting scroll, a European oil portrait,
and a small bronze sculpture of a thinker. The items are displayed against
a dark gallery wall with soft warm spotlight from above.
Dark navy background with subtle amber glow.
Style: 2D digital painting, game item illustration, clean composition, dark elegance.
No text, no frame.
```

### 2.4 `cat-curio.png`
- **尺寸**：400 × 400
- **用途**：奇物类拍品的通用插图
- **放置路径**：`games/auction-king/assets/images/cat-curio.png`

**Prompt**:
```
A collection of mysterious supernatural curios arranged in a still-life composition:
a glowing fragment of an anomaly core emitting faint purple-cyan light,
an old lantern with blue ghost-light flame, and a brass compass with an eerie needle.
The items rest on a dark surface with subtle ethereal glow effects.
Dark navy background with purple and cyan accent lights.
Style: 2D digital painting, game item illustration, urban fantasy aesthetic, clean composition.
No text, no frame.
```

---

## 3. UI 图标

### 3.1 `icon-gavel.png`
- **尺寸**：128 × 128
- **用途**：标题栏装饰图标，象征"落槌"
- **放置路径**：`games/auction-king/assets/images/icon-gavel.png`

**Prompt**:
```
A golden auction gavel icon, depicted from a three-quarter angle.
The gavel has a polished wooden handle and a brass-gold head block.
It rests at a slight diagonal angle. Clean icon style with soft amber glow.
Transparent background. No text.
Style: flat 2D icon, game UI element, gold and dark wood color scheme.
```

### 3.2 `icon-gold.png`
- **尺寸**：64 × 64
- **用途**：金币显示旁的小图标
- **放置路径**：`games/auction-king/assets/images/icon-gold.png`

**Prompt**:
```
A single golden coin icon, front face, with a simple decorative emblem in the center.
Polished gold surface with a slight shine effect.
Transparent background. No text.
Style: flat 2D icon, game UI element, bright gold (#f59e0b) color.
```

---

## 4. 卡牌边框覆盖图（可选，增强视觉效果）

这些是带透明中心的装饰边框，叠加在拍品卡牌上方以突出稀有度。
如果生成困难，代码会用 Phaser 图形原语绘制等效的发光边框。

### 4.1 `frame-legendary.png`
- **尺寸**：500 × 320
- **用途**：传说品质拍品卡牌的装饰边框
- **放置路径**：`games/auction-king/assets/images/frame-legendary.png`

**Prompt**:
```
An ornate golden picture frame border for a legendary-rarity game card.
The frame features intricate Art Deco-style golden filigree patterns with glowing amber accents.
The center is fully transparent (alpha 0) to show the card content behind it.
The frame corners have elaborate decorative flourishes.
Only the border/frame is visible — the interior is completely empty/transparent.
Style: game UI frame overlay, gold (#f59e0b, #fbbf24), dark luxury, transparent center.
```

### 4.2 `frame-epic.png`
- **尺寸**：500 × 320
- **用途**：史诗品质拍品卡牌的装饰边框
- **放置路径**：`games/auction-king/assets/images/frame-epic.png`

**Prompt**:
```
An elegant purple-glowing picture frame border for an epic-rarity game card.
The frame features sleek geometric patterns with purple neon glow accents.
The center is fully transparent (alpha 0).
The corners have subtle crystalline decorations.
Only the border/frame is visible — the interior is completely empty/transparent.
Style: game UI frame overlay, purple (#a855f7, #7c3aed), neon glow, transparent center.
```

### 4.3 `frame-rare.png`
- **尺寸**：500 × 320
- **用途**：稀有品质拍品卡牌的装饰边框
- **放置路径**：`games/auction-king/assets/images/frame-rare.png`

**Prompt**:
```
A clean blue-glowing picture frame border for a rare-rarity game card.
The frame features simple modern lines with blue neon edge glow.
The center is fully transparent (alpha 0).
The corners have small angular decorations.
Only the border/frame is visible — the interior is completely empty/transparent.
Style: game UI frame overlay, blue (#3b82f6, #60a5fa), neon glow, transparent center.
```

### 4.4 `frame-common.png`
- **尺寸**：500 × 320
- **用途**：普通品质拍品卡牌的装饰边框
- **放置路径**：`games/auction-king/assets/images/frame-common.png`

**Prompt**:
```
A simple gray-silver picture frame border for a common-rarity game card.
The frame features clean minimal lines with a subtle metallic sheen.
The center is fully transparent (alpha 0).
The corners are plain and unadorned.
Only the border/frame is visible — the interior is completely empty/transparent.
Style: game UI frame overlay, gray-silver (#94a3b8, #64748b), minimal, transparent center.
```

---

## 文件清单汇总

| # | 文件名 | 尺寸 | 必要性 | 放置路径 |
|---|--------|------|--------|----------|
| 1 | `bg-auction-hall.png` | 1920×1080 | ★★★ 必要 | `assets/images/` |
| 2 | `bg-scoreboard.png` | 1920×1080 | ★★ 推荐 | `assets/images/` |
| 3 | `cat-antique.png` | 400×400 | ★★★ 必要 | `assets/images/` |
| 4 | `cat-jewelry.png` | 400×400 | ★★★ 必要 | `assets/images/` |
| 5 | `cat-artwork.png` | 400×400 | ★★★ 必要 | `assets/images/` |
| 6 | `cat-curio.png` | 400×400 | ★★★ 必要 | `assets/images/` |
| 7 | `icon-gavel.png` | 128×128 | ★★ 推荐 | `assets/images/` |
| 8 | `icon-gold.png` | 64×64 | ★★ 推荐 | `assets/images/` |
| 9 | `frame-legendary.png` | 500×320 | ★ 可选 | `assets/images/` |
| 10 | `frame-epic.png` | 500×320 | ★ 可选 | `assets/images/` |
| 11 | `frame-rare.png` | 500×320 | ★ 可选 | `assets/images/` |
| 12 | `frame-common.png` | 500×320 | ★ 可选 | `assets/images/` |

**最低限度**：生成 #1 和 #3-#6（5 张）即可获得显著的视觉提升。
**完整体验**：全部 12 张。

生成后把文件放到 `games/auction-king/assets/images/` 目录下，然后在 host 目录运行 `npm run build --workspace @open-party-lab/game-auction-king` 重新构建即可生效。
