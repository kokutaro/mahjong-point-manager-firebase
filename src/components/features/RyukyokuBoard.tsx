import { useEffect, useState } from 'react';
import type { Player } from '../../types';
import { calculateRyukyokuScore } from '../../utils/scoreCalculator';
import { Button } from '../ui/Button';
import { ScoreDisplay } from '../ui/ScoreDisplay';
import styles from './RyukyokuBoard.module.css';

interface RyukyokuBoardProps {
  players: Player[];
  mode: '4ma' | '3ma';
  onConfirm: (tenpaiIds: string[]) => void;
}

export const RyukyokuBoard = ({ players, mode, onConfirm }: RyukyokuBoardProps) => {
  const [tenpaiIds, setTenpaiIds] = useState<string[]>([]);
  const [deltas, setDeltas] = useState<{ [key: string]: number }>({});
  const [isSpecial, setIsSpecial] = useState(false); // If true, 0 points transfer (Abortive Draw)

  const toggleTenpai = (id: string) => {
    if (isSpecial) return;
    setTenpaiIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (isSpecial) {
      setDeltas({});
      return;
    }

    const tenpaiCount = tenpaiIds.length;
    const notenCount = players.length - tenpaiCount;
    
    const result = calculateRyukyokuScore(tenpaiCount, notenCount, mode);
    
    const newDeltas: { [key: string]: number } = {};
    players.forEach(p => {
      if (tenpaiIds.includes(p.id)) {
        newDeltas[p.id] = result.tenpai;
      } else {
        newDeltas[p.id] = result.noten;
      }
    });
    setDeltas(newDeltas);
  }, [tenpaiIds, players, mode, isSpecial]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>流局清算</h3>
        <Button 
          size="small" 
          variant={isSpecial ? 'primary' : 'secondary'} 
          onClick={() => {
              setIsSpecial(!isSpecial);
              if (!isSpecial) setTenpaiIds([]); // Reset if special
          }}
        >
          途中流局
        </Button>
      </div>
      
      {!isSpecial && <p className={styles.hint}>テンパイしているプレイヤーを選択してください。</p>}
      {isSpecial && <p className={styles.hint}>点数の移動はありません。</p>}

      <div className={styles.playerList}>
        {players.map(p => (
          <div 
            key={p.id} 
            className={`${styles.playerRow} ${tenpaiIds.includes(p.id) ? styles.tenpai : ''} ${isSpecial ? styles.disabled : ''}`}
            onClick={() => toggleTenpai(p.id)}
          >
            <div className={styles.checkbox}>
              <div className={`${styles.checkInner} ${tenpaiIds.includes(p.id) ? styles.checked : ''}`} />
            </div>
            <div className={styles.name}>{p.name}</div>
            <div className={styles.status}>
               {isSpecial ? '-' : (tenpaiIds.includes(p.id) ? 'テンパイ' : 'ノーテン')}
            </div>
            <div className={styles.delta}>
               {!isSpecial && deltas[p.id] !== undefined && (
                 <ScoreDisplay score={deltas[p.id]} size="medium" showDiff />
               )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="primary" size="large" onClick={() => onConfirm(isSpecial ? [] : tenpaiIds)}>
          確定
        </Button>
      </div>
    </div>
  );
};
