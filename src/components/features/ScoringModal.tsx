import { useEffect, useState } from 'react';
import type { GameSettings, Player } from '../../types';
import { calculateScore, type ScorePayment } from '../../utils/scoreCalculator';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ScoreDisplay } from '../ui/ScoreDisplay';
import { RyukyokuBoard } from './RyukyokuBoard';
import styles from './ScoringModal.module.css';


interface WinResult {
  winnerId: string;
  han: number;
  fu: number;
  payment: ScorePayment;
  chips: number;
}

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  dealerId: string;
  initialWinnerId?: string;
  initialLoserId?: string;
  initialWinType?: 'Ron' | 'Tsumo' | 'Ryukyoku';
  settings: GameSettings;
  onConfirm: (results: { payment: ScorePayment, winnerId: string, loserId: string | null, chips: number }[]) => void;
  onRyukyoku: (tenpaiIds: string[]) => void;
}


const HAN_OPTIONS = [1, 2, 3, 4];
const LIMIT_OPTIONS = [
  { label: '満貫', value: 5, fu: 30 }, // Dummy fu for limit, calculator handles it
  { label: '跳満', value: 6, fu: 30 },
  { label: '倍満', value: 8, fu: 30 },
  { label: '三倍満', value: 11, fu: 30 },
  { label: '役満', value: 13, fu: 30 },
];
const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

