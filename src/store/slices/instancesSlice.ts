import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Instance {
  id: string;
  name: string;
  url: string;
  authKey: string;
  isActive: boolean;
  lastSync?: string;
  status?: 'connected' | 'disconnected' | 'loading' | 'error';
}

export interface InstanceData {
  instanceId: string;
  data: unknown;
  timestamp: string;
  error?: string;
}

// Local storage utilities
const INSTANCES_STORAGE_KEY = 'json-sync-diff-instances';
const INSTANCE_DATA_STORAGE_KEY = 'json-sync-diff-instance-data';

const saveInstancesToLocalStorage = (instances: Instance[]) => {
  try {
    localStorage.setItem(INSTANCES_STORAGE_KEY, JSON.stringify(instances));
  } catch (error) {
    // Failed to save instances to localStorage
  }
};

const loadInstancesFromLocalStorage = (): Instance[] => {
  try {
    const stored = localStorage.getItem(INSTANCES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    // Failed to load instances from localStorage
    return [];
  }
};

const saveInstanceDataToLocalStorage = (instanceData: Record<string, InstanceData>) => {
  try {
    localStorage.setItem(INSTANCE_DATA_STORAGE_KEY, JSON.stringify(instanceData));
  } catch (error) {
    // Failed to save instance data to localStorage
  }
};

const loadInstanceDataFromLocalStorage = (): Record<string, InstanceData> => {
  try {
    const stored = localStorage.getItem(INSTANCE_DATA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    // Failed to load instance data from localStorage
    return {};
  }
};

interface InstancesState {
  instances: Instance[];
  instanceData: Record<string, InstanceData>;
  loading: boolean;
  error: string | null;
}

const loadedInstances = loadInstancesFromLocalStorage();
const loadedInstanceData = loadInstanceDataFromLocalStorage();

const initialState: InstancesState = {
  instances: loadedInstances,
  instanceData: loadedInstanceData,
  loading: false,
  error: null,
};

// Async thunk for fetching data from an instance
export const fetchInstanceData = createAsyncThunk(
  'instances/fetchData',
  async ({ 
    instanceId, 
    endpoint, 
    requestBody 
  }: { 
    instanceId: string; 
    endpoint: string; 
    requestBody?: Record<string, unknown> 
  }, { getState }) => {
    const state = getState() as { instances: InstancesState };
    const instance = state.instances.instances.find(i => i.id === instanceId);
    
    if (!instance) {
      throw new Error('Instance not found');
    }

    const response = await fetch(`${instance.url}${endpoint}?authkey=${instance.authKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody || { action: 'fetch' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      instanceId,
      data,
      timestamp: new Date().toISOString(),
    };
  }
);

// Async thunk for posting data to an instance
export const postInstanceData = createAsyncThunk(
  'instances/postData',
  async ({ instanceId, endpoint, data }: { instanceId: string; endpoint: string; data: unknown }, { getState }) => {
    const state = getState() as { instances: InstancesState };
    const instance = state.instances.instances.find(i => i.id === instanceId);
    
    if (!instance) {
      throw new Error('Instance not found');
    }

    const response = await fetch(`${instance.url}${endpoint}?authkey=${instance.authKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to post data: ${response.statusText}`);
    }

    return await response.json();
  }
);

const instancesSlice = createSlice({
  name: 'instances',
  initialState,
  reducers: {
    addInstance: (state, action: PayloadAction<Omit<Instance, 'id'>>) => {
      const newInstance: Instance = {
        ...action.payload,
        id: Date.now().toString(),
        status: 'disconnected',
      };
      state.instances.push(newInstance);
      saveInstancesToLocalStorage(state.instances);
    },
    updateInstance: (state, action: PayloadAction<Instance>) => {
      const index = state.instances.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.instances[index] = action.payload;
        saveInstancesToLocalStorage(state.instances);
      }
    },
    removeInstance: (state, action: PayloadAction<string>) => {
      state.instances = state.instances.filter(i => i.id !== action.payload);
      delete state.instanceData[action.payload];
      saveInstancesToLocalStorage(state.instances);
      saveInstanceDataToLocalStorage(state.instanceData);
    },
    toggleInstanceActive: (state, action: PayloadAction<string>) => {
      const instance = state.instances.find(i => i.id === action.payload);
      if (instance) {
        instance.isActive = !instance.isActive;
        saveInstancesToLocalStorage(state.instances);
      }
    },
    setInstanceStatus: (state, action: PayloadAction<{ id: string; status: Instance['status'] }>) => {
      const instance = state.instances.find(i => i.id === action.payload.id);
      if (instance) {
        instance.status = action.payload.status;
        saveInstancesToLocalStorage(state.instances);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInstanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInstanceData.fulfilled, (state, action) => {
        state.loading = false;
        state.instanceData[action.payload.instanceId] = action.payload;
        saveInstanceDataToLocalStorage(state.instanceData);
        const instance = state.instances.find(i => i.id === action.payload.instanceId);
        if (instance) {
          instance.status = 'connected';
          instance.lastSync = action.payload.timestamp;
          saveInstancesToLocalStorage(state.instances);
        }
      })
      .addCase(fetchInstanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch data';
        const instanceId = action.meta.arg.instanceId;
        const instance = state.instances.find(i => i.id === instanceId);
        if (instance) {
          instance.status = 'error';
        }
      })
      .addCase(postInstanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postInstanceData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(postInstanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to post data';
      });
  },
});

export const {
  addInstance,
  updateInstance,
  removeInstance,
  toggleInstanceActive,
  setInstanceStatus,
  clearError,
} = instancesSlice.actions;

export default instancesSlice.reducer;