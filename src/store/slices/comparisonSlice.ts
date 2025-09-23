import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { diff } from 'deep-diff';

// Data type interfaces for different comparison types
export interface FeatureToggle {
  FeatureName: string;
  CurrentValue: boolean;
  ToggleType: string;
  ToggleDescription: string;
  ToggleWorkItemId: string;
  ToggleTags: string[];
  IsOnByDefault: boolean;
  AddedDate: string;
  ModuleName: string;
  DBValue: number;
}

export interface SettingsData {
  [key: string]: unknown;
}

export interface CodeTableData {
  [key: string]: unknown;
}

// Union type for all data types
export type ComparisonData = FeatureToggle[] | SettingsData | CodeTableData;

// Custom comparison type interface
export interface CustomComparisonType {
  id: string;
  name: string;
  label: string;
  fetchEndpoint: string;
  saveEndpoint: string;
  description: string;
  sampleData: object;
  comparisonFields: string[];
  responseFields: string[]; // Fields to include in response object
  identifierField?: string; // For array-based data like feature toggles
  requestBody?: Record<string, unknown>; // Optional request body for API calls
  createdAt: string;
}

export interface ComparisonResult {
  path: string;
  type: 'added' | 'deleted' | 'edited' | 'unchanged';
  values: Record<string, unknown>;
  affectedInstances: string[];
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

// Local storage utilities
const COMPARISON_STORAGE_KEY = 'json-sync-diff-comparison-sessions';
const CUSTOM_TYPES_STORAGE_KEY = 'json-sync-diff-custom-types';
const BUILTIN_ENDPOINTS_STORAGE_KEY = 'json-sync-diff-builtin-endpoints';

const saveComparisonSessionsToLocalStorage = (sessions: ComparisonSession[]) => {
  try {
    localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save comparison sessions to localStorage:', error);
  }
};

const loadComparisonSessionsFromLocalStorage = (): ComparisonSession[] => {
  try {
    const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load comparison sessions from localStorage:', error);
    return [];
  }
};

const saveCustomTypesToLocalStorage = (customTypes: CustomComparisonType[]) => {
  try {
    localStorage.setItem(CUSTOM_TYPES_STORAGE_KEY, JSON.stringify(customTypes));
  } catch (error) {
    console.error('Failed to save custom types to localStorage:', error);
  }
};

const loadCustomTypesFromLocalStorage = (): CustomComparisonType[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_TYPES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom types from localStorage:', error);
    return [];
  }
};

const saveBuiltInEndpointsToLocalStorage = (builtInEndpoints: Record<string, { 
  fetchEndpoint: string; 
  saveEndpoint: string;
  requestBody?: Record<string, unknown>; 
}>) => {
  try {
    localStorage.setItem(BUILTIN_ENDPOINTS_STORAGE_KEY, JSON.stringify(builtInEndpoints));
  } catch (error) {
    console.error('Failed to save built-in endpoints to localStorage:', error);
  }
};

const loadBuiltInEndpointsFromLocalStorage = (): Record<string, { 
  fetchEndpoint: string; 
  saveEndpoint: string;
  requestBody?: Record<string, unknown>; 
}> => {
  try {
    const stored = localStorage.getItem(BUILTIN_ENDPOINTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load built-in endpoints from localStorage:', error);
  }
  
  // Return default values if not found in localStorage
  return {
    settings: {
      fetchEndpoint: '/api/settings',
      saveEndpoint: '/TurnOn',
      requestBody: { settingContextRecno: 1 }
    },
    codeTable: {
      fetchEndpoint: '/api/code-table',
      saveEndpoint: '/TurnOn'
    },
    featureToggle: {
      fetchEndpoint: '/GetAllFeatureFlags',
      saveEndpoint: '/TurnOnToggles'
    }
  };
};

interface ComparisonState {
  sessions: ComparisonSession[];
  activeSessionId: string | null;
  selectedInstances: string[];
  baseInstanceId: string | null;
  currentFetchEndpoint: string;
  currentSaveEndpoint: string;
  comparisonType: 'settings' | 'codeTable' | 'featureToggle' | string; // Allow custom types
  customTypes: CustomComparisonType[];
  builtInEndpoints: Record<string, { 
    fetchEndpoint: string; 
    saveEndpoint: string;
    requestBody?: Record<string, unknown>; // Optional request body parameters
  }>;
  loading: boolean;
  error: string | null;
}

const loadedSessions = loadComparisonSessionsFromLocalStorage();
const loadedCustomTypes = loadCustomTypesFromLocalStorage();
const loadedBuiltInEndpoints = loadBuiltInEndpointsFromLocalStorage();

const initialState: ComparisonState = {
  sessions: loadedSessions,
  activeSessionId: loadedSessions[0]?.id || null,
  selectedInstances: [],
  baseInstanceId: null,
  currentFetchEndpoint: '/api/settings',
  currentSaveEndpoint: '/api/settings',
  comparisonType: 'settings',
  customTypes: loadedCustomTypes,
  builtInEndpoints: loadedBuiltInEndpoints,
  loading: false,
  error: null,
};

// Helper function to collect all unique paths from multiple objects
const collectPaths = (objects: Record<string, unknown>[]): string[] => {
  const paths = new Set<string>();
  
  const traverse = (obj: unknown, currentPath: string = '') => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        paths.add(newPath);
        traverse((obj as Record<string, unknown>)[key], newPath);
      });
    }
  };
  
  objects.forEach(obj => traverse(obj));
  return Array.from(paths);
};

