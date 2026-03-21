export type Step = 'prologue' | 'record' | 'ritual' | 'result' | 'backtrack' | 'galaxy';
export type DreamType = 'sweet' | 'nightmare' | 'fantasy' | 'memory';

export interface AIResult {
  title: string;
  summary: string;
  interpretation: string;
  suggestion: string;
  color: string;
  gradient: string;
  shadow: string;
  keyword: string;
  backgroundImage?: string;
  imagePrompt?: string;
  date: string;
  time: string;
  dreamType: DreamType;
  id: string;
  originalText: string;
}

export interface HistoryDream extends AIResult {
  x: number;
  y: number;
}
