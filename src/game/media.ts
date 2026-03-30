import { bgmCover, bgmSelect, coverImage } from "./assetImports";
import type { LevelAssets } from "./types";

/** 图片/视频是否可安全用于 Canvas drawImage（broken 图会抛 InvalidStateError） */
export function isDrawableCanvasImageSource(
  el: HTMLImageElement | HTMLVideoElement | undefined,
): el is HTMLImageElement | HTMLVideoElement {
  if (!el) return false;
  if (el instanceof HTMLImageElement) {
    return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
  }
  if (el instanceof HTMLVideoElement) {
    return el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  return false;
}

export function safeDrawImageDest(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): boolean {
  if (!isDrawableCanvasImageSource(el)) return false;
  try {
    ctx.drawImage(el, dx, dy, dw, dh);
    return true;
  } catch {
    return false;
  }
}

/**
 * 为 img 设置 src；仅对外域 http(s) 资源设置 crossOrigin，避免同源/打包 URL 因 CORS 导致加载失败。
 * （须先设 crossOrigin 再设 src）
 */
function configureImageForUrl(img: HTMLImageElement, url: string): void {
  if (typeof window !== "undefined") {
    try {
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        // 本地 data/blob 不设 crossOrigin
      } else {
        const abs = new URL(url, window.location.href);
        if (
          (abs.protocol === "http:" || abs.protocol === "https:") &&
          abs.origin !== window.location.origin
        ) {
          img.crossOrigin = "anonymous";
        }
      }
    } catch {
      /* 非法 URL 时直接赋值 */
    }
  }
  img.src = url;
}

/** 按 URL 复用同一 Image 实例，避免返回页面时重复请求与解码 */
const sharedImageByUrl = new Map<string, HTMLImageElement>();

export function getSharedImageElement(url: string): HTMLImageElement {
  const existing = sharedImageByUrl.get(url);
  if (existing) return existing;
  const img = new Image();
  configureImageForUrl(img, url);
  sharedImageByUrl.set(url, img);
  return img;
}

/** 按 URL 复用同一 Video 实例（单 DOM 父级，切页时随挂载点移动） */
const sharedVideoByUrl = new Map<string, HTMLVideoElement>();

export function getSharedVideoElement(url: string): HTMLVideoElement {
  const existing = sharedVideoByUrl.get(url);
  if (existing) return existing;
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.autoplay = true;
  video.load();
  video.addEventListener("loadeddata", () => {
    video.play().catch(() => {});
  });
  sharedVideoByUrl.set(url, video);
  return video;
}

export function isVideoAssetUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|#|$)/i.test(url);
}

/** 默认关卡背景视频：仅画面，静音循环（BGM 仍用独立音频） */
export function createMutedLoopBackgroundVideo(url: string): HTMLVideoElement {
  return getSharedVideoElement(url);
}

export function waitForImageElement(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

export function waitForVideoElement(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => resolve(), { once: true });
  });
}

export function preloadAudioUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "auto";
    const done = () => resolve();
    a.addEventListener("canplaythrough", done, { once: true });
    a.addEventListener("error", done, { once: true });
    a.src = url;
    a.load();
  });
}

/** 首页：封面图 + 封面 BGM，优先完成后再显示菜单 */
export async function preloadMenuResources(): Promise<void> {
  await Promise.all([
    waitForImageElement(getSharedImageElement(coverImage)),
    preloadAudioUrl(bgmCover),
  ]);
}

/**
 * 等待 React 提交更新后浏览器至少完成一帧合成，再结束全屏加载态，
 * 避免目标页尚未绘制就关掉遮罩。
 */
export function waitForEnterPagePaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

const enqueueMediaElement = (
  m: import("./types").MediaAsset | null | undefined,
  out: Promise<void>[],
) => {
  if (!m?.element) return;
  const el = m.element;
  if (el instanceof HTMLImageElement) out.push(waitForImageElement(el));
  else if (el instanceof HTMLVideoElement) out.push(waitForVideoElement(el));
};

