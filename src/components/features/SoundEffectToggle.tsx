import { Switch } from '../ui/Switch';
import styles from './SoundEffectToggle.module.css';

interface SoundEffectToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const SoundEffectToggle = ({ checked, onChange, className }: SoundEffectToggleProps) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.content}>
        <span className={styles.title}>SE</span>
        <span className={styles.description}>リーチ、ロン、ツモ時に効果音を再生</span>
      </div>
      <Switch checked={checked} onChange={onChange} className={styles.switch} />
    </div>
  );
};
