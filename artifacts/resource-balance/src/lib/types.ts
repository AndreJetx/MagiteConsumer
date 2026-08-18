export type Period = 'minute' | 'hour' | 'day' | 'week';
export type Frequency = 'once' | 'minute' | 'hour' | 'day' | 'week' | 'interval';
export type SourceKind = 'gain' | 'consume';

export interface Source {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  occurrences: number;
  addedAt?: string;
  intervalDays?: number;
}

export interface Simulation {
  battles: number;
  activities: number;
  gainAdjustment: number;
  consumptionAdjustment: number;
}

export interface Scenario {
  id: string;
  name: string;
  resourceName: string;
  balance: number;
  period: Period;
  gains: Source[];
  consumptions: Source[];
  simulation: Simulation;
}

export interface AppState {
  scenarios: Scenario[];
  activeId: string;
}
