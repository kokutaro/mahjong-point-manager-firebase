import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthContextValue {
  authReady: boolean;
  currentUser: User | null;
  sessionId: number;
  uid: string | null;
  signOutCurrentUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