// Helper function to get value at path
const getValueAtPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce((current: unknown, key: string) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj);
};

// Specialized comparison functions for different data types
const compareFeatureToggles = (
  instanceData: Record<string, FeatureToggle[]>,
  instanceIds: string[],
  baseInstanceId?: string
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];
  
  // Create a map of all unique feature names across all instances
  const allFeatureNames = new Set<string>();
  const instanceFeatureMaps = new Map<string, Map<string, FeatureToggle>>();
  
  // Build feature maps for each instance
  instanceIds.forEach(instanceId => {
    const features = instanceData[instanceId] || [];
    const featureMap = new Map(features.map(f => [f.FeatureName, f]));
    instanceFeatureMaps.set(instanceId, featureMap);
    
    features.forEach(f => allFeatureNames.add(f.FeatureName));
  });
  
  // Compare each feature across all instances
  allFeatureNames.forEach(featureName => {
    const values: Record<string, unknown> = {};
    const affectedInstances: string[] = [];
    let hasBaseValue = false;
    let baseValue: boolean | undefined;
    let hasDifference = false;
    
    // Collect values from all instances (including missing ones)
    instanceIds.forEach(instanceId => {
      const featureMap = instanceFeatureMaps.get(instanceId);
      const feature = featureMap?.get(featureName);
      
      if (feature) {
        values[instanceId] = feature.CurrentValue;
        affectedInstances.push(instanceId);
        
        if (baseInstanceId && instanceId === baseInstanceId) {
          hasBaseValue = true;
          baseValue = feature.CurrentValue;
        }
      } else {
        // Mark as missing for this instance
        values[instanceId] = 'MISSING';
      }
    });
    
    // Determine if there are differences
    if (baseInstanceId && hasBaseValue) {
      // Base instance comparison: only flag differences from base
      instanceIds.forEach(instanceId => {
        if (instanceId !== baseInstanceId) {
          const otherValue = values[instanceId];
          if (otherValue !== baseValue && otherValue !== 'MISSING') {
            hasDifference = true;
          } else if (otherValue === 'MISSING') {
            hasDifference = true;
          }
        }
      });
    } else {
      // No base instance: flag any differences between instances
      const uniqueValues = new Set(Object.values(values));
      hasDifference = uniqueValues.size > 1;
    }
    
    // Add result if there are differences or if it's a key feature
    if (hasDifference || affectedInstances.length !== instanceIds.length) {
      let type: ComparisonResult['type'] = 'edited';
      let description = '';
      
      // Determine the type of difference
      const missingInstances = instanceIds.filter(id => values[id] === 'MISSING');
      const presentInstances = instanceIds.filter(id => values[id] !== 'MISSING');
      
      if (missingInstances.length > 0 && presentInstances.length > 0) {
        // Some instances have the feature, others don't
        if (baseInstanceId) {
          if (values[baseInstanceId] === 'MISSING') {
            type = 'added';
            description = `Feature "${featureName}" added in ${presentInstances.length} instance(s) (not present in base)`;
          } else {
            type = 'deleted';
            description = `Feature "${featureName}" deleted in ${missingInstances.length} instance(s) (present in base with value ${baseValue})`;
          }
        } else {
          // No base instance defined
          if (missingInstances.length < presentInstances.length) {
            type = 'added';
            description = `Feature "${featureName}" added in ${presentInstances.length} instance(s), missing in ${missingInstances.length}`;
          } else {
            type = 'deleted';
            description = `Feature "${featureName}" deleted in ${missingInstances.length} instance(s), present in ${presentInstances.length}`;
          }
        }
      } else if (presentInstances.length === instanceIds.length) {
        // Present in all instances but with different values
        type = 'edited';
        if (baseInstanceId && hasBaseValue) {
          const differentInstances = instanceIds.filter(id => id !== baseInstanceId && values[id] !== baseValue);
          description = `Feature "${featureName}" differs from base value ${baseValue} in ${differentInstances.length} instance(s)`;
        } else {
          description = `Feature "${featureName}" has inconsistent values across instances`;
        }
      }
      
      results.push({
        path: featureName,
        type,
        values,
        affectedInstances,
        description,
      });
    }
  });
  
  return results;
};

