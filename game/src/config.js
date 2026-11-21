// Shared tuning for Midnight Pantry: sizes, speeds, vision and scoring.
// Everything else reads its numbers from here so the game stays in balance.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const WALL_T = 28; // thickness of the pantry's outer walls

export const PLAYER_RADIUS = 15;
export const PLAYER_WALK = 152; // px per second
export const PLAYER_RUN = 238;
export const PLAYER_SNEAK = 84;

export const NOISE_RADIUS = { run: 96, walk: 42, sneak: 0 };
export const STEP_SECONDS = { run: 0.32, walk: 0.46, sneak: 0.6 };

export const CAT_RADIUS = 18;
export const CAT_PATROL_SPEED = 72;
export const CAT_CHASE_SPEED = 168;
export const CAT_INVESTIGATE_SPEED = 118;
export const CAT_TURN_RATE = 3.4; // radians per second toward a heading

export const CONE_RANGE = 188;
export const CONE_HALF_ANGLE = 0.64; // radians, about 37 degrees each side

// Detection meter, 0..1. Fills while a cat can see the mouse, drains while
// it cannot. The fill rate scales with distance and stance (see guards.js).
export const DETECT_SUSPECT = 0.45; // cat stops and stares
export const DETECT_ALERT = 1.0; // cat gives chase
export const DETECT_DECAY = 0.42; // per second while unseen
export const CHASE_MEMORY = 2.6; // seconds a cat hunts the last seen spot
export const CATCH_DISTANCE = 27;

export const CRUMB_NOISE_RADIUS = 138;
export const CRUMB_FLY_SECONDS = 0.38;

export const SCORE_CHEESE = 150;
export const SCORE_LEVEL_CLEAR = 1000;
export const SCORE_GHOST_BONUS = 400; // never pushed a cat past suspect
export const SCORE_TIME_BONUS_MAX = 600;
export const SCORE_TIME_BONUS_RATE = 5; // points lost per second taken

export const COLORS = {
  floorDark: '#241a2e',
  wallWood: '#4a3220',
  wallWoodLight: '#6b4a2c',
  crateWood: '#8a6134',
  crateWoodDark: '#6e4a26',
  rugRed: '#5e2436',
  rugTrim: '#c9a24d',
  coneCalm: 'rgba(255, 196, 77, 0.30)',
  coneSuspect: 'rgba(255, 140, 40, 0.42)',
  coneAlert: 'rgba(255, 64, 48, 0.50)',
  cheese: '#ffd94d',
  exitGlow: '#8affc1',
};
