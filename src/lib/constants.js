export const STORAGE_KEY = 'pou/state/v1';

// Per-minute decay/recovery rates to keep gameplay calm
export const DECAY_AWAKE = { hunger: 0.25, fun: 0.2, clean: 0.15, energy: 0.05 };
export const DECAY_SLEEP = { hunger: 0.12, fun: 0.1, clean: 0.12, energy: -0.6 };

export const WASH_ROWS = 4;
export const WASH_COLS = 4;
export const WASH_TARGET_RATIO = 0.5; // 50% coverage to finish
export const WASH_GOAL = Math.floor(WASH_ROWS * WASH_COLS * WASH_TARGET_RATIO);

export const SOUND_ENABLED = true;

// XP awards per action
export const XP_FEED = 10;
export const XP_PLAY = 10;
export const XP_WASH = 20; // on wash completion

// Coin rewards per action (MVP)
export const COIN_FEED = 1;
export const COIN_PLAY = 1;
export const COIN_WASH = 2; // on wash completion
export const COIN_MINIGAME_PER_POINT = 1; // per point in mini-game

// Food cost per feed/catch (coins are spent, not earned)
export const FEED_COST = 2;


// Mini-game tuning
export const ENERGY_COST_TAP = 10;
export const ENERGY_COST_CATCH = 8;
export const FUN_GAIN_TAP_PER_TAP = 1; // fun += score * this
export const FUN_GAIN_CATCH = 20;
export const COIN_CATCH_REWARD = 5;
export const XP_CATCH_REWARD = 8;

// Social (local storage keys)
export const STORAGE_USER_KEY = 'pou/user/v1';
export const STORAGE_FRIENDS_KEY = 'pou/friends/v1';

