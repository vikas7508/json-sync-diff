import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { diff } from 'deep-diff';
import { demoComparisonSessions } from '@/data/demoData';

export interface ComparisonResult {
  path: string;
  type: 'added' | 'deleted' | 'edited' | 'unchanged';
  leftValue?: any;
  rightValue?: any;
  description: string;
}

export interface ComparisonSession {
  id: string;
  name: string;
  instanceIds: string[];
  endpoint: string;
  timestamp: string;
  results: ComparisonResult[];
  summary: {
    totalDifferences: number;
    added: number;
    deleted: number;
    edited: number;
  };
}

interface ComparisonState {
  sessions: ComparisonSession[];
  activeSessionId: string | null;
  selectedInstances: string[];
  currentEndpoint: string;
  comparisonType: 'settings' | 'codeTable' | 'featureToggle';
  loading: boolean;
  error: string | null;
}

const initialState: ComparisonState = {
  sessions: demoComparisonSessions, // Load demo data
  activeSessionId: demoComparisonSessions[0]?.id || null, // Set first session as active
  selectedInstances: ['prod-001', 'staging-001'], // Pre-select demo instances
  currentEndpoint: '/api/settings',
  comparisonType: 'settings',
  loading: false,
  error: null,
};

const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    setSelectedInstances: (state, action: PayloadAction<string[]>) => {
      state.selectedInstances = action.payload;
    },
    setCurrentEndpoint: (state, action: PayloadAction<string>) => {
      state.currentEndpoint = action.payload;
    },
    setComparisonType: (state, action: PayloadAction<'settings' | 'codeTable' | 'featureToggle'>) => {
      state.comparisonType = action.payload;
      // Update endpoint based on type
      switch (action.payload) {
        case 'settings':
          state.currentEndpoint = '/api/settings';
          break;
        case 'codeTable':
          state.currentEndpoint = '/api/code-table';
          break;
        case 'featureToggle':
          state.currentEndpoint = '/api/feature-toggles';
          break;
      }
    },
    createComparisonSession: (state, action: PayloadAction<{
      name: string;
      instanceIds: string[];
      endpoint: string;
      instanceData: Record<string, any>;
    }>) => {
      const { name, instanceIds, endpoint, instanceData } = action.payload;
      
      if (instanceIds.length < 2) {
        state.error = 'At least 2 instances are required for comparison';
        return;
      }

      const results: ComparisonResult[] = [];
      const baseInstanceId = instanceIds[0];
      const baseData = instanceData[baseInstanceId];

      // Compare base instance with all others
      for (let i = 1; i < instanceIds.length; i++) {
        const compareInstanceId = instanceIds[i];
        const compareData = instanceData[compareInstanceId];
        
        if (baseData && compareData) {
          const differences = diff(baseData, compareData) || [];
          
          differences.forEach((d: any) => {
            const path = d.path ? d.path.join('.') : 'root';
            let type: ComparisonResult['type'] = 'unchanged';
            let description = '';
            
            switch (d.kind) {
              case 'N': // New
                type = 'added';
                description = `Added in ${compareInstanceId}`;
                break;
              case 'D': // Deleted
                type = 'deleted';
                description = `Deleted in ${compareInstanceId}`;
                break;
              case 'E': // Edited
                type = 'edited';
                description = `Changed in ${compareInstanceId}`;
                break;
              case 'A': // Array change
                type = 'edited';
                description = `Array modified in ${compareInstanceId}`;
                break;
            }
            
            results.push({
              path,
              type,
              leftValue: d.lhs,
              rightValue: d.rhs,
              description,
            });
          });
        }
      }

      // Calculate summary
      const summary = {
        totalDifferences: results.length,
        added: results.filter(r => r.type === 'added').length,
        deleted: results.filter(r => r.type === 'deleted').length,
        edited: results.filter(r => r.type === 'edited').length,
      };

      const session: ComparisonSession = {
        id: Date.now().toString(),
        name,
        instanceIds,
        endpoint,
        timestamp: new Date().toISOString(),
        results,
        summary,
      };

      state.sessions.push(session);
      state.activeSessionId = session.id;
      state.error = null;
    },
    setActiveSession: (state, action: PayloadAction<string>) => {
      state.activeSessionId = action.payload;
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setSelectedInstances,
  setCurrentEndpoint,
  setComparisonType,
  createComparisonSession,
  setActiveSession,
  deleteSession,
  setLoading,
  setError,
  clearError,
} = comparisonSlice.actions;

export default comparisonSlice.reducer;