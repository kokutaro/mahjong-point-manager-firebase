import { useEffect, useRef, useState } from 'react';
import type { Meld, TileCode, Wind } from '../../types/analysis';
import { createTileRecognizer } from '../../services/tileRecognition/factory';
import type { TileRecognizer } from '../../services/tileRecognition';
import { judgeHand } from '../../utils/yakuJudge';
import {
  DEFAULT_HAND_FLAGS,
  type HandFlags,
  type YakuJudgeResult,
} from '../../utils/yakuJudge/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TileImage } from '../ui/TileImage';
import { TilePicker } from './TilePicker';
import styles from './TileRecognitionModal.module.css';

interface TileRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 自動判定が成功した場合に翻数・符を親に通知する。 */
  onConfirm: (judged: { han: number; fu: number; result: YakuJudgeResult }) => void;
  /** デフォルト場風 (East 等)。親側で round.wind を渡す。 */
  defaultRoundWind?: Wind;
  /** デフォルト自風 (該当プレイヤーの座風)。 */
  defaultSeatWind?: Wind;
  /** 推論エンジンの差し込み (テスト用)。 */
  recognizerOverride?: TileRecognizer;
}

type Step = 'capture' | 'edit' | 'confirm';

interface SlotTile {
  code: TileCode | null;
  isWinning: boolean;
}

const WINDS: { value: Wind; label: string }[] = [
  { value: 'East', label: '東' },
  { value: 'South', label: '南' },
  { value: 'West', label: '西' },
  { value: 'North', label: '北' },
];

export const TileRecognitionModal = (props: TileRecognitionModalProps) => {
  if (!props.isOpen) return null;
  return <TileRecognitionModalContent {...props} />;
};

