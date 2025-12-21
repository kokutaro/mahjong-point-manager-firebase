import React, { useMemo } from 'react';
import type { GameResult, Player } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  gameResults: GameResult[];
  rate: number;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  players,
  gameResults,
  rate
}) => {
  const settlementData = useMemo(() => {
    // 1. Calculate Total Points per Player
    const totalPoints: Record<string, number> = {};
    players.forEach(p => totalPoints[p.id] = 0);

    if (gameResults) {
      gameResults.forEach(game => {
        game.scores.forEach(s => {
          if (totalPoints[s.playerId] !== undefined) {
            totalPoints[s.playerId] += s.point;
          } else {
             totalPoints[s.playerId] = s.point;
          }
        });
      });
    }

    // 2. Calculate Final Payment
    // Formula: (TotalPt + Chip) * Rate
    return players.map(p => {
        const pt = totalPoints[p.id] || 0;
        const chip = p.chip || 0;
        const finalAmount = Math.round((pt + chip) * rate);
        
        return {
            ...p,
            pt,
            chip,
            finalAmount
        };
    }).sort((a, b) => b.finalAmount - a.finalAmount); // Sort by payment descending (Winners top)
  }, [players, gameResults, rate]);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="精算">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
           レート: {rate === 0 ? 'なし' : rate}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ color: '#aaa', fontSize: '14px', textAlign: 'left', borderBottom: '1px solid #444' }}>
                   <th style={{ padding: '8px' }}>名前</th>
                   <th style={{ padding: '8px', textAlign: 'right' }}>Pt + Chip</th>
                   <th style={{ padding: '8px', textAlign: 'right' }}>支払額</th>
                </tr>
            </thead>
            <tbody>
                {settlementData.map(data => (
                    <tr key={data.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '12px 8px' }}>{data.name}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.9rem', color: '#ccc', fontFamily: 'var(--font-mono)' }}>
                            {/* Detailed breakdown: Pt + Chip */}
                            {data.pt.toFixed(1)} + {data.chip}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'var(--font-mono)',
                            color: data.finalAmount > 0 ? '#4caf50' : data.finalAmount < 0 ? '#f44336' : '#fff'
                        }}>
                            {/* Show ONLY number, no currency. + for positive. */}
                            {data.finalAmount > 0 ? '+' : ''}{data.finalAmount.toLocaleString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <Button onClick={onClose} size="large" variant="primary">
            終了する
          </Button>
        </div>
      </div>
    </Modal>
  );
};
