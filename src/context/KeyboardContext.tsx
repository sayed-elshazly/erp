import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTheme } from './ThemeContext';
import { useHistory } from './HistoryContext';
import { useTabs } from './TabsContext';
import { eventBus, SYSTEM_EVENTS } from '../services/eventBus';

interface KeyboardContextType {
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { toggleTheme } = useTheme();
  const { undo, redo, canUndo, canRedo } = useHistory();
  const { tabs, activeTabId, setActiveTabId, closeTab } = useTabs();

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isTypingInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // 1. ESC: Close Command Palette or any Modal
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          e.preventDefault();
          setCommandPaletteOpen(false);
        }
        return;
      }

      // 2. Ctrl + K: Toggle Command Palette (Always active)
      if (isCtrlOrCmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // 3. Ctrl + D: Toggle Dark / Light Theme
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // 4. Ctrl + Z: Undo
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !isTypingInInput) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // 5. Ctrl + Y or Ctrl + Shift + Z: Redo
      if ((isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) || (isCtrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        if (!isTypingInInput && canRedo) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // 6. Ctrl + W: Close Active Tab
      if (isCtrlOrCmd && (e.key === 'w' || e.key === 'W') && !isTypingInInput) {
        e.preventDefault();
        closeTab(activeTabId);
        return;
      }

      // 7. Ctrl + Tab: Switch to Next Tab
      if (isCtrlOrCmd && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          setActiveTabId(tabs[nextIndex].id);
        }
        return;
      }

      // 8. Ctrl + N: New Record (Context aware)
      if (isCtrlOrCmd && (e.key === 'n' || e.key === 'N') && !isTypingInInput) {
        e.preventDefault();
        eventBus.publish(SYSTEM_EVENTS.TRIGGER_NEW);
        return;
      }

      // 9. Ctrl + F: Focus In-Page Search
      if (isCtrlOrCmd && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        eventBus.publish(SYSTEM_EVENTS.TRIGGER_SEARCH_FOCUS);
        return;
      }

      // 10. Ctrl + P: Print
      if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P') && !isTypingInInput) {
        e.preventDefault();
        eventBus.publish(SYSTEM_EVENTS.TRIGGER_PRINT);
        return;
      }

      // 11. Ctrl + E: Export Excel
      if (isCtrlOrCmd && (e.key === 'e' || e.key === 'E') && !isTypingInInput) {
        e.preventDefault();
        eventBus.publish(SYSTEM_EVENTS.TRIGGER_EXPORT);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    toggleCommandPalette,
    toggleTheme,
    undo,
    redo,
    canUndo,
    canRedo,
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab
  ]);

  return (
    <KeyboardContext.Provider
      value={{
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        toggleCommandPalette
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = (): KeyboardContextType => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};
