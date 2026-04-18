import type { AnalysisEventType, TileCode } from '../../../types';
import { TileImage } from '../../ui/TileImage';
import { TILE_GROUPS } from '../../../utils/tiles';
import styles from './HandInputSection.module.css';

interface HandInputSectionProps {
  concealed: TileCode[];
  winningTile?: TileCode;
  eventType: AnalysisEventType;
  readOnly: boolean;
  onConcealedChange: (tiles: TileCode[]) => void;
  onWinningTileChange: (tile: TileCode | undefined) => void;
}

export const HandInputSection = ({
  concealed,
  winningTile,
  eventType,
  readOnly,
  onConcealedChange,
  onWinningTileChange,
}: HandInputSectionProps) => {
  const winningTileOptions = concealed.filter((tile, index) => concealed.indexOf(tile) === index);

  const handleRemoveConcealedTile = (index: number) => {
    const nextConcealed = concealed.filter((_, currentIndex) => currentIndex !== index);
    onConcealedChange(nextConcealed);

    if (winningTile && !nextConcealed.includes(winningTile)) {
      onWinningTileChange(undefined);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>手牌入力</h3>
        <span>{concealed.length}枚</span>
      </div>

      <div className={styles.currentTiles}>
        {concealed.length === 0 ? <span className={styles.emptyText}>未入力</span> : null}
        {concealed.map((tile, index) => (
          <TileImage
            key={`concealed-${tile}-${index}`}
            code={tile}
            size="sm"
            selected
            onClick={() => handleRemoveConcealedTile(index)}
            disabled={readOnly}
            ariaLabel={`手牌から${tile}を削除`}
          />
        ))}
      </div>

      <div className={styles.palette}>
        {TILE_GROUPS.map((group) => (
          <div key={group.label} className={styles.paletteGroup}>
            <span className={styles.paletteLabel}>{group.label}</span>
            <div className={styles.tileButtons}>
              {group.tiles.map((tile) => (
                <TileImage
                  key={`concealed-add-${tile}`}
                  code={tile}
                  size="sm"
                  onClick={() => onConcealedChange([...concealed, tile])}
                  disabled={readOnly}
                  ariaLabel={`手牌に${tile}を追加`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {eventType !== 'tenpai-draw' ? (
        <div className={styles.winningTileSection}>
          <div className={styles.header}>
            <h4>和了牌</h4>
            <span>{winningTile ?? '未入力'}</span>
          </div>
          {winningTile ? (
            <TileImage
              code={winningTile}
              size="sm"
              selected
              onClick={() => onWinningTileChange(undefined)}
              disabled={readOnly}
              ariaLabel={`和了牌から${winningTile}を削除`}
            />
          ) : (
            <span className={styles.emptyText}>未入力</span>
          )}
          {winningTileOptions.length > 0 ? (
            <div className={styles.palette}>
              <div className={styles.paletteGroup}>
                <span className={styles.paletteLabel}>手牌から選択</span>
                <div className={styles.tileButtons}>
                  {winningTileOptions.map((tile) => (
                    <TileImage
                      key={`winning-${tile}`}
                      code={tile}
                      size="sm"
                      selected={winningTile === tile}
                      pressed={winningTile === tile}
                      onClick={() => onWinningTileChange(tile)}
                      disabled={readOnly}
                      ariaLabel={`和了牌に${tile}を設定`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <span className={styles.emptyText}>和了牌は手牌から選択します</span>
          )}
        </div>
      ) : null}
    </section>
  );
};