const TileRecognitionModalContent = ({
  onClose,
  onConfirm,
  defaultRoundWind = 'East',
  defaultSeatWind = 'East',
  recognizerOverride,
}: TileRecognitionModalProps) => {
  const [step, setStep] = useState<Step>('capture');
  const [tiles, setTiles] = useState<SlotTile[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [judgeResult, setJudgeResult] = useState<YakuJudgeResult | null>(null);

  // フォーム入力
  const [seatWind, setSeatWind] = useState<Wind>(defaultSeatWind);
  const [roundWind, setRoundWind] = useState<Wind>(defaultRoundWind);
  const [isTsumo, setIsTsumo] = useState(false);
  const [doraCount, setDoraCount] = useState(0);
  const [akaDoraCount, setAkaDoraCount] = useState(0);
  const [flags, setFlags] = useState<HandFlags>({ ...DEFAULT_HAND_FLAGS });
  const [melds, setMelds] = useState<Meld[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<TileRecognizer | null>(null);

  if (recognizerRef.current === null) {
    recognizerRef.current = recognizerOverride ?? createTileRecognizer();
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // モーダル閉じ時の cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `カメラを起動できませんでした: ${err.message}`
          : 'カメラを起動できませんでした',
      );
    }
  };

  const captureFromVideo = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85),
    );
  };

  const handleCapture = async () => {
    const blob = await captureFromVideo();
    if (!blob) {
      setErrorMessage('画像を取得できませんでした');
      return;
    }
    await runRecognition(blob);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runRecognition(file);
  };

  const runRecognition = async (blob: Blob) => {
    setErrorMessage(null);
    setIsRecognizing(true);
    setPreviewUrl(URL.createObjectURL(blob));
    try {
      const result = await recognizerRef.current!.recognize(blob, { expectedCount: 14 });
      const slotTiles: SlotTile[] = result.tiles.map((t, idx) => ({
        code: t.code,
        // 最後の 1 牌をデフォルトで「和了牌」とマーク
        isWinning: idx === result.tiles.length - 1,
      }));
      // 14 枚に満たない場合は null パディング
      while (slotTiles.length < 14) {
        slotTiles.push({ code: null, isWinning: false });
      }
      setTiles(slotTiles);
      setStep('edit');
      stopCamera();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? `認識に失敗しました: ${err.message}` : '認識に失敗しました',
      );
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleSlotClick = (idx: number) => {
    setSelectedSlot(idx === selectedSlot ? null : idx);
  };

  const handlePickTile = (code: TileCode) => {
    if (selectedSlot === null) return;
    setTiles((prev) => prev.map((t, i) => (i === selectedSlot ? { ...t, code } : t)));
    setSelectedSlot(null);
  };

  const handleToggleWinning = (idx: number) => {
    setTiles((prev) => prev.map((t, i) => ({ ...t, isWinning: i === idx })));
  };

  const handleJudge = () => {
    setErrorMessage(null);
    // tiles から HandInput を組み立てる
    const winningEntry = tiles.find((t) => t.isWinning && t.code);
    if (!winningEntry || !winningEntry.code) {
      setErrorMessage('和了牌を選択してください');
      return;
    }
    const closedTiles = tiles
      .filter((t, i) => t.code && tiles.indexOf(t) === i)
      .map((t) => t.code as TileCode);
    // 和了牌は 1 つ抜く（最初に出てくるものを抜く）
    const idx = closedTiles.indexOf(winningEntry.code);
    if (idx >= 0) closedTiles.splice(idx, 1);
    // 副露分は手牌から除外（このUIでは tiles に副露を含めない前提）
    const result = judgeHand({
      closedTiles,
      winningTile: winningEntry.code,
      melds,
      isTsumo,
      seatWind,
      roundWind,
      flags,
      doraCount,
      akaDoraCount,
    });
    if (result.isInvalid) {
      setErrorMessage(`判定不可: ${result.warnings.join(' / ')}`);
      setJudgeResult(null);
      return;
    }
    setJudgeResult(result);
    setStep('confirm');
  };

  const handleConfirmJudge = () => {
    if (!judgeResult) return;
    // 役満は 13 翻として既存 ScoringModal 側に渡す
    const han =
      judgeResult.yakumanMultiplier > 0 ? 13 * judgeResult.yakumanMultiplier : judgeResult.han;
    const fu = judgeResult.yakumanMultiplier > 0 ? 30 : judgeResult.fu;
    onConfirm({ han, fu, result: judgeResult });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="📷 牌を読み取って自動判定">
      <div className={styles.container}>
        {step === 'capture' && (
          <div className={styles.section}>
            <div className={styles.captureArea}>
              <video ref={videoRef} className={styles.video} playsInline muted />
              <div className={styles.captureButtons}>
                <Button onClick={startCamera} variant="secondary">
                  カメラ起動
                </Button>
                <Button onClick={handleCapture} disabled={!isCameraActive}>
                  撮影して認識
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                  画像を選択
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className={styles.hiddenInput}
                  onChange={handleFileSelected}
                />
              </div>
              {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
              {isRecognizing && <div className={styles.loadingOverlay}>認識中...</div>}
            </div>
            <div className={styles.footer}>
              <Button variant="secondary" onClick={onClose}>
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {step === 'edit' && (
          <>
            {previewUrl && <img src={previewUrl} alt="撮影画像" className={styles.previewImage} />}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>認識結果（タップで修正、緑枠が和了牌）</div>
              <div className={styles.tileRow}>
                {tiles.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.tileSlot} ${t.isWinning ? styles.winning : ''}`}
                    onClick={() => handleSlotClick(i)}
                    onDoubleClick={() => handleToggleWinning(i)}
                    aria-label={t.code ?? '不明'}
                  >
                    {t.code ? (
                      <TileImage code={t.code} size="md" selected={selectedSlot === i} />
                    ) : (
                      <span className={styles.unknown}>?</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                ※ ダブルタップで和了牌を変更できます
              </div>
              {selectedSlot !== null && <TilePicker onPick={handlePickTile} />}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>場・自風</div>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  場風
                  <select value={roundWind} onChange={(e) => setRoundWind(e.target.value as Wind)}>
                    {WINDS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formField}>
                  自風
                  <select value={seatWind} onChange={(e) => setSeatWind(e.target.value as Wind)}>
                    {WINDS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>和了種別・ドラ</div>
              <div className={styles.formGrid}>
                <label className={styles.flagToggle}>
                  <input
                    type="checkbox"
                    checked={isTsumo}
                    onChange={(e) => setIsTsumo(e.target.checked)}
                  />
                  ツモ和了
                </label>
                <label className={styles.formField}>
                  ドラ枚数
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={doraCount}
                    onChange={(e) => setDoraCount(Math.max(0, Number(e.target.value)))}
                  />
                </label>
                <label className={styles.formField}>
                  赤ドラ枚数
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={akaDoraCount}
                    onChange={(e) => setAkaDoraCount(Math.max(0, Number(e.target.value)))}
                  />
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>状況役・特別フラグ</div>
              <div className={styles.flagsGrid}>
                {(
                  [
                    ['riichi', '立直'],
                    ['doubleRiichi', 'ダブル立直'],
                    ['ippatsu', '一発'],
                    ['rinshan', '嶺上開花'],
                    ['chankan', '搶槓'],
                    ['haitei', '海底'],
                    ['houtei', '河底'],
                    ['tenho', '天和'],
                    ['chiho', '地和'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className={styles.flagToggle}>
                    <input
                      type="checkbox"
                      checked={flags[key]}
                      onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                副露 ({melds.length} 面子) ※今版では手動入力のみ
              </div>
              <div className={styles.meldList}>
                {melds.map((m, i) => (
                  <div key={i} className={styles.meldItem}>
                    <span>
                      {m.kind}: {m.tiles.join(',')}
                    </span>
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => setMelds((prev) => prev.filter((_, j) => j !== i))}
                    >
                      削除
                    </Button>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  ※ 副露面子の追加 UI は次イテレーションで実装。現状は門前での自動判定のみ確認可能。
                </div>
              </div>
            </div>

            {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

            <div className={styles.footer}>
              <Button variant="secondary" onClick={() => setStep('capture')}>
                撮り直し
              </Button>
              <Button onClick={handleJudge}>役を判定</Button>
            </div>
          </>
        )}

        {step === 'confirm' && judgeResult && (
          <div className={styles.section}>
            <div className={styles.judgeResult}>
              <div className={styles.judgeYakuList}>
                {judgeResult.yaku.map((y, i) => (
                  <div key={i} className={styles.judgeYakuItem}>
                    <span>{y.label}</span>
                    <span>
                      {y.yakumanMultiplier ? `役満 x${y.yakumanMultiplier}` : `${y.han} 翻`}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.judgeTotal}>
                {judgeResult.yakumanMultiplier > 0
                  ? `役満 (${judgeResult.yakumanMultiplier}倍)`
                  : `${judgeResult.han} 翻 ${judgeResult.fu} 符`}
              </div>
              {judgeResult.warnings.length > 0 && (
                <div className={styles.judgeWarnings}>{judgeResult.warnings.join(' / ')}</div>
              )}
            </div>

            <div className={styles.footer}>
              <Button variant="secondary" onClick={() => setStep('edit')}>
                修正に戻る
              </Button>
              <Button onClick={handleConfirmJudge}>この内容で確定</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