const compareGenericData = (
  instanceData: Record<string, SettingsData | CodeTableData>,
  instanceIds: string[],
  baseInstanceId?: string
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];
  
  // Collect all unique paths across all instances
  const allPaths = collectPaths(Object.values(instanceData));
  
  allPaths.forEach(path => {
    const values: Record<string, unknown> = {};
    const affectedInstances: string[] = [];
    let hasBaseValue = false;
    let baseValue: unknown;
    let hasDifference = false;
    
    // Collect values from all instances for this path
    instanceIds.forEach(instanceId => {
      const data = instanceData[instanceId];
      if (data) {
        const value = getValueAtPath(data, path);
        if (value !== undefined) {
          values[instanceId] = value;
          affectedInstances.push(instanceId);
          
          if (baseInstanceId && instanceId === baseInstanceId) {
            hasBaseValue = true;
            baseValue = value;
          }
        } else {
          values[instanceId] = 'MISSING';
        }
      } else {
        values[instanceId] = 'MISSING';
      }
    });
    
    // Determine if there are differences
    if (baseInstanceId && hasBaseValue) {
      // Base instance comparison: only flag differences from base
      instanceIds.forEach(instanceId => {
        if (instanceId !== baseInstanceId) {
          const otherValue = values[instanceId];
          if (JSON.stringify(otherValue) !== JSON.stringify(baseValue) && otherValue !== 'MISSING') {
            hasDifference = true;
          } else if (otherValue === 'MISSING') {
            hasDifference = true;
          }
        }
      });
    } else {
      // No base instance: flag any differences between instances
      const uniqueValues = new Set(Object.values(values).map(v => JSON.stringify(v)));
      hasDifference = uniqueValues.size > 1;
    }
    
    // Add result if there are differences
    if (hasDifference) {
      let type: ComparisonResult['type'] = 'edited';
      let description = '';
      
      // Determine the type of difference
      const missingInstances = instanceIds.filter(id => values[id] === 'MISSING');
      const presentInstances = instanceIds.filter(id => values[id] !== 'MISSING');
      
      if (missingInstances.length > 0 && presentInstances.length > 0) {
        // Some instances have the setting, others don't
        if (baseInstanceId) {
          if (values[baseInstanceId] === 'MISSING') {
            type = 'added';
            description = `Setting at "${path}" added in ${presentInstances.length} instance(s) (not present in base)`;
          } else {
            type = 'deleted';
            description = `Setting at "${path}" deleted in ${missingInstances.length} instance(s) (present in base)`;
          }
        } else {
          // No base instance defined
          if (missingInstances.length < presentInstances.length) {
            type = 'added';
            description = `Setting at "${path}" added in ${presentInstances.length} instance(s), missing in ${missingInstances.length}`;
          } else {
            type = 'deleted';
            description = `Setting at "${path}" deleted in ${missingInstances.length} instance(s), present in ${presentInstances.length}`;
          }
        }
      } else if (presentInstances.length === instanceIds.length) {
        // Present in all instances but with different values
        type = 'edited';
        if (baseInstanceId && hasBaseValue) {
          const differentInstances = instanceIds.filter(id => id !== baseInstanceId && JSON.stringify(values[id]) !== JSON.stringify(baseValue));
          description = `Setting at "${path}" differs from base value in ${differentInstances.length} instance(s)`;
        } else {
          description = `Setting at "${path}" has inconsistent values across instances`;
        }
      }
      
      results.push({
        path,
        type,
        values,
        affectedInstances,
        description,
      });
    }
  });
  
  return results;
};

