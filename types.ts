
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LANDED = 'LANDED', // Successfully landed, showing quiz
  CRASHED = 'CRASHED', // Failed landing logic
  EXPLODING = 'EXPLODING', // 3-second explosion animation
  GAME_OVER = 'GAME_OVER', // Text screen before menu
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface LanderStats {
  thrustPower: number;
  rotationSpeed: number;
  name: string;
}

export interface Player {
  position: Vector2D;
  velocity: Vector2D;
  angle: number; // in radians
  fuel: number;
  thrusting: boolean;
  rotatingLeft: boolean;
  rotatingRight: boolean;
  enginePower: number;
}

export interface MathQuestion {
  question: string;
  answer: number;
  options: number[];
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  visited: boolean;
  id: number;
  type: 'EASY' | 'MEDIUM' | 'HARD';
  color: string;
  points: number;
  difficultyLevel: number; // 1-3 scale for API
  question?: MathQuestion; // Preloaded question
  isLoadingQuestion?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface HighScore {
  score: number;
  date: string;
}