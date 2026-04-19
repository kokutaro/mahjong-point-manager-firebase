import { useCallback } from 'react';
import type { AnalysisEventType, Meld, TileCode } from '../../../types';
import { HandNotationInput } from './HandNotationInput';
import styles from './HandInputSection.module.css';

interface HandInputSectionProps {
  concealed: TileCode[];
  melds: Meld[];
  winningTile?: TileCode;
  eventType: AnalysisEventType;
  readOnly: boolean;
  onConcealedChange: (tiles: TileCode[]) => void;
  onMeldsChange: (melds: Meld[]) => void;
  onWinningTileChange: (tile: TileCode | undefined) => void;
}

export const HandInputSection = ({
  concealed,
  melds,
  eventType,
  readOnly,
  onConcealedChange,
  onMeldsChange,
  onWinningTileChange,
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
      } else if (result.tsumo) {
        onWinningTileChange(result.tsumo);
      } else if (result.ron) {
        onWinningTileChange(result.ron.tile);
      } else {
        onWinningTileChange(undefined);
      }
    },
    [eventType, onConcealedChange, onMeldsChange, onWinningTileChange],
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
        readOnly={readOnly}
        onParsed={handleParsed}
      />
    </section>
  );
};
