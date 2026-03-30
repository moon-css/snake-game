import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { coverImage } from "@/game/assetImports";
import { MenuCoverImage } from "./MenuCoverImage";

type MenuPageProps = {
  onStart: () => void;
};

// 仅在本次应用会话首次进入首页时展示加载进度
let didShowInitialMenuProgress = false;

export function MenuPage({ onStart }: MenuPageProps) {
  const MIN_LOAD_MS = 3000;
  const [loadPercent, setLoadPercent] = useState(0);
  const [readyToStart, setReadyToStart] = useState(didShowInitialMenuProgress);

  useEffect(() => {
    if (didShowInitialMenuProgress) return;

    let rafId = 0;
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const nextPercent = Math.min(100, (elapsed / MIN_LOAD_MS) * 100);
      setLoadPercent(nextPercent);
      if (elapsed >= MIN_LOAD_MS) {
        didShowInitialMenuProgress = true;
        setReadyToStart(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[#1a1a2e]"
        style={{
          backgroundImage: coverImage ? `url(${coverImage})` : undefined,
          filter: "blur(8px)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="bg-[#c0c0c0] win95-outset p-1 w-[700px] relative z-10">
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 mb-1">
          <span className="text-white text-sm font-bold">🐍 Schlangenspiel</span>
        </div>

        <div className="bg-[#c0c0c0] p-8 flex flex-col items-center gap-6">
          <div className="w-full flex-shrink-0 win95-inset p-1 bg-white overflow-hidden">
            <MenuCoverImage />
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {!readyToStart ? (
              <div className="win95-inset bg-white p-3">
                <div className="text-xs font-bold mb-2">
                  Ressourcen werden geladen...
                </div>
                <div className="w-full h-5 border-2 border-[#808080] bg-white p-[1px] overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-100 ease-linear"
                    style={{
                      width: `${loadPercent}%`,
                      background:
                        "linear-gradient(90deg, #0f6fb2 0%, #1084d0 55%, #29a1e8 100%)",
                    }}
                  />
                </div>
                <div className="text-[11px] text-gray-700 mt-1 text-right">
                  {Math.floor(loadPercent)}%
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className="w-full px-8 py-4 win95-button bg-[#c0c0c0] text-lg font-bold hover:bg-[#dfdfdf]"
              >
                <Play className="inline-block w-5 h-5 mr-2" />
                Spiel starten
              </button>
            )}
          </div>

          <div className="text-xs text-gray-600 text-center">
            Mit den Pfeiltasten oder WASD spielen
            <br />
            Leertaste zum Pausieren
          </div>
        </div>
      </div>
    </div>
  );
}
