import { configureStore } from '@reduxjs/toolkit';
import instancesReducer from './slices/instancesSlice';
import comparisonReducer from './slices/comparisonSlice';

export const store = configureStore({
  reducer: {
    instances: instancesReducer,
    comparison: comparisonReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;