import { createContext } from 'react';
import type { DemoState } from './DemoProvider';

// Keep context identity independent of modules exporting refreshable components.
export const DemoContext = createContext<DemoState | null>(null);