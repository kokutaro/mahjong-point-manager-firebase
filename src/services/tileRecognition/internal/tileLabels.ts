import type { TileCode } from '../../../types/analysis';

/**
 * Roboflow `master-oez61` モデル向けの暫定ラベルマッピング。
 *
 * 実際のクラス順序はモデルの `metadata.json` / `data.yaml` に依存するため、
 * `public/models/tile-detector/labels.json` を配置することで上書きできる
 * ようにする (TfliteTileRecognizer 側でロードする)。
 *
 * 暫定順序: 1m..9m, 1p..9p, 1s..9s, 1z..7z, 0m, 0p, 0s (= 計 37 クラス)
 */
export const DEFAULT_TILE_LABELS: TileCode[] = [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '6m',
  '7m',
  '8m',
  '9m',
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  '6p',
  '7p',
  '8p',
  '9p',
  '1s',
  '2s',
  '3s',
  '4s',
  '5s',
  '6s',
  '7s',
  '8s',
  '9s',
  '1z',
  '2z',
  '3z',
  '4z',
  '5z',
  '6z',
  '7z',
  '0m',
  '0p',
  '0s',
];

/**
 * 文字列ラベル (例: "1m", "man1", "5p_red", "haku" 等) を `TileCode` に正規化する。
 * Roboflow データセットの命名揺れを吸収するためのベストエフォート実装。
 */
export const normalizeLabelToTileCode = (raw: string): TileCode | null => {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // すでに TileCode 形式
  if (/^[0-9][mpsz]$/.test(s)) return s as TileCode;

  // "5m_red" / "red5m" / "0m" 系
  const red = s.match(/^(?:red[-_]?)?([1-9])([mps])(?:[-_]?red)?$/);
  if (red && (s.includes('red') || s.startsWith('0'))) {
    if (red[1] === '5') return `0${red[2]}` as TileCode;
  }
  if (red) {
    return `${red[1]}${red[2]}` as TileCode;
  }

  // 接頭辞名: man/pin/sou
  const prefixed = s.match(/^(man|pin|sou)[-_ ]?([1-9])$/);
  if (prefixed) {
    const suit = prefixed[1] === 'man' ? 'm' : prefixed[1] === 'pin' ? 'p' : 's';
    return `${prefixed[2]}${suit}` as TileCode;
  }

  // 字牌
  const honors: Record<string, TileCode> = {
    east: '1z',
    ton: '1z',
    e: '1z',
    south: '2z',
    nan: '2z',
    s: '2z',
    west: '3z',
    sha: '3z',
    shaa: '3z',
    w: '3z',
    north: '4z',
    pei: '4z',
    n: '4z',
    haku: '5z',
    white: '5z',
    p: '5z',
    hatsu: '6z',
    green: '6z',
    g: '6z',
    chun: '7z',
    red_dragon: '7z',
    r: '7z',
  };
  if (s in honors) return honors[s];

  return null;
};
