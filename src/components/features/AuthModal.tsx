import {
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useState } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { auth } from '../../services/firebase';
import { checkUserHasAnonymousHistory, migrateUserData } from '../../services/migrationService';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PasswordStrengthMeter } from '../ui/PasswordStrengthMeter';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  // Migration state
  const [migrationConfirmOpen, setMigrationConfirmOpen] = useState(false);
  const [pendingOldUid, setPendingOldUid] = useState<string | null>(null);
  const [pendingNewUid, setPendingNewUid] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password !== passwordConfirm) {
      showSnackbar('パスワードが一致しません', { position: 'top' });
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, password);
      if (auth.currentUser) {
        await linkWithCredential(auth.currentUser, credential);
        showSnackbar('アカウント登録が完了しました', { position: 'top' });
        onClose();
      } else {
        showSnackbar('ユーザーが見つかりません', { position: 'top' });
      }
    } catch (error: unknown) {
      console.error(error);
      const e = error as { code: string };
      if (e.code === 'auth/credential-already-in-use') {
        showSnackbar('このメールアドレスは既に使用されています。ログインしてください。', {
          position: 'top',
        });
        setMode('login');
      } else if (e.code === 'auth/email-already-in-use') {
        showSnackbar('このメールアドレスは既に使用されています', { position: 'top' });
      } else if (e.code === 'auth/weak-password') {
        showSnackbar('パスワードが弱すぎます', { position: 'top' });
      } else {
        showSnackbar('登録に失敗しました', { position: 'top' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      showSnackbar('メールアドレスを入力してください', { position: 'top' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showSnackbar('パスワード再設定メールを送信しました', { position: 'top' });
    } catch (error) {
      console.error(error);
      showSnackbar('メールの送信に失敗しました', { position: 'top' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const oldUid = auth.currentUser?.uid;
      const hasHistory = oldUid ? await checkUserHasAnonymousHistory(oldUid) : false;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const newUid = userCredential.user.uid;

      if (hasHistory && oldUid && oldUid !== newUid) {
        // Prepare for migration confirmation
        setPendingOldUid(oldUid);
        setPendingNewUid(newUid);
        setMigrationConfirmOpen(true);
        // Do NOT close AuthModal yet, wait for migration choice
      } else {
        showSnackbar('ログインしました', { position: 'top' });
        onClose();
      }
    } catch (error: unknown) {
      console.error(error);
      const e = error as { code: string };
      if (
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/wrong-password' ||
        e.code === 'auth/invalid-credential'
      ) {
        showSnackbar('メールアドレスまたはパスワードが間違っています', { position: 'top' });
      } else {
        showSnackbar('ログインに失敗しました', { position: 'top' });
      }
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async () => {
    if (!pendingOldUid || !pendingNewUid) return;
    setLoading(true);
    try {
      await migrateUserData(pendingOldUid, pendingNewUid);
      showSnackbar('データの引き継ぎが完了しました', { position: 'top' });
      setMigrationConfirmOpen(false);
      onClose();
    } catch (e) {
      console.error(e);
      showSnackbar('データの引き継ぎに失敗しました', { position: 'top' });
    } finally {
      setLoading(false);
    }
  };

  const cancelMigration = () => {
    // User chose NOT to migrate. Just close dialogs.
    // They are already logged in as the new user.
    setMigrationConfirmOpen(false);
    onClose();
    showSnackbar('ログインしました（データ引き継ぎなし）', { position: 'top' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'register' ? 'アカウント登録' : 'ログイン'}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'login' ? '2px solid #1890ff' : '2px solid transparent',
              color: mode === 'login' ? '#1890ff' : '#666',
              fontWeight: mode === 'login' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'register' ? '2px solid #1890ff' : '2px solid transparent',
              color: mode === 'register' ? '#1890ff' : '#666',
              fontWeight: mode === 'register' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            新規登録
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="username"
          />

          <div>
            <Input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && <PasswordStrengthMeter password={password} />}
          </div>

          {mode === 'register' && (
            <Input
              type="password"
              placeholder="パスワード（確認）"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              fullWidth
              required
              minLength={6}
              autoComplete="new-password"
            />
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={handlePasswordReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1890ff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 0,
                }}
              >
                パスワードのリセット
              </button>
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <Button type="submit" disabled={loading} fullWidth>
              {mode === 'register' ? '新規登録' : 'ログイン'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={migrationConfirmOpen}
        title="データ引き継ぎ"
        message={`この端末の匿名データを、ログインしたアカウントに統合しますか？\n\n「はい」を選択すると、現在の戦績データがログイン先のアカウントに追加されます。\n「キャンセル」を選択すると、現在のデータは破棄されます。`}
        confirmText="はい（統合する）"
        cancelText="キャンセル（統合しない）"
        onConfirm={executeMigration}
        onCancel={cancelMigration}
      />
    </>
  );
};