export const ScoringModal = ({ isOpen, onClose, players, dealerId, initialWinnerId, initialLoserId, initialWinType, settings, onConfirm, onRyukyoku }: ScoringModalProps) => {
  const [step, setStep] = useState(1);
  const [winType, setWinType] = useState<'Ron' | 'Tsumo' | 'Ryukyoku'>('Ron');
  const [loserId, setLoserId] = useState<string | null>(null);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  
  // Scoring state for current editing winner
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
  const [results, setResults] = useState<WinResult[]>([]);

  // Step 2/3 temporary state
  const [currentHan, setCurrentHan] = useState(1);
  //const [currentFu, setCurrentFu(30);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
          setStep(1);
          setResults([]);
          setCurrentWinnerIndex(0);
          
          const type = initialWinType || 'Ron';
          setWinType(type);
          
          // Default winner reset
          if (initialWinnerId) setSelectedWinners([initialWinnerId]);
          else setSelectedWinners([players[0]?.id]);
          
          setLoserId(initialLoserId || null);
      }, 0);
    }
  }, [isOpen, initialWinnerId, initialLoserId, initialWinType, players]);

  // Auto-select loser for Ron
  useEffect(() => {
    if (winType === 'Ron' && !loserId && players.length > 1) {
      const firstWinner = selectedWinners[0];
      const other = players.find(p => p.id !== firstWinner);
      if (other) setTimeout(() => setLoserId(other.id), 0);
    }
  }, [winType, selectedWinners, players]);

  const toggleWinner = (id: string) => {
    if (selectedWinners.includes(id)) {
      setSelectedWinners(prev => prev.filter(w => w !== id));
    } else {
      if (winType === 'Tsumo') {
        setSelectedWinners([id]);
      } else {
        setSelectedWinners(prev => [...prev, id]);
      }
    }
  };

  const handleStep1Next = () => {
    if (winType === 'Ryukyoku') return; // Handled separately
    if (selectedWinners.length === 0) return;
    if (winType === 'Ron' && !loserId) return;
    
    // Initialize results placeholder or reset
    setResults([]);
    setCurrentWinnerIndex(0);
    setStep(2);
  };

  const calculateAndProceed = (han: number, fu: number) => {
    const winnerId = selectedWinners[currentWinnerIndex];
    const isDealer = winnerId === dealerId;
    const isTsumo = winType === 'Tsumo';
    
    // Logic to force Mangan+ if han >= 5 is handled by passing correct Han/Fu to calculator
    // But here we rely on calculator lookup.
    // Use calculator
    const is3Player = players.length === 3;
    const payment = calculateScore(han, fu, isDealer, isTsumo, is3Player);
    
    const newResult: WinResult = { winnerId, han, fu, payment, chips: 0 };
    const nextResults = [...results, newResult];
    setResults(nextResults);

    if (currentWinnerIndex < selectedWinners.length - 1) {
      // Next winner
      setCurrentWinnerIndex(prev => prev + 1);
      // Reset defaults for next player?
      setCurrentHan(1);
      setStep(2); // Go back to Step 2 for next player
    } else {
      // All done
      setStep(4);
    }
  };

  const handleHanSelect = (han: number, isLimit: boolean) => {
    setCurrentHan(han);
    if (isLimit) {
      // Direct calc (Mangan etc) - Pass 30 fu as default, calculator handles named limits by Han
      calculateAndProceed(han, 30);
    } else {
      // Go to Fu selection
      setStep(3);
    }
  };

  const handleFuSelect = (fu: number) => {
    calculateAndProceed(currentHan, fu);
  };

  const handleUpdateChips = (index: number, delta: number) => {
    setResults(prev => prev.map((r, i) => {
        if (i === index) return { ...r, chips: r.chips + delta };
        return r;
    }));
  };

  const handleConfirmAll = () => {
    // Convert to confirm format
    const confirmData = results.map(r => ({
      payment: r.payment,
      winnerId: r.winnerId,
      loserId: winType === 'Ron' ? loserId : null,
      chips: r.chips
    }));
    onConfirm(confirmData);
    onClose();
  };

  const currentProcessingWinnerId = selectedWinners[currentWinnerIndex];
  const currentProcessingWinnerName = players.find(p => p.id === currentProcessingWinnerId)?.name;

  // Filter Fu options based on Han
  const displayFuOptions = (() => {
    let opts = FU_OPTIONS.map(f => ({ value: f, label: `${f} 符` }));
    if (currentHan === 1) {
      opts = opts.filter(o => o.value >= 30);
    } else if (currentHan === 3) {
      opts = opts.filter(o => o.value <= 60);
      opts.push({ value: 70, label: '70符以上' });
    } else if (currentHan === 4) {
      opts = opts.filter(o => o.value <= 30);
      opts.push({ value: 40, label: '40符以上' });
    }
    return opts;
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      winType === 'Ryukyoku' ? "流局設定" :
      step === 1 ? "和了設定 (Step 1/4)" : 
      step === 4 ? "確認 (Step 4/4)" : 
      `点数入力: ${currentProcessingWinnerName} (Step ${step}/4)`
    }>
      <div className={styles.container}>
        
        {/* STEP 1: Win Config (or Ryukyoku) */}
        {step === 1 && (
          <div className={styles.stepContent}>
             <div className={styles.row}>
               <div className={styles.toggleGroup}>
                  <Button variant={winType === 'Ron' ? 'primary' : 'secondary'} onClick={() => setWinType('Ron')}>ロン</Button>
                  <Button variant={winType === 'Tsumo' ? 'primary' : 'secondary'} onClick={() => { 
                    setWinType('Tsumo'); 
                    setLoserId(null);
                    if (selectedWinners.length > 1) {
                      setSelectedWinners([selectedWinners[0]]);
                    }
                  }}>ツモ</Button>
                  <Button variant={winType === 'Ryukyoku' ? 'primary' : 'secondary'} onClick={() => { setWinType('Ryukyoku'); }}>流局</Button>
               </div>
             </div>
             
             {winType === 'Ryukyoku' ? (
                <RyukyokuBoard 
                  players={players} 
                  mode={players.length === 3 ? '3ma' : '4ma'}
                  onConfirm={(tenpaiIds) => {
                    onRyukyoku(tenpaiIds);
                    onClose();
                  }}
                />
             ) : (
                <>
                <div className={styles.section}>
               <label>和了者</label>
               <div className={styles.grid}>
                 {players.map(p => (
                   <Button 
                     key={p.id} 
                     variant={selectedWinners.includes(p.id) ? 'primary' : 'secondary'}
                     className={p.id === loserId ? styles.disabled : ''}
                     onClick={() => p.id !== loserId && toggleWinner(p.id)}
                   >
                     {p.name}
                   </Button>
                 ))}
               </div>
             </div>

             {winType === 'Ron' && (
               <div className={styles.section}>
                 <label>放銃者</label>
                 <div className={styles.grid}>
                   {players.map(p => (
                     <Button 
                       key={p.id} 
                       variant={loserId === p.id ? 'primary' : 'secondary'}
                       className={selectedWinners.includes(p.id) ? styles.disabled : ''}
                       onClick={() => {
                         if (!selectedWinners.includes(p.id)) {
                           setLoserId(p.id);
                         }
                       }}
                     >
                       {p.name}
                     </Button>
                   ))}
                 </div>
               </div>
             )}

             <div className={styles.footer}>
               <Button onClick={handleStep1Next} disabled={selectedWinners.length === 0 || (winType==='Ron' && !loserId)}>
                 次へ
               </Button>
             </div>
                </>
             )}
          </div>
        )}

        {/* STEP 2: Han Selection */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.grid}>
              {HAN_OPTIONS.map(h => (
                <Button key={h} size="large" onClick={() => handleHanSelect(h, false)}>
                  {h} 飜
                </Button>
              ))}
            </div>
            <hr className={styles.divider}/>
            <div className={styles.grid}>
              {LIMIT_OPTIONS.map(opt => (
                <Button key={opt.value} variant="danger" onClick={() => handleHanSelect(opt.value, true)}>
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Fu Selection */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.subHeader}>{currentHan} 飜 - 符数選択</div>
            <div className={styles.grid}>
              {displayFuOptions.map(opt => (
                <Button key={opt.value} size="large" className={styles.fuButton} onClick={() => handleFuSelect(opt.value)}>
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h3>確認</h3>
            {results.map((res, idx) => {
               const winnerName = players.find(p => p.id === res.winnerId)?.name;
               return (
                 <div key={idx} className={styles.resultItem}>
                   <div className={styles.resultRow}>
                       <div className={styles.resultInfo}><strong>{winnerName}</strong> ({winType === 'Ron' ? 'ロン' : 'ツモ'}): {res.payment.name}</div>
                       <div className={styles.resultScore}>
                         {res.payment.tsumoAll ? (
                           <>
                             <ScoreDisplay score={res.payment.tsumoAll} size="medium" />
                             <span style={{ fontSize: '16px', fontWeight: 'bold' }}>オール</span>
                           </>
                         ) : res.payment.tsumoOya ? (
                           <>
                             <ScoreDisplay score={res.payment.tsumoOya} size="medium" />
                             <span style={{ fontSize: '16px', fontWeight: 'bold' }}>-</span>
                             <ScoreDisplay score={res.payment.tsumoKo || 0} size="medium" />
                           </>
                         ) : (
                           <ScoreDisplay score={res.payment.ron || 0} size="medium"/>
                         )}
                       </div>
                   </div>
                   
                   {settings.useChip && (
                     <div className={styles.chipRow}>
                        <span>チップ(枚):</span>
                        <Button size="small" variant="secondary" onClick={() => handleUpdateChips(idx, -1)}>-</Button>
                        <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 'bold' }}>{res.chips}</span>
                        <Button size="small" variant="secondary" onClick={() => handleUpdateChips(idx, 1)}>+</Button>
                     </div>
                   )}
                 </div>
               );
            })}
            
            <div className={styles.footer}>
              <Button variant="secondary" onClick={() => setStep(1)}>最初に戻る</Button>
              <Button variant="primary" onClick={handleConfirmAll}>確定</Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
