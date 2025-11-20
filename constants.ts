
import { LanderStats } from './types';

export const GRAVITY = 0.04; // Low gravity moon feel
export const MAX_LANDING_SPEED = 1.5; // Stricter (Reverted from forgiving)
export const MAX_LANDING_ANGLE = 0.3; // Stricter (~17 degrees)
export const MAX_FALL_SPEED = 4.0; // Cap terminal velocity
export const FUEL_CONSUMPTION = 0.3;
export const INITIAL_FUEL = 100;
export const FUEL_REWARD = 40;
export const CANVAS_WIDTH = 800; // Internal resolution
export const CANVAS_HEIGHT = 600;

export const LANDER_TYPES: Record<string, LanderStats> = {
  LIGHT: {
    name: 'LIGHT LANDER',
    thrustPower: 0.09,
    rotationSpeed: 0.06,
  },
  HEAVY: {
    name: 'HEAVY LANDER',
    thrustPower: 0.075, // Increased from 0.05 for better lift
    rotationSpeed: 0.03, // Slower turning
  }
};

export const COLORS = {
  background: '#050505',
  player: '#ffffff',
  playerStroke: '#0ea5e9', // Sky blue neon
  thrust: '#f59e0b', // Amber
  platformVisited: '#52525b', // Zinc 600
  text: '#e0f2fe',
  danger: '#ef4444',
};

export const PLATFORM_CONFIG = {
  EASY: { color: '#22c55e', difficulty: 1, minPoints: 10 },   // Green
  MEDIUM: { color: '#eab308', difficulty: 2, minPoints: 40 }, // Yellow
  HARD: { color: '#ef4444', difficulty: 3, minPoints: 70 },   // Red
};

export const INITIAL_PLAYER_STATE = {
  position: { x: 400, y: 300 }, // Start in middle
  velocity: { x: 0, y: 0 },
  angle: -Math.PI / 2, // Pointing up
  fuel: INITIAL_FUEL,
  thrusting: false,
  rotatingLeft: false,
  rotatingRight: false,
  enginePower: 0,
};