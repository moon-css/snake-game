export type Position = { x: number; y: number };
export type Direction = { x: number; y: number };
export type GameState = "menu" | "levelSelect" | "settings" | "playing";


export interface LevelConfig {
  id: number;
  chapter: number;
  name: string;
  mode: string;
  desc: string;
}

export interface MediaAsset {
  type: "image" | "video" | "gif";
  src: string;
  element?: HTMLImageElement | HTMLVideoElement;
  temporary?: boolean;
}

export interface LevelAssets {
  background: MediaAsset | null;
  backgrounds?: MediaAsset[];
  fullSnakeTexture?: MediaAsset | null;
  snakeHead: MediaAsset | null;
  snakeHeadUp?: MediaAsset | null;
  snakeHeadDown?: MediaAsset | null;
  snakeHeadLeft?: MediaAsset | null;
  snakeHeadRight?: MediaAsset | null;
  snakeBody: MediaAsset | null;
  snakeBodyUp?: MediaAsset | null;
  snakeBodyDown?: MediaAsset | null;
  snakeBodyLeft?: MediaAsset | null;
  snakeBodyRight?: MediaAsset | null;
  snakeTail: MediaAsset | null;
  snakeTailUp?: MediaAsset | null;
  snakeTailDown?: MediaAsset | null;
  snakeTailLeft?: MediaAsset | null;
  snakeTailRight?: MediaAsset | null;
  thumbnail: MediaAsset | null;
}

export interface EnemySnake {
  id: number;
  position: Position;
  body: Position[];
  color: string;
  path: Position[];
  pathIndex: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  opacity: number;
  spawnTime: number;
  blinkSpeed: number;
  phaseOffset: number;
}

export type DefaultAssetConfigEntry =
  | { background: string; thumbnail: string; fullSnakeTexture?: string }
  | { backgrounds: string[]; thumbnail: string; fullSnakeTexture?: string };
