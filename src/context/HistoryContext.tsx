import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { HistoryAction } from '../types/common.types';
import { useNotifications } from './NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../services/eventBus';

interface HistoryContextType {
  canUndo: boolean;
  canRedo: boolean;
  pushAction: (description: string, undo: () => void | Promise<void>, redo: () => void | Promise<void>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  lastActionDescription?: string;
  nextActionDescription?: string;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const { showToast } = useNotifications();

  const pushAction = useCallback((
    description: string,
    undo: () => void | Promise<void>,
    redo: () => void | Promise<void>
  ) => {
    const action: HistoryAction = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      description,
      undo,
      redo,
      timestamp: new Date().toISOString()
    };
    setUndoStack(prev => [action, ...prev].slice(0, 30)); // Limit to 30 actions
    setRedoStack([]); // Clear redo stack on new user action
  }, []);

  // Listen to global undoable action events from anywhere in the app
  useEffect(() => {
    const unsub = eventBus.subscribe(
      SYSTEM_EVENTS.RECORD_UNDOABLE_ACTION,
      (payload: { description: string; undo: () => void | Promise<void>; redo: () => void | Promise<void> }) => {
        if (payload && payload.description && typeof payload.undo === 'function' && typeof payload.redo === 'function') {
          pushAction(payload.description, payload.undo, payload.redo);
        }
      }
    );
    return unsub;
  }, [pushAction]);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const [current, ...remaining] = undoStack;
    try {
      await current.undo();
      setUndoStack(remaining);
      setRedoStack(prev => [current, ...prev].slice(0, 30));
      showToast('info', 'تم التراجع بنجاح ↶', current.description);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error executing undo', e);
      showToast('error', 'فشل التراجع', 'تعذر إتمام عملية التراجع، يرجى المحاولة لاحقاً');
    }
  }, [undoStack, showToast]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const [current, ...remaining] = redoStack;
    try {
      await current.redo();
      setRedoStack(remaining);
      setUndoStack(prev => [current, ...prev].slice(0, 30));
      showToast('info', 'تمت إعادة الإجراء ↷', current.description);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error executing redo', e);
      showToast('error', 'فشلت الإعادة', 'تعذر إتمام عملية إعادة التطبيق');
    }
  }, [redoStack, showToast]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        pushAction,
        undo,
        redo,
        lastActionDescription: undoStack[0]?.description,
        nextActionDescription: redoStack[0]?.description,
        clearHistory
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};

// Global helper that can be called from outside React components or custom services
export const recordUndoableAction = (
  description: string,
  undo: () => void | Promise<void>,
  redo: () => void | Promise<void>
) => {
  eventBus.publish(SYSTEM_EVENTS.RECORD_UNDOABLE_ACTION, { description, undo, redo });
};
