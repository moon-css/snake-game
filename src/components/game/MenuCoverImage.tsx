import { useLayoutEffect, useRef } from "react";
import { coverImage } from "@/game/assetImports";
import { getSharedImageElement } from "@/game/media";

/** 首页封面：复用共享 Image 节点，与预载为同一实例 */
export function MenuCoverImage() {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const img = getSharedImageElement(coverImage);
    img.className = "absolute inset-0 h-full w-full object-contain object-center";
    img.width = 800;
    img.height = 600;
    Object.assign(img.style, { imageRendering: "pixelated" });
    host.replaceChildren(img);
    return () => {
      try {
        host.removeChild(img);
      } catch {
        /* 已移除 */
      }
    };
  }, []);
  return (
    <div
      ref={hostRef}
      className="relative w-full bg-[#e8e8e8]"
      style={{
        aspectRatio: "4 / 3",
        maxHeight: "min(420px, calc(100vh - 14rem))",
      }}
    />
  );
}
