import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { isDrawableCanvasImageSource } from "@/game/media";

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw < 1 || ih < 1 || w < 1 || h < 1) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * 关卡选择缩略图。同一 URL 可能在网格中出现多次（如「Ab Level 1」与 Level 1），
 * 不可复用单个 DOM img（后挂载会抢走同一节点）。
 * 若传入已解码的 `prefetchedImage`（与 getSharedImageElement 同源），用 Canvas 绘制，
 * 避免再挂一张 img 造成的浅底闪烁。
 */
export function LevelThumbnailImage({
  src,
  className,
  prefetchedImage,
}: {
  src: string;
  className?: string;
  /** 已与 src 对应的、已加载的共享 Image，可安全用于多处 Canvas drawImage */
  prefetchedImage?: HTMLImageElement | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  const canDrawFromPrefetch =
    !!prefetchedImage && isDrawableCanvasImageSource(prefetchedImage);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const img = prefetchedImage;
    if (!canvas || !wrap || !img || !isDrawableCanvasImageSource(img)) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 1 || h < 1) return;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawImageCover(ctx, img, w, h);
  }, [prefetchedImage]);

  useLayoutEffect(() => {
    if (!canDrawFromPrefetch) return;
    paint();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    const id = requestAnimationFrame(() => paint());
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [canDrawFromPrefetch, paint, src]);

  if (!src || failed) {
    return <span className="text-3xl">🐍</span>;
  }

  if (canDrawFromPrefetch) {
    return (
      <div
        ref={wrapRef}
        className={`absolute inset-0 overflow-hidden ${className ?? ""}`}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className ?? "w-full h-full object-cover"}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
