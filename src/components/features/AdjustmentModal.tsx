import { useState } from 'react';
import type { Player } from '../../types';
import type { AdjustmentParams } from '../../utils/adjustment';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './AdjustmentModal.module.css';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onConfirm: (params: AdjustmentParams) => void;
}

const AMOUNT_PRESETS = [1000, 2000, 3000, 4000, 8000, 12000];

export const AdjustmentModal = ({ isOpen, onClose, players, onConfirm }: AdjustmentModalProps) => {
  const [payerId, setPayerId] = useState<string | null>(null);
  const [receiverIds, setReceiverIds] = useState<string[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');
  const [description, setDescription] = useState('');

  const resetState = () => {
    setPayerId(null);
    setReceiverIds([]);
    setAmount(0);
    setCustomAmount('');
    setDescription('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleReceiver = (id: string) => {
    setReceiverIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handlePresetClick = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const parsed = parseInt(value, 10);
    setAmount(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  };

  const effectiveAmount = amount;
  const isValid = payerId !== null && receiverIds.length > 0 && effectiveAmount > 0;

  const handleConfirm = () => {
    if (!isValid || !payerId) return;
    onConfirm({
      payerId,
      receiverIds,
      amount: effectiveAmount,
      description: description.trim() || undefined,
    });
    resetState();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="点数調整">
      <div className={styles.container}>
        {/* Payer selection */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>支払い元</span>
          <div className={styles.playerGrid}>
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.playerChip} ${payerId === p.id ? styles.playerChipSelected : ''}`}
                onClick={() => {
                  setPayerId(p.id);
                  setReceiverIds((prev) => prev.filter((r) => r !== p.id));
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Receiver selection */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>受取先（複数選択可）</span>
          <div className={styles.playerGrid}>
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.playerChip} ${receiverIds.includes(p.id) ? styles.playerChipSelected : ''} ${payerId === p.id ? styles.playerChipDisabled : ''}`}
                onClick={() => toggleReceiver(p.id)}
                disabled={payerId === p.id}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className={styles.amountSection}>
          <span className={styles.sectionLabel}>一人あたりの点数</span>
          <div className={styles.presetGrid}>
            {AMOUNT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`${styles.presetButton} ${amount === preset && !customAmount ? styles.presetButtonSelected : ''}`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            className={styles.customInput}
            placeholder="カスタム点数"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>理由（任意）</span>
          <input
            type="text"
            className={styles.descriptionInput}
            placeholder="例: チョンボ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Summary */}
        {isValid && (
          <div className={styles.summary}>
            {players.find((p) => p.id === payerId)?.name} が{' '}
            {receiverIds.map((id) => players.find((p) => p.id === id)?.name).join('・')} に 各
            {effectiveAmount.toLocaleString()}点（計
            {(effectiveAmount * receiverIds.length).toLocaleString()}点）支払い
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!isValid}>
            確定
          </Button>
        </div>
      </div>
    </Modal>
  );
};
