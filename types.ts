export interface ProcessedImage {
  id: number;
  dataUrl: string;
  originalIndex: number; // 0-8
  width: number;
  height: number;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface SplitOptions {
  threshold: number; // 0-255 sensitivity for border removal
  padding: number; // Extra padding to trim
}
