export enum GestureState {
  CLOSED = 'CLOSED', // Particles gathered (Saturn)
  OPEN = 'OPEN',     // Particles dispersed
  NONE = 'NONE'      // No hand detected
}

export interface ParticlePoint {
  x: number;
  y: number;
  z: number;
  initialX: number;
  initialY: number;
  initialZ: number;
  randomX: number;
  randomY: number;
  randomZ: number;
  color: string;
  size: number;
}

export interface GeminiVisionResponse {
  gesture: 'OPEN' | 'CLOSED' | 'NONE';
  confidence: number;
}

export interface PhraseData {
  text: string;
  id: number;
}