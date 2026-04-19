import { useMemo, useState } from 'react';
import type { Meld, TileCode } from '../../../types';
import { normalizeTileCode } from '../../../utils/tiles';
import { Input } from '../../ui/Input';
import { TileImage } from '../../ui/TileImage';
import { TILE_GROUPS } from '../../../utils/tiles';
import styles from './MeldEditor.module.css';

type MeldKind = Meld['kind'];
type MeldFrom = 'kamicha' | 'toimen' | 'shimocha';

interface MeldEditorProps {
  melds: Meld[];
  readOnly: boolean;
  onChange: (melds: Meld[]) => void;
}

const getTileSlots = (kind: MeldKind) => {
  return kind === 'minkan' || kind === 'ankan' || kind === 'kakan' ? 4 : 3;
};

const isTileCode = (value: string): value is TileCode => {
  return /^(?:[1-9][mps]|[1-7]z|0[mps])$/.test(value);
};

const areSameTileKinds = (tiles: TileCode[]) => {
  if (tiles.length === 0) {
    return false;
  }

  const [firstTile, ...restTiles] = tiles.map(normalizeTileCode);
  return restTiles.every((tile) => tile === firstTile);
};

const isValidChi = (tiles: [TileCode, TileCode, TileCode]) => {
  const normalizedTiles = tiles.map(normalizeTileCode);
  if (normalizedTiles.some((tile) => tile.endsWith('z'))) {
    return false;
  }

  const suit = normalizedTiles[0][1];
  if (!normalizedTiles.every((tile) => tile[1] === suit)) {
    return false;
  }

  const ranks = normalizedTiles
    .map((tile) => Number.parseInt(tile[0], 10))
    .sort((left, right) => left - right);

  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
};

