import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { UserWorkspaceSettings, KpiCardConfig, KpiSize } from '../types/kpi.types';
import { workspaceService, defaultKpiCards } from '../services/workspaceService';
import { useNotifications } from './NotificationContext';

interface WorkspaceContextType {
  workspace: UserWorkspaceSettings;
  updateWorkspace: (partial: Partial<UserWorkspaceSettings>) => void;
  updateKpiCard: (cardId: string, updates: Partial<KpiCardConfig>) => void;
  reorderKpiCards: (newCards: KpiCardConfig[]) => void;
  resetWorkspace: () => void;
  toggleKpiPin: (cardId: string) => void;
  toggleKpiVisibility: (cardId: string) => void;
  changeKpiSize: (cardId: string, size: KpiSize) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const userId = user?.id || 'guest_user';

  const [workspace, setWorkspace] = useState<UserWorkspaceSettings>(() => {
    return workspaceService.getWorkspace(userId);
  });

  // Reload workspace whenever the logged-in user changes
  useEffect(() => {
    setWorkspace(workspaceService.getWorkspace(userId));
  }, [userId]);

  const updateWorkspace = useCallback((partial: Partial<UserWorkspaceSettings>) => {
    setWorkspace(prev => {
      const updated = { ...prev, ...partial, userId };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, [userId]);

  const updateKpiCard = useCallback((cardId: string, updates: Partial<KpiCardConfig>) => {
    setWorkspace(prev => {
      const updatedCards = prev.kpiCards.map(c => (c.id === cardId ? { ...c, ...updates } : c));
      const updated = { ...prev, kpiCards: updatedCards };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, []);

  const reorderKpiCards = useCallback((newCards: KpiCardConfig[]) => {
    setWorkspace(prev => {
      const updated = { ...prev, kpiCards: newCards };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, []);

  const toggleKpiPin = useCallback((cardId: string) => {
    setWorkspace(prev => {
      const card = prev.kpiCards.find(c => c.id === cardId);
      if (!card) return prev;
      const updatedCards = prev.kpiCards.map(c =>
        c.id === cardId ? { ...c, isPinned: !c.isPinned } : c
      );
      const updated = { ...prev, kpiCards: updatedCards };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, []);

  const toggleKpiVisibility = useCallback((cardId: string) => {
    setWorkspace(prev => {
      const updatedCards = prev.kpiCards.map(c =>
        c.id === cardId ? { ...c, isVisible: !c.isVisible } : c
      );
      const updated = { ...prev, kpiCards: updatedCards };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, []);

  const changeKpiSize = useCallback((cardId: string, size: KpiSize) => {
    setWorkspace(prev => {
      const updatedCards = prev.kpiCards.map(c =>
        c.id === cardId ? { ...c, size } : c
      );
      const updated = { ...prev, kpiCards: updatedCards };
      workspaceService.saveWorkspace(updated);
      return updated;
    });
  }, []);

  const resetWorkspace = useCallback(() => {
    const defaults = workspaceService.resetWorkspace(userId);
    setWorkspace(defaults);
    showToast('success', 'تم إعادة الضبط', 'تمت استعادة بيئة العمل الافتراضية بنجاح.');
  }, [userId, showToast]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        updateWorkspace,
        updateKpiCard,
        reorderKpiCards,
        resetWorkspace,
        toggleKpiPin,
        toggleKpiVisibility,
        changeKpiSize
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