/** 关卡背景（视频/多图/单图）+ 选关缩略图，优先解码 */
function collectBackgroundAndThumbnailWaitPromises(
  la: LevelAssets,
  out: Promise<void>[],
) {
  enqueueMediaElement(la.background, out);
  la.backgrounds?.forEach((m) => enqueueMediaElement(m, out));
  enqueueMediaElement(la.thumbnail, out);
}

/** 蛇贴图等其余素材 */
function collectSnakeAndDetailWaitPromises(la: LevelAssets, out: Promise<void>[]) {
  enqueueMediaElement(la.fullSnakeTexture, out);
  enqueueMediaElement(la.snakeHead, out);
  enqueueMediaElement(la.snakeHeadUp, out);
  enqueueMediaElement(la.snakeHeadDown, out);
  enqueueMediaElement(la.snakeHeadLeft, out);
  enqueueMediaElement(la.snakeHeadRight, out);
  enqueueMediaElement(la.snakeBody, out);
  enqueueMediaElement(la.snakeBodyUp, out);
  enqueueMediaElement(la.snakeBodyDown, out);
  enqueueMediaElement(la.snakeBodyLeft, out);
  enqueueMediaElement(la.snakeBodyRight, out);
  enqueueMediaElement(la.snakeTail, out);
  enqueueMediaElement(la.snakeTailUp, out);
  enqueueMediaElement(la.snakeTailDown, out);
  enqueueMediaElement(la.snakeTailLeft, out);
  enqueueMediaElement(la.snakeTailRight, out);
}

function collectMediaWaitPromises(la: LevelAssets, out: Promise<void>[]) {
  collectBackgroundAndThumbnailWaitPromises(la, out);
  collectSnakeAndDetailWaitPromises(la, out);
}

export async function waitForSingleLevelBackgroundAndThumbnailMedia(
  la: LevelAssets,
): Promise<void> {
  const promises: Promise<void>[] = [];
  collectBackgroundAndThumbnailWaitPromises(la, promises);
  await Promise.all(promises);
}

export async function waitForSingleLevelVisualMedia(
  la: LevelAssets,
): Promise<void> {
  const promises: Promise<void>[] = [];
  collectMediaWaitPromises(la, promises);
  await Promise.all(promises);
}

/** 先等背景与缩略图，便于选关页与游玩背景完整显示 */
export async function waitForAllLevelBackgroundAndThumbnailMedia(
  assets: Record<number, LevelAssets>,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const la of Object.values(assets)) {
    collectBackgroundAndThumbnailWaitPromises(la, promises);
  }
  await Promise.all(promises);
}

/**
 * 仅等待各关选关缩略图（通常为图片）。不等待背景视频/大图，避免阻塞进入选关页；
 * 背景在启动后后台预载，进入关卡时再 `waitForSingleLevelVisualMedia`。
 */
export async function waitForAllLevelThumbnailMedia(
  assets: Record<number, LevelAssets>,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const la of Object.values(assets)) {
    enqueueMediaElement(la.thumbnail, promises);
  }
  await Promise.all(promises);
}

/** 蛇身贴图等（在背景与缩略图之后） */
export async function waitForAllLevelSnakeAndDetailMedia(
  assets: Record<number, LevelAssets>,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const la of Object.values(assets)) {
    collectSnakeAndDetailWaitPromises(la, promises);
  }
  await Promise.all(promises);
}

export async function waitForAllLevelAssetsMedia(
  assets: Record<number, LevelAssets>,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const la of Object.values(assets)) {
    collectMediaWaitPromises(la, promises);
  }
  await Promise.all(promises);
}

/**
 * 仅后台预载选关页 BGM；各关游玩 BGM 在进入游玩时由 audio 元素按需加载，不阻塞开局。
 */
export async function preloadLevelSelectBgmSoft(): Promise<void> {
  await preloadAudioUrl(bgmSelect);
}
