import { useCallback } from 'react';
import type { AnalysisEventType, Meld, TileCode, WinningTileSource } from '../../../types';
import { HandNotationInput } from './HandNotationInput';
import styles from './HandInputSection.module.css';

interface HandInputSectionProps {
  concealed: TileCode[];
  melds: Meld[];
  winningTile?: TileCode;
  winningTileSource?: WinningTileSource;
  eventType: AnalysisEventType;
  readOnly: boolean;
  onConcealedChange: (tiles: TileCode[]) => void;
  onMeldsChange: (melds: Meld[]) => void;
  onWinningTileChange: (tile: TileCode | undefined) => void;
  onWinningTileSourceChange: (source: WinningTileSource | undefined) => void;
}

export const HandInputSection = ({
  concealed,
  melds,
  eventType,
  winningTile,
  winningTileSource,
  readOnly,
  onConcealedChange,
  onMeldsChange,
  onWinningTileChange,
  onWinningTileSourceChange,
}: HandInputSectionProps) => {
  const handleParsed = useCallback(
    (result: {
      concealed: TileCode[];
      melds: Meld[];
      tsumo?: TileCode;
      ron?: { tile: TileCode; from: 'kamicha' | 'toimen' | 'shimocha' };
    }) => {
      onConcealedChange(result.concealed);
      onMeldsChange(result.melds);

      if (eventType === 'tenpai-draw') {
        onWinningTileChange(undefined);
        onWinningTileSourceChange(undefined);
      } else if (result.tsumo) {
        onWinningTileChange(result.tsumo);
        onWinningTileSourceChange('tsumo');
      } else if (result.ron) {
        onWinningTileChange(result.ron.tile);
        onWinningTileSourceChange(result.ron.from);
      } else {
        onWinningTileChange(undefined);
        onWinningTileSourceChange(undefined);
      }
    },
    [eventType, onConcealedChange, onMeldsChange, onWinningTileChange, onWinningTileSourceChange],
  );

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>手牌入力（MPSZ表記）</h3>
        <span>{concealed.length}枚</span>
      </div>

      <HandNotationInput
        concealed={concealed}
        melds={melds}
        winningTile={winningTile}
        winningTileSource={winningTileSource}
        readOnly={readOnly}
        onParsed={handleParsed}
      />
    </section>
  );
};
