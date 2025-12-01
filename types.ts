export interface UserSettings {
  dwellTime: number; // in ms
  sensitivity: number; // 1-10
  smoothing: number; // 1-10
  theme: 'dark' | 'high-contrast';
  isTrackingEnabled: boolean;
  isVoiceEnabled: boolean;
  showGazePath: boolean;
}

export interface TrackingStats {
  accuracy: number; // percentage
  sessionDuration: string;
  clicksCount: number;
  batteryUsage: string;
}

export type ViewState = 'dashboard' | 'calibration' | 'settings' | 'tutorial';

// Voice API Types
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
  webgazer: any;
}