// Custom comparison function for array-based custom types
const compareCustomArrayData = (
  instanceData: Record<string, Record<string, unknown>[]>,
  instanceIds: string[],
  customType: CustomComparisonType,
  baseInstanceId?: string
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];
  
  if (!customType.identifierField) return results;
  
  // Create a map of all unique items across all instances
  const allItemIds = new Set<string>();
  const instanceItemMaps = new Map<string, Map<string, Record<string, unknown>>>();
  
  // Build item maps for each instance
  instanceIds.forEach(instanceId => {
    const items = instanceData[instanceId] || [];
    const itemMap = new Map<string, Record<string, unknown>>();
    
    items.forEach(item => {
      const identifier = String(item[customType.identifierField!]);
      if (identifier) {
        allItemIds.add(identifier);
        itemMap.set(identifier, item);
      }
    });
    
    instanceItemMaps.set(instanceId, itemMap);
  });
  
  // Compare each item across all instances
  allItemIds.forEach(itemId => {
    const values: Record<string, unknown> = {};
    const affectedInstances: string[] = [];
    let hasBaseValue = false;
    let baseValue: unknown;
    let hasDifference = false;
    
    // Collect values from all instances for comparison fields
    instanceIds.forEach(instanceId => {
      const itemMap = instanceItemMaps.get(instanceId);
      const item = itemMap?.get(itemId);
      
      if (item) {
        const itemValues: Record<string, unknown> = {};
        customType.comparisonFields.forEach(field => {
          itemValues[field] = getValueAtPath(item, field);
        });
        values[instanceId] = itemValues;
        affectedInstances.push(instanceId);
        
        if (baseInstanceId && instanceId === baseInstanceId) {
          hasBaseValue = true;
          baseValue = itemValues;
        }
      } else {
        values[instanceId] = 'MISSING';
      }
    });
    
    // Determine if there are differences
    if (baseInstanceId && hasBaseValue) {
      instanceIds.forEach(instanceId => {
        if (instanceId !== baseInstanceId) {
          const otherValue = values[instanceId];
          if (JSON.stringify(otherValue) !== JSON.stringify(baseValue) && otherValue !== 'MISSING') {
            hasDifference = true;
          } else if (otherValue === 'MISSING') {
            hasDifference = true;
          }
        }
      });
    } else {
      const uniqueValues = new Set(Object.values(values).map(v => JSON.stringify(v)));
      hasDifference = uniqueValues.size > 1;
    }
    
    // Add result if there are differences
    if (hasDifference) {
      let type: ComparisonResult['type'] = 'edited';
      let description = '';
      
      const missingInstances = instanceIds.filter(id => values[id] === 'MISSING');
      const presentInstances = instanceIds.filter(id => values[id] !== 'MISSING');
      
      if (missingInstances.length > 0 && presentInstances.length > 0) {
        if (baseInstanceId) {
          if (values[baseInstanceId] === 'MISSING') {
            type = 'added';
            description = `${customType.label} item "${itemId}" added in ${presentInstances.length} instance(s) (not present in base)`;
          } else {
            type = 'deleted';
            description = `${customType.label} item "${itemId}" deleted in ${missingInstances.length} instance(s) (present in base)`;
          }
        } else {
          if (missingInstances.length < presentInstances.length) {
            type = 'added';
            description = `${customType.label} item "${itemId}" added in ${presentInstances.length} instance(s), missing in ${missingInstances.length}`;
          } else {
            type = 'deleted';
            description = `${customType.label} item "${itemId}" deleted in ${missingInstances.length} instance(s), present in ${presentInstances.length}`;
          }
        }
      } else if (presentInstances.length === instanceIds.length) {
        type = 'edited';
        if (baseInstanceId && hasBaseValue) {
          const differentInstances = instanceIds.filter(id => id !== baseInstanceId && JSON.stringify(values[id]) !== JSON.stringify(baseValue));
          description = `${customType.label} item "${itemId}" differs from base in ${differentInstances.length} instance(s)`;
        } else {
          description = `${customType.label} item "${itemId}" has inconsistent values across instances`;
        }
      }
      
      results.push({
        path: itemId,
        type,
        values,
        affectedInstances,
        description,
      });
    }
  });
  
  return results;
};

