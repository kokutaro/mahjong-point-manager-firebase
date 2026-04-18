import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Snackbar, type SnackbarPosition } from '../components/ui/Snackbar';

interface SnackbarOptions {
  autoHideDuration?: number;
  position?: SnackbarPosition;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarContextType {
  showSnackbar: (message: string, options?: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
  defaultPosition?: SnackbarPosition;
  defaultDuration?: number;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
  defaultPosition = 'bottom',
  defaultDuration = 3000,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState<SnackbarPosition>(defaultPosition);
  const [duration, setDuration] = useState(defaultDuration);
  const [actionLabel, setActionLabel] = useState<string | undefined>(undefined);
  const [actionHandler, setActionHandler] = useState<(() => void) | undefined>(undefined);

  const showSnackbar = useCallback(
    (msg: string, options?: SnackbarOptions) => {
      setMessage(msg);
      setPosition(options?.position ?? defaultPosition);
      setDuration(options?.autoHideDuration ?? defaultDuration);
      setActionLabel(options?.actionLabel);
      setActionHandler(() => options?.onAction);
      setIsOpen(true);
    },
    [defaultDuration, defaultPosition],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        message={message}
        isOpen={isOpen}
        onClose={handleClose}
        position={position}
        autoHideDuration={duration}
        actionLabel={actionLabel}
        onAction={actionHandler}
      />
    </SnackbarContext.Provider>
  );
};
