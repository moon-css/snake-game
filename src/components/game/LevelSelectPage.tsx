import { coverImage } from "@/game/assetImports";
import type { LevelAssets, LevelConfig } from "@/game/types";
import { LevelThumbnailImage } from "./LevelThumbnailImage";

type LevelSelectPageProps = {
  levelConfigs: readonly LevelConfig[];
  getLevelAssets: (levelId: number) => LevelAssets;
  onBack: () => void;
  onPickLevel: (levelId: number) => void;
};

export function LevelSelectPage({
  levelConfigs,
  getLevelAssets,
  onBack,
  onPickLevel,
}: LevelSelectPageProps) {
  const assetsLevel1 = getLevelAssets(1);
  const thumb1 =
    assetsLevel1.thumbnail?.element instanceof HTMLImageElement
      ? assetsLevel1.thumbnail.element
      : undefined;

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

      <div className="bg-[#c0c0c0] win95-outset p-1 w-[95vw] max-w-[1400px] relative z-10">
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
          <span className="text-white text-sm font-bold">Levelauswahl</span>
          <button
            type="button"
            onClick={onBack}
            className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
          >
            ×
          </button>
        </div>

        <div className="bg-[#c0c0c0] p-4">
          <div className="grid grid-cols-9 gap-3">
            <button
              type="button"
              onClick={() => onPickLevel(1)}
              className="win95-button bg-[#c0c0c0] p-3 hover:bg-[#dfdfdf] flex flex-col items-center gap-2 min-w-0"
            >
              <div className="w-full aspect-square min-h-[64px] win95-inset bg-[#e8e8e8] flex items-center justify-center overflow-hidden relative">
                <LevelThumbnailImage
                  src={assetsLevel1.thumbnail?.src ?? ""}
                  prefetchedImage={thumb1}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: "30px solid white",
                      borderTop: "20px solid transparent",
                      borderBottom: "20px solid transparent",
                      marginLeft: "6px",
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-center">
                <div className="font-bold">Ab Level 1</div>
                <div className="text-[10px] text-gray-600">Spiel starten</div>
              </div>
            </button>

            {levelConfigs.map((config) => {
              const assets = getLevelAssets(config.id);

              return (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => onPickLevel(config.id)}
                  className="win95-button bg-[#c0c0c0] p-3 hover:bg-[#dfdfdf] flex flex-col items-center gap-2 min-w-0"
                >
                  <div className="relative w-full aspect-square min-h-[64px] win95-inset bg-[#e8e8e8] flex items-center justify-center overflow-hidden">
                    <LevelThumbnailImage
                      src={assets.thumbnail?.src ?? ""}
                      prefetchedImage={
                        assets.thumbnail?.element instanceof HTMLImageElement
                          ? assets.thumbnail.element
                          : undefined
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-center">
                    <div className="font-bold">Level {config.id}</div>
                    <div className="text-[10px] text-gray-600 line-clamp-2">
                      {config.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