// Custom comparison function for object-based custom types
const compareCustomObjectData = (
  instanceData: Record<string, SettingsData | CodeTableData>,
  instanceIds: string[],
  customType: CustomComparisonType,
  baseInstanceId?: string
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];
  
  // Only compare specified fields
  customType.comparisonFields.forEach(fieldPath => {
    const values: Record<string, unknown> = {};
    const affectedInstances: string[] = [];
    let hasBaseValue = false;
    let baseValue: unknown;
    let hasDifference = false;
    
    // Collect values from all instances for this field
    instanceIds.forEach(instanceId => {
      const data = instanceData[instanceId];
      if (data) {
        const value = getValueAtPath(data, fieldPath);
        if (value !== undefined) {
          values[instanceId] = value;
          affectedInstances.push(instanceId);
          
          if (baseInstanceId && instanceId === baseInstanceId) {
            hasBaseValue = true;
            baseValue = value;
          }
        } else {
          values[instanceId] = 'MISSING';
        }
      } else {
        values[instanceId] = 'MISSING';
      }
    });
    
    // Determine if there are differences
    if (baseInstanceId && hasBaseValue) {
      instanceIds.forEach(instanceId => {
        if (instanceId !== baseInstanceId) {
          const otherValue = values[instanceId];
          if (JSON.stringify(otherValue) !== JSON.stringify(baseValue) && otherValue !== 'MISSING') {
            hasDifference = true;
          } else if (otherValue === 'MISSING') {
            hasDifference = true;
          }
        }
      });
    } else {
      const uniqueValues = new Set(Object.values(values).map(v => JSON.stringify(v)));
      hasDifference = uniqueValues.size > 1;
    }
    
    // Add result if there are differences
    if (hasDifference) {
      let type: ComparisonResult['type'] = 'edited';
      let description = '';
      
      const missingInstances = instanceIds.filter(id => values[id] === 'MISSING');
      const presentInstances = instanceIds.filter(id => values[id] !== 'MISSING');
      
      if (missingInstances.length > 0 && presentInstances.length > 0) {
        if (baseInstanceId) {
          if (values[baseInstanceId] === 'MISSING') {
            type = 'added';
            description = `${customType.label} field "${fieldPath}" added in ${presentInstances.length} instance(s) (not present in base)`;
          } else {
            type = 'deleted';
            description = `${customType.label} field "${fieldPath}" deleted in ${missingInstances.length} instance(s) (present in base)`;
          }
        } else {
          if (missingInstances.length < presentInstances.length) {
            type = 'added';
            description = `${customType.label} field "${fieldPath}" added in ${presentInstances.length} instance(s), missing in ${missingInstances.length}`;
          } else {
            type = 'deleted';
            description = `${customType.label} field "${fieldPath}" deleted in ${missingInstances.length} instance(s), present in ${presentInstances.length}`;
          }
        }
      } else if (presentInstances.length === instanceIds.length) {
        type = 'edited';
        if (baseInstanceId && hasBaseValue) {
          const differentInstances = instanceIds.filter(id => id !== baseInstanceId && JSON.stringify(values[id]) !== JSON.stringify(baseValue));
          description = `${customType.label} field "${fieldPath}" differs from base value in ${differentInstances.length} instance(s)`;
        } else {
          description = `${customType.label} field "${fieldPath}" has inconsistent values across instances`;
        }
      }
      
      results.push({
        path: fieldPath,
        type,
        values,
        affectedInstances,
        description,
      });
    }
  });
  
  return results;
};

