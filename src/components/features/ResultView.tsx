import React from 'react';
import type { RoomState } from '../../types';
import { Button } from '../ui/Button';

interface ResultViewProps {
  room: RoomState;
  onNextGame: () => void;
  onEndMatch: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ room, onNextGame, onEndMatch }) => {
  const { gameResults, players } = room;
  const lastResult =
    gameResults && gameResults.length > 0 ? gameResults[gameResults.length - 1] : null;

  // Calculate Total Points
  const totalPoints: Record<string, number> = {};
  players.forEach((p) => (totalPoints[p.id] = 0));

  if (gameResults) {
    gameResults.forEach((game) => {
      game.scores.forEach((s) => {
        if (totalPoints[s.playerId] !== undefined) {
          totalPoints[s.playerId] += s.point;
        } else {
          // Handle player who might joined midway? For now assume fixed set.
          totalPoints[s.playerId] = s.point;
        }
      });
    });
  }

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>対局結果</h2>

      {/* 1. Last Game Result */}
      {lastResult && (
        <div
          style={{
            marginBottom: '32px',
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <h3
            style={{ borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '12px' }}
          >
            第{gameResults?.length}戦 結果
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#aaa', fontSize: '14px', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>順位</th>
                <th style={{ padding: '8px' }}>名前</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>素点</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Pt</th>
              </tr>
            </thead>
            <tbody>
              {lastResult.scores.map((s) => (
                <tr key={s.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{s.rank}</td>
                  <td style={{ padding: '12px 8px' }}>{s.name}</td>
                  <td
                    style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {s.rawScore.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      fontFamily: 'var(--font-mono)',
                      color: s.point > 0 ? '#4caf50' : s.point < 0 ? '#f44336' : '#fff',
                    }}
                  >
                    {s.point > 0 ? '+' : s.point < 0 ? '-' : ''}
                    {Math.abs(s.point).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Total Set Result */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '12px' }}>
          トータル戦績
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#aaa', fontSize: '14px', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>名前</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>合計Pt</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>チップ</th>
            </tr>
          </thead>
          <tbody>
            {[...players]
              // Sort by Total Points
              .sort((a, b) => (totalPoints[b.id] || 0) - (totalPoints[a.id] || 0))
              .map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '12px 8px' }}>{p.name}</td>
                  <td
                    style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      fontSize: '1.1em',
                      fontFamily: 'var(--font-mono)',
                      color:
                        (totalPoints[p.id] || 0) > 0
                          ? '#4caf50'
                          : (totalPoints[p.id] || 0) < 0
                            ? '#f44336'
                            : '#fff',
                    }}
                  >
                    {(totalPoints[p.id] || 0) > 0 ? '+' : (totalPoints[p.id] || 0) < 0 ? '-' : ''}
                    {Math.abs(totalPoints[p.id] || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {p.chip > 0 ? '+' : ''}
                    {p.chip}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* 3. Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {room.status === 'ended' ? (
          <Button onClick={() => (window.location.href = '/')} size="large" variant="secondary">
            トップへ戻る
          </Button>
        ) : (
          <>
            <Button onClick={onNextGame} size="large" variant="primary">
              次の対局へ
            </Button>
            <Button
              onClick={onEndMatch}
              size="medium"
              variant="secondary"
              style={{ marginTop: '12px', background: '#d32f2f' }}
            >
              対局を終了する
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
