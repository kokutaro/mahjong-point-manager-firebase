import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Snackbar, type SnackbarPosition } from '../components/ui/Snackbar';

interface SnackbarContextType {
  showSnackbar: (
    message: string,
    options?: { autoHideDuration?: number; position?: SnackbarPosition },
  ) => void;
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

  const showSnackbar = useCallback(
    (msg: string, options?: { autoHideDuration?: number; position?: SnackbarPosition }) => {
      setMessage(msg);
      if (options?.position) setPosition(options.position);
      if (options?.autoHideDuration) setDuration(options.autoHideDuration);
      setIsOpen(true);
    },
    [],
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
      />
    </SnackbarContext.Provider>
  );
};
