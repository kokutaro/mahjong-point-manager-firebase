import React from 'react';
import type { RoomState } from '../../types';

interface SessionHistoryTableProps {
  room: RoomState;
}

export const SessionHistoryTable: React.FC<SessionHistoryTableProps> = ({ room }) => {
  const { gameResults, players } = room;
  const games = gameResults || [];

  // Calculate Running Totals for each player
  const playerTotals: Record<string, number> = {};
  players.forEach(p => playerTotals[p.id] = 0);
  
  if (games.length === 0) {
      return <div style={{ textAlign: 'center', padding: '16px', color: '#aaa' }}>対局履歴はありません</div>;
  }

  // Pre-calculate totals
  games.forEach(g => {
      g.scores.forEach(s => {
          if (playerTotals[s.playerId] !== undefined) {
              playerTotals[s.playerId] += s.point;
          } else {
              playerTotals[s.playerId] = s.point;
          }
      });
  });

  return (
    <div style={{ overflowX: 'auto', padding: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '300px', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444' }}>
            <th style={{ padding: '8px', textAlign: 'center', minWidth: '50px', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 1 }}>
              対局数
            </th>
            {players.map(p => (
              <th key={p.id} style={{ padding: '8px', textAlign: 'center', minWidth: '80px' }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((g, index) => (
             <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
               <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 1 }}>
                 {index + 1}
               </td>
               {players.map(p => {
                  const score = g.scores.find(s => s.playerId === p.id);
                  const pt = score ? score.point : 0;
                  return (
                    <td key={p.id} style={{ padding: '8px', textAlign: 'center' }}>
                       <span style={{ 
                           color: pt > 0 ? '#4caf50' : pt < 0 ? '#f44336' : '#888',
                           fontWeight: pt !== 0 ? 'bold' : 'normal'
                       }}>
                         {pt > 0 ? '+' : ''}{pt === 0 ? '-' : pt.toFixed(1)}
                       </span>
                    </td>
                  );
               })}
             </tr>
          ))}
          {/* Total Row */}
          <tr style={{ borderTop: '2px solid #444', backgroundColor: 'rgba(255,255,255,0.05)' }}>
             <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', position: 'sticky', left: 0, background: '#2a2a2a', zIndex: 1 }}>
               合計
             </td>
             {players.map(p => {
               const total = playerTotals[p.id] || 0;
               return (
                 <td key={p.id} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                    <span style={{ 
                         color: total > 0 ? '#4caf50' : total < 0 ? '#f44336' : '#fff',
                         fontSize: '1.1em'
                     }}>
                       {total > 0 ? '+' : ''}{total.toFixed(1)}
                     </span>
                 </td>
               );
             })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
