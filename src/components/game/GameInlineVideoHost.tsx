import { useLayoutEffect, useRef } from "react";

/** 游玩区背景视频：挂载共享 Video 节点，避免与素材里 element 重复解码 */
export function GameInlineVideoHost({ video }: { video: HTMLVideoElement }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    video.className =
      "absolute inset-0 w-full h-full object-cover pointer-events-none";
    video.style.zIndex = "0";
    host.replaceChildren(video);
    video.play().catch(() => {});
    return () => {
      try {
        host.removeChild(video);
      } catch {
        /* 已移除 */
      }
    };
  }, [video]);
  return (
    <div
      ref={hostRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
    />
  );
}
