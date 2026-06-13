import { signInAnonymously, signOut, type User } from 'firebase/auth';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { auth } from '../services/firebase';
import { AuthContext, type AuthContextValue } from './auth-context';
import { useSnackbar } from './SnackbarContext';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const { showSnackbar } = useSnackbar();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(Boolean(auth.currentUser));
  const [sessionId, setSessionId] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setSessionId((current) => current + 1);

      if (user) {
        setCurrentUser(user);
        setAuthReady(true);
        return;
      }

      setCurrentUser(null);

      signInAnonymously(auth)
        .then(() => {
          // The next auth state event will mark auth as ready.
        })
        .catch((error) => {
          console.error('Auth failed', error);
          showSnackbar('認証に失敗しました。リロードしてください。', { position: 'top' });
          setAuthReady(true);
        });
    });

    return () => unsubscribe();
  }, [showSnackbar]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      authReady,
      currentUser,
      sessionId,
      uid: currentUser?.uid ?? null,
      signOutCurrentUser: () => signOut(auth),
    };
  }, [authReady, currentUser, sessionId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
