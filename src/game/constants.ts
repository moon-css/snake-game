import type { Direction, Position } from "./types";

export const GRID_SIZE = 20;
export const CELL_SIZE = 24;
export const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
export const INITIAL_DIRECTION: Direction = { x: 1, y: 0 };
export const GAME_SPEED = 150;
/** 素材缓存版本；递增后旧 localStorage 素材会清空 */
export const ASSETS_VERSION = 5;
