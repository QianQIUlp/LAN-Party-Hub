// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
export interface EditorialLobbyLayout {
  stacked: boolean;
  railWidth: number;
  railHeight: number;
  mainX: number;
  mainTop: number;
  mainWidth: number;
  padding: number;
  gridTop: number;
  gridWidth: number;
  columns: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  showInlineQuickStart: boolean;
  contentBottom: number;
}

export interface EditorialRailMetrics {
  condensed: boolean;
  titleY: number;
  titleSize: number;
  roomLabelY: number;
  joinY: number;
  qrY: number;
  qrSize: number;
  playersTop: number;
  utilitySafeArea: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveEditorialRailMetrics(
  viewportHeight: number,
  railWidth: number
): EditorialRailMetrics {
  const height = Math.max(480, viewportHeight);
  const condensed = height < 680;
  const qrSize = condensed ? 52 : railWidth >= 350 ? 72 : 62;

  if (condensed) {
    return {
      condensed,
      titleY: 18,
      titleSize: railWidth >= 350 ? 48 : 42,
      roomLabelY: 116,
      joinY: 226,
      qrY: 288,
      qrSize,
      playersTop: 372,
      utilitySafeArea: 84
    };
  }

  const roomLabelY = clamp(height * 0.178, 132, 158);
  const joinY = roomLabelY + 139;
  const qrY = clamp(height * 0.42, joinY + 52, joinY + 76);

  return {
    condensed,
    titleY: 27,
    titleSize: railWidth >= 350 ? 56 : 47,
    roomLabelY,
    joinY,
    qrY,
    qrSize,
    playersTop: clamp(height * 0.56, qrY + qrSize + 28, height - 260),
    utilitySafeArea: 84
  };
}

export function resolveEditorialLobbyLayout(
  viewportWidth: number,
  viewportHeight: number,
  gameCount: number
): EditorialLobbyLayout {
  const width = Math.max(320, viewportWidth);
  const height = Math.max(480, viewportHeight);
  const stacked = width < 860;
  const railWidth = stacked ? width : clamp(width * 0.218, 292, 388);
  const railHeight = stacked ? 278 : height;
  const mainX = stacked ? 0 : railWidth;
  const mainTop = stacked ? railHeight : 0;
  const mainWidth = stacked ? width : width - railWidth;
  const padding = clamp(mainWidth * 0.028, 28, 44);
  const gridWidth = Math.max(264, mainWidth - padding * 2);
  const showInlineQuickStart = mainWidth >= 820;
  const gridTop = showInlineQuickStart ? clamp(height * 0.235, 184, 210) : 268;
  const columns = gridWidth >= 900 ? 4 : gridWidth >= 510 ? 2 : 1;
  const rows = Math.max(1, Math.ceil(gameCount / columns));
  const visibleRows = Math.min(2, rows);
  const availableRowHeight = Math.floor((height - gridTop - 30) / visibleRows);
  const cardHeight = columns === 4
    ? clamp(availableRowHeight, 266, 320)
    : columns === 2
      ? 276
      : 252;
  const cardWidth = gridWidth / columns;
  const contentBottom = mainTop + gridTop + rows * cardHeight;

  return {
    stacked,
    railWidth,
    railHeight,
    mainX,
    mainTop,
    mainWidth,
    padding,
    gridTop,
    gridWidth,
    columns,
    rows,
    cardWidth,
    cardHeight,
    showInlineQuickStart,
    contentBottom
  };
}