export const MeldEditor = ({ melds, readOnly, onChange }: MeldEditorProps) => {
  const [kind, setKind] = useState<MeldKind>('chi');
  const [from, setFrom] = useState<MeldFrom>('kamicha');
  const [tileDrafts, setTileDrafts] = useState<string[]>(['', '', '']);

  const hasIncompleteDraft = useMemo(() => {
    return tileDrafts.some((tile) => tile.trim().length > 0) && !tileDrafts.every(isTileCode);
  }, [tileDrafts]);

  const buildMeld = (): Meld | null => {
    if (!tileDrafts.every(isTileCode)) {
      return null;
    }

    if (kind === 'chi') {
      const tiles = [tileDrafts[0], tileDrafts[1], tileDrafts[2]] as [TileCode, TileCode, TileCode];
      if (!isValidChi(tiles)) {
        return null;
      }

      return {
        kind,
        tiles,
        from: 'kamicha',
      };
    }

    if (kind === 'pon') {
      const tiles = [tileDrafts[0], tileDrafts[1], tileDrafts[2]] as [TileCode, TileCode, TileCode];
      if (!areSameTileKinds(tiles)) {
        return null;
      }

      return {
        kind,
        tiles,
        from,
      };
    }

    if (kind === 'minkan') {
      const tiles = [tileDrafts[0], tileDrafts[1], tileDrafts[2], tileDrafts[3]] as [
        TileCode,
        TileCode,
        TileCode,
        TileCode,
      ];
      if (!areSameTileKinds(tiles)) {
        return null;
      }

      return {
        kind,
        tiles,
        from,
      };
    }

    if (kind === 'kakan') {
      const tiles = [tileDrafts[0], tileDrafts[1], tileDrafts[2], tileDrafts[3]] as [
        TileCode,
        TileCode,
        TileCode,
        TileCode,
      ];
      if (!areSameTileKinds(tiles)) {
        return null;
      }

      return {
        kind,
        tiles,
        from,
      };
    }

    const tiles = [tileDrafts[0], tileDrafts[1], tileDrafts[2], tileDrafts[3]] as [
      TileCode,
      TileCode,
      TileCode,
      TileCode,
    ];
    if (!areSameTileKinds(tiles)) {
      return null;
    }

    return {
      kind,
      tiles,
    };
  };

  const handleAdd = () => {
    const nextMeld = buildMeld();
    if (!nextMeld) {
      return;
    }

    onChange([...melds, nextMeld]);
    setTileDrafts(Array.from({ length: getTileSlots(kind) }, () => ''));
  };

  const handleKindChange = (nextKind: MeldKind) => {
    const slotCount = getTileSlots(nextKind);
    setKind(nextKind);
    setTileDrafts((current) => {
      const nextDrafts = current.slice(0, slotCount);
      while (nextDrafts.length < slotCount) {
        nextDrafts.push('');
      }
      return nextDrafts;
    });

    if (nextKind === 'chi') {
      setFrom('kamicha');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>鳴き</h3>
        <span>{melds.length}組</span>
      </div>

      <div className={styles.currentMelds}>
        {melds.length === 0 ? <span className={styles.emptyText}>未入力</span> : null}
        {melds.map((meld, index) => (
          <div key={`${meld.kind}-${index}`} className={styles.meldRow}>
            <span className={styles.meldText}>
              {meld.kind} / {meld.tiles.join(' ')}
              {'from' in meld ? ` / ${meld.from}` : ''}
            </span>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onChange(melds.filter((_, currentIndex) => currentIndex !== index))}
              disabled={readOnly}
              aria-label={`鳴きを${index + 1}件目から削除`}
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <div className={styles.editorGrid}>
        <label className={styles.field}>
          <span>種類</span>
          <select
            className={styles.select}
            value={kind}
            onChange={(event) => handleKindChange(event.target.value as MeldKind)}
            disabled={readOnly}
          >
            <option value="chi">チー</option>
            <option value="pon">ポン</option>
            <option value="minkan">明槓</option>
            <option value="kakan">加槓</option>
            <option value="ankan">暗槓</option>
          </select>
        </label>

        {kind !== 'ankan' ? (
          <label className={styles.field}>
            <span>鳴いた方向</span>
            <select
              className={styles.select}
              value={from}
              onChange={(event) => setFrom(event.target.value as MeldFrom)}
              disabled={readOnly || kind === 'chi'}
            >
              <option value="kamicha">上家</option>
              <option value="toimen">対面</option>
              <option value="shimocha">下家</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className={styles.tileInputs}>
        {tileDrafts.map((tile, index) => (
          <Input
            key={`tile-input-${index}`}
            fullWidth
            value={tile}
            onChange={(event) => {
              const nextDrafts = [...tileDrafts];
              nextDrafts[index] = event.target.value;
              setTileDrafts(nextDrafts);
            }}
            placeholder={`牌${index + 1} 例: 3m`}
            aria-label={`鳴き牌 ${index + 1}`}
            disabled={readOnly}
          />
        ))}
      </div>

      <div className={styles.palette}>
        {TILE_GROUPS.map((group) => (
          <div key={`meld-${group.label}`} className={styles.paletteGroup}>
            <span className={styles.paletteLabel}>{group.label}</span>
            <div className={styles.tileButtons}>
              {group.tiles.map((tile) => (
                <TileImage
                  key={`meld-${tile}`}
                  code={tile}
                  size="sm"
                  onClick={() => {
                    const nextIndex = tileDrafts.findIndex((draft) => draft === '');
                    if (nextIndex === -1) {
                      return;
                    }

                    const nextDrafts = [...tileDrafts];
                    nextDrafts[nextIndex] = tile;
                    setTileDrafts(nextDrafts);
                  }}
                  disabled={readOnly}
                  ariaLabel={`鳴き候補に${tile}を追加`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className={styles.helperText}>
        鳴き入力は追加前なら未完成でも保存できます。入力済みの鳴きだけ保存対象になります。
      </p>
      {hasIncompleteDraft ? <p className={styles.warning}>鳴き候補の入力が未完成です。</p> : null}

      <button
        type="button"
        className={styles.addButton}
        onClick={handleAdd}
        disabled={readOnly || buildMeld() === null}
      >
        鳴きを追加
      </button>
    </section>
  );
};