const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    setSelectedInstances: (state, action: PayloadAction<string[]>) => {
      state.selectedInstances = action.payload;
      // Reset base instance if it's no longer in selected instances
      if (state.baseInstanceId && !action.payload.includes(state.baseInstanceId)) {
        state.baseInstanceId = null;
      }
    },
    setBaseInstanceId: (state, action: PayloadAction<string | null>) => {
      state.baseInstanceId = action.payload;
    },
    setComparisonType: (state, action: PayloadAction<'settings' | 'codeTable' | 'featureToggle' | string>) => {
      state.comparisonType = action.payload;
      // Update endpoints based on type
      const customType = state.customTypes.find(t => t.id === action.payload);
      if (customType) {
        state.currentFetchEndpoint = customType.fetchEndpoint;
        state.currentSaveEndpoint = customType.saveEndpoint;
      } else {
        // Use configurable built-in endpoints
        const builtInConfig = state.builtInEndpoints[action.payload];
        if (builtInConfig) {
          state.currentFetchEndpoint = builtInConfig.fetchEndpoint;
          state.currentSaveEndpoint = builtInConfig.saveEndpoint;
        }
      }
    },
    updateBuiltInEndpoints: (state, action: PayloadAction<{ 
      type: string; 
      fetchEndpoint: string; 
      saveEndpoint: string; 
      requestBody?: Record<string, unknown> 
    }>) => {
      const { type, fetchEndpoint, saveEndpoint, requestBody } = action.payload;
      state.builtInEndpoints[type] = { 
        fetchEndpoint, 
        saveEndpoint,
        ...(requestBody ? { requestBody } : {})
      };
      // Update current endpoints if this is the active type
      if (state.comparisonType === type) {
        state.currentFetchEndpoint = fetchEndpoint;
        state.currentSaveEndpoint = saveEndpoint;
      }
      // Save to localStorage
      saveBuiltInEndpointsToLocalStorage(state.builtInEndpoints);
    },
    addCustomComparisonType: (state, action: PayloadAction<Omit<CustomComparisonType, 'id' | 'createdAt'>>) => {
      const newType: CustomComparisonType = {
        ...action.payload,
        id: `custom-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      state.customTypes.push(newType);
      saveCustomTypesToLocalStorage(state.customTypes);
    },
    updateCustomComparisonType: (state, action: PayloadAction<CustomComparisonType>) => {
      const index = state.customTypes.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.customTypes[index] = action.payload;
        saveCustomTypesToLocalStorage(state.customTypes);
        // Update current endpoints if this is the active type
        if (state.comparisonType === action.payload.id) {
          state.currentFetchEndpoint = action.payload.fetchEndpoint;
          state.currentSaveEndpoint = action.payload.saveEndpoint;
        }
      }
    },
    deleteCustomComparisonType: (state, action: PayloadAction<string>) => {
      state.customTypes = state.customTypes.filter(t => t.id !== action.payload);
      saveCustomTypesToLocalStorage(state.customTypes);
      // If the deleted type was currently selected, reset to settings
      if (state.comparisonType === action.payload) {
        state.comparisonType = 'settings';
        const settingsConfig = state.builtInEndpoints.settings;
        state.currentFetchEndpoint = settingsConfig.fetchEndpoint;
        state.currentSaveEndpoint = settingsConfig.saveEndpoint;
      }
    },
    createComparisonSession: (state, action: PayloadAction<{
      name: string;
      instanceIds: string[];
      endpoint: string;
      instanceData: Record<string, ComparisonData>;
    }>) => {
      const { name, instanceIds, endpoint, instanceData } = action.payload;
      
      if (instanceIds.length < 2) {
        state.error = 'At least 2 instances are required for comparison';
        return;
      }

      const results: ComparisonResult[] = [];

      // Use specialized comparison based on comparison type
      const customType = state.customTypes.find(t => t.id === state.comparisonType);
      
      if (state.comparisonType === 'featureToggle') {
        const featureToggleData: Record<string, FeatureToggle[]> = {};
        instanceIds.forEach(id => {
          if (instanceData[id]) {
            featureToggleData[id] = instanceData[id] as FeatureToggle[];
          }
        });
        results.push(...compareFeatureToggles(featureToggleData, instanceIds, state.baseInstanceId || undefined));
      } else if (customType && customType.identifierField) {
        // Custom type with array data (like feature toggles)
        const customArrayData: Record<string, Record<string, unknown>[]> = {};
        instanceIds.forEach(id => {
          if (instanceData[id]) {
            customArrayData[id] = instanceData[id] as unknown as Record<string, unknown>[];
          }
        });
        results.push(...compareCustomArrayData(customArrayData, instanceIds, customType, state.baseInstanceId || undefined));
      } else if (customType && customType.comparisonFields.length > 0) {
        // Custom type with object data and specific fields
        const genericData: Record<string, SettingsData | CodeTableData> = {};
        instanceIds.forEach(id => {
          if (instanceData[id]) {
            genericData[id] = instanceData[id] as SettingsData | CodeTableData;
          }
        });
        results.push(...compareCustomObjectData(genericData, instanceIds, customType, state.baseInstanceId || undefined));
      } else {
        // Use generic comparison for settings and codeTable
        const genericData: Record<string, SettingsData | CodeTableData> = {};
        instanceIds.forEach(id => {
          if (instanceData[id]) {
            genericData[id] = instanceData[id] as SettingsData | CodeTableData;
          }
        });
        results.push(...compareGenericData(genericData, instanceIds, state.baseInstanceId || undefined));
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
      
      // Save to localStorage
      saveComparisonSessionsToLocalStorage(state.sessions);
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
  setBaseInstanceId,
  setComparisonType,
  updateBuiltInEndpoints,
  addCustomComparisonType,
  updateCustomComparisonType,
  deleteCustomComparisonType,
  createComparisonSession,
  setActiveSession,
  deleteSession,
  setLoading,
  setError,
  clearError,
} = comparisonSlice.actions;

export default comparisonSlice.reducer;