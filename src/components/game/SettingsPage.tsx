import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_ASSETS_CONFIG } from "@/game/assetsConfig";
import { LEVEL_CONFIGS } from "@/game/levels";
import {
  createMutedLoopBackgroundVideo,
  getSharedImageElement,
  isVideoAssetUrl,
} from "@/game/media";
import type { LevelAssets } from "@/game/types";

export type SettingsPageProps = {
  selectedLevel: number;
  setSelectedLevel: (n: number) => void;
  onClose: () => void;
  getLevelAssets: (levelId: number) => LevelAssets;
  setLevelAssets: Dispatch<SetStateAction<Record<number, LevelAssets>>>;
  handleAssetUpload: (
    levelId: number,
    assetType: keyof LevelAssets,
    file: File,
  ) => void;
  currentLevel: number;
  snakeScale: number;
  setSnakeScaleByLevel: Dispatch<SetStateAction<Record<number, number>>>;
  snakeSpacingFactor: number;
  setSnakeSpacingFactorByLevel: Dispatch<SetStateAction<Record<number, number>>>;
  playerInitialLength: number;
  setPlayerInitialLength: (n: number) => void;
  enemySpawnInterval: number;
  setEnemySpawnInterval: (n: number) => void;
  segmentMaxHealth: number;
  setSegmentMaxHealth: (n: number) => void;
  setInitialBallBlinkSpeed: (n: number) => void;
  setTotalBallsHit: Dispatch<SetStateAction<number>>;
};

export function SettingsPage({
  selectedLevel,
  setSelectedLevel,
  onClose,
  getLevelAssets,
  setLevelAssets,
  handleAssetUpload,
  currentLevel,
  snakeScale,
  setSnakeScaleByLevel,
  snakeSpacingFactor,
  setSnakeSpacingFactorByLevel,
  playerInitialLength,
  setPlayerInitialLength,
  enemySpawnInterval,
  setEnemySpawnInterval,
  segmentMaxHealth,
  setSegmentMaxHealth,
  setInitialBallBlinkSpeed,
  setTotalBallsHit,
}: SettingsPageProps) {
  const assets = getLevelAssets(selectedLevel);

  return (
        <div className="min-h-screen bg-[#008080] flex items-center justify-center p-4">
          <div className="bg-[#c0c0c0] win95-outset p-1 w-[800px] max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
              <span className="text-white text-sm font-bold">
                Asset-Einstellungen
              </span>
              <button
                onClick={() => onClose()}
                className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
              >
                ×
              </button>
            </div>

            <div className="bg-[#c0c0c0] p-4">
              <div className="mb-4">
                <label className="text-xs font-bold mb-2 block">
                  Level auswaehlen:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    className="flex-1 win95-inset px-2 py-1 bg-white"
                  >
                    {LEVEL_CONFIGS.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name} - {config.desc}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Moechtest du alle Assets dieses Levels auf Standard zuruecksetzen? Deine benutzerdefinierten Uploads werden dabei geloescht.",
                        )
                      ) {
                        // 重置当前关卡的素材为默认
                        const config = DEFAULT_ASSETS_CONFIG[selectedLevel];
                        if (config) {
                          const newAssets: LevelAssets = {
                            background: null,
                            backgrounds: [],
                            fullSnakeTexture: null,
                            snakeHead: null,
                            snakeHeadUp: null,
                            snakeHeadDown: null,
                            snakeHeadLeft: null,
                            snakeHeadRight: null,
                            snakeBody: null,
                            snakeBodyUp: null,
                            snakeBodyDown: null,
                            snakeBodyLeft: null,
                            snakeBodyRight: null,
                            snakeTail: null,
                            snakeTailUp: null,
                            snakeTailDown: null,
                            snakeTailLeft: null,
                            snakeTailRight: null,
                            thumbnail: null,
                          };

                          if (config.thumbnail) {
                            const img = getSharedImageElement(config.thumbnail);
                            newAssets.thumbnail = {
                              type: "image",
                              src: config.thumbnail,
                              element: img,
                            };
                          }

                          if (
                            "backgrounds" in config &&
                            config.backgrounds?.length
                          ) {
                            newAssets.backgrounds = config.backgrounds.map(
                              (url: string) => {
                                const img = getSharedImageElement(url);
                                return {
                                  type: "image" as const,
                                  src: url,
                                  element: img,
                                };
                              },
                            );
                          } else if (
                            "background" in config &&
                            config.background
                          ) {
                            const url = config.background;
                            if (isVideoAssetUrl(url)) {
                              const video = createMutedLoopBackgroundVideo(url);
                              newAssets.background = {
                                type: "video",
                                src: url,
                                element: video,
                              };
                            } else {
                              const img = getSharedImageElement(url);
                              newAssets.background = {
                                type: "image",
                                src: url,
                                element: img,
                              };
                            }
                          }

                          if (config.fullSnakeTexture) {
                            const snakeImg = getSharedImageElement(
                              config.fullSnakeTexture,
                            );
                            newAssets.fullSnakeTexture = {
                              type: "image",
                              src: config.fullSnakeTexture,
                              element: snakeImg,
                            };
                          }

                          setLevelAssets((prev) => ({
                            ...prev,
                            [selectedLevel]: newAssets,
                          }));
                        }
                      }
                    }}
                    className="px-3 py-1 win95-button bg-[#c0c0c0] text-xs whitespace-nowrap"
                  >
                    🔄 Standard wiederherstellen
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Level-Vorschaubild
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          handleAssetUpload(selectedLevel, "thumbnail", file);
                      }}
                      className="text-xs"
                    />
                    {assets.thumbnail && (
                      <div className="w-16 h-16 win95-inset bg-white overflow-hidden">
                        <img
                          src={assets.thumbnail.src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    {selectedLevel === 4
                      ? "Spielhintergrund (mehrere Bilder, Standard: 4; wechselt nach jedem Treffer bis zum letzten Bild)"
                      : "Spielhintergrund (Bild/GIF/Video)"}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple={selectedLevel === 4}
                      onChange={(e) => {
                        const files = Array.from(
                          e.target.files || [],
                        ) as File[];
                        if (selectedLevel === 4) {
                          // 关卡4：多张背景
                          files.slice(0, 7).forEach((file: File) => {
                            handleAssetUpload(
                              selectedLevel,
                              "backgrounds",
                              file,
                            );
                          });
                        } else {
                          // 其他关卡：单张背景
                          const file = files[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "background",
                              file,
                            );
                        }
                      }}
                      className="text-xs"
                    />
                    {selectedLevel === 4 &&
                    assets.backgrounds &&
                    assets.backgrounds.length > 0 ? (
                      <div className="win95-inset bg-white px-2 py-1 text-xs">
                        Hochgeladen: {assets.backgrounds.length}
                        {assets.backgrounds.some((bg) => bg.temporary) && (
                          <span
                            className="text-orange-600 ml-1"
                            title="Nach Neuladen erneut hochladen"
                          >
                            ⚠️ Temporaer
                          </span>
                        )}
                      </div>
                    ) : assets.background ? (
                      <div className="win95-inset bg-white px-2 py-1 text-xs flex items-center gap-1">
                        <span>
                          {assets.background.type === "video"
                            ? "🎥 Video"
                            : assets.background.type === "gif"
                              ? "🎞️ GIF"
                              : "🖼️ Bild"}
                        </span>
                        {assets.background.temporary && (
                          <span
                            className="text-orange-600"
                            title="Nach Neuladen erneut hochladen"
                          >
                            ⚠️ Temporaer
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎨 Gesamt-Textur fuer die Schlange (optional)
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    Eine Textur fuer die gesamte Schlange (Kopf, Koerper, Schwanz). Die Rotation folgt automatisch der Bewegungsrichtung. Bei Aktivierung werden die Einzel-Einstellungen unten ignoriert.
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          handleAssetUpload(
                            selectedLevel,
                            "fullSnakeTexture",
                            file,
                          );
                      }}
                      className="text-xs"
                    />
                    {assets.fullSnakeTexture && (
                      <div className="win95-inset bg-white px-2 py-1 text-xs flex items-center gap-2">
                        <span>
                          {assets.fullSnakeTexture.type === "video"
                            ? "🎥 Video"
                            : assets.fullSnakeTexture.type === "gif"
                              ? "🎞️ GIF"
                              : "🖼️ Bild"}
                        </span>
                        <span className="text-green-600">✓ Aktiv</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Schlangenkopf (Bild/GIF/Video)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          handleAssetUpload(selectedLevel, "snakeHead", file);
                      }}
                      className="text-xs"
                    />
                    {assets.snakeHead && (
                      <div className="win95-inset bg-white px-2 py-1 text-xs">
                        {assets.snakeHead.type === "video"
                          ? "🎥 Video"
                          : assets.snakeHead.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ Bild"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 Richtungstexturen fuer den Kopf (optional)
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    Fuer jede Richtung kann eine eigene Textur gesetzt werden; sonst wird die Standard-Kopftextur verwendet.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ Oben
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeHeadUp",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeHeadUp && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ Unten
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeHeadDown",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeHeadDown && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ Links
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeHeadLeft",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeHeadLeft && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ Rechts
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeHeadRight",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeHeadRight && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Schlangenkoerper (Bild/GIF/Video)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          handleAssetUpload(selectedLevel, "snakeBody", file);
                      }}
                      className="text-xs"
                    />
                    {assets.snakeBody && (
                      <div className="win95-inset bg-white px-2 py-1 text-xs">
                        {assets.snakeBody.type === "video"
                          ? "🎥 Video"
                          : assets.snakeBody.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ Bild"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 Richtungstexturen fuer den Koerper (optional)
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    Fuer jede Richtung kann eine eigene Textur gesetzt werden; sonst wird die Standard-Koerpertextur verwendet.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ Oben
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeBodyUp",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeBodyUp && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ Unten
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeBodyDown",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeBodyDown && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ Links
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeBodyLeft",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeBodyLeft && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ Rechts
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeBodyRight",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeBodyRight && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Schlangenschwanz (Bild/GIF/Video)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          handleAssetUpload(selectedLevel, "snakeTail", file);
                      }}
                      className="text-xs"
                    />
                    {assets.snakeTail && (
                      <div className="win95-inset bg-white px-2 py-1 text-xs">
                        {assets.snakeTail.type === "video"
                          ? "🎥 Video"
                          : assets.snakeTail.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ Bild"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 Richtungstexturen fuer den Schwanz (optional)
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    Fuer jede Richtung kann eine eigene Textur gesetzt werden; sonst wird die Standard-Schwanztextur verwendet.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ Oben
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeTailUp",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeTailUp && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ Unten
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeTailDown",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeTailDown && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ Links
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeTailLeft",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeTailLeft && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ Rechts
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleAssetUpload(
                              selectedLevel,
                              "snakeTailRight",
                              file,
                            );
                        }}
                        className="text-[10px] w-full"
                      />
                      {assets.snakeTailRight && (
                        <div className="mt-1 text-[10px] text-green-600">
                          ✓ Gesetzt
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 游戏参数设置 */}
              <div className="mt-4 space-y-3">
                {/* 全局参数 */}
                <div className="text-xs font-bold mb-2">
                  🎨 Globale Parameter
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Schlangengroesse
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={snakeScale}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        setSnakeScaleByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: newValue };
                          localStorage.setItem(
                            "snakeGameSnakeScaleByLevel",
                            JSON.stringify(updated),
                          );
                          return updated;
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-bold win95-inset bg-white px-2 py-1 w-16 text-center">
                      {snakeScale}x
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">
                    Anzeigegroesse der Schlange anpassen (1x=20px, 5x=100px, max. 72px)
                    <br />
                    ⚙️ Diese Einstellung gilt nur fuer das aktuelle Level
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    Segmentabstand
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={snakeSpacingFactor}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        setSnakeSpacingFactorByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: newValue };
                          localStorage.setItem(
                            "snakeGameSpacingFactorByLevel",
                            JSON.stringify(updated),
                          );
                          return updated;
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-bold win95-inset bg-white px-2 py-1 w-16 text-center">
                      {snakeSpacingFactor.toFixed(1)}x
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">
                    Abstand zwischen Segmenten anpassen (0=dicht, 2=locker)
                    <br />
                    ⚙️ Diese Einstellung gilt nur fuer das aktuelle Level
                  </div>
                </div>

                {/* 关卡8参数 */}
                {selectedLevel === 8 && (
                  <>
                    <div className="text-xs font-bold mb-2 mt-4">
                      🎮 Spielparameter (nur Level 8)
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        Startlaenge der Spieler-Schlange
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={playerInitialLength}
                          onChange={(e) =>
                            setPlayerInitialLength(
                              Math.max(1, Math.min(15, Number(e.target.value))),
                            )
                          }
                          className="win95-inset px-2 py-1 bg-white text-xs w-20"
                        />
                        <span className="text-xs">Felder (Empfehlung: 8)</span>
                      </div>
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        Spawn-Intervall der Gegner-Schlangen
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="500"
                          max="5000"
                          step="100"
                          value={enemySpawnInterval}
                          onChange={(e) =>
                            setEnemySpawnInterval(
                              Math.max(
                                500,
                                Math.min(5000, Number(e.target.value)),
                              ),
                            )
                          }
                          className="win95-inset px-2 py-1 bg-white text-xs w-20"
                        />
                        <span className="text-xs">Millisekunden (1s = 1000ms)</span>
                      </div>
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        Lebenspunkte der Segmente
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={segmentMaxHealth}
                          onChange={(e) =>
                            setSegmentMaxHealth(
                              Math.max(1, Math.min(10, Number(e.target.value))),
                            )
                          }
                          className="win95-inset px-2 py-1 bg-white text-xs w-20"
                        />
                        <span className="text-xs">
                          HP (Segment verschwindet nach so vielen Treffern)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-[10px] text-gray-600 win95-inset bg-white p-2 space-y-1">
                  <div>
                    💡 <strong>Unterstuetzte Formate:</strong>
                    Bilder (JPG/PNG), GIF, MP4
                  </div>
                  <div>
                    📦 <strong>Dateigroesse:</strong>
                  </div>
                  <div className="ml-4">
                    • Kleine Dateien (&lt;100MB): dauerhaft gespeichert, bleiben nach Reload erhalten ✅
                  </div>
                  <div className="ml-4">
                    • Grosse Dateien (≥100MB): temporaerer Modus, nach Reload erneut hochladen ⚠️
                  </div>
                  <div>
                    💾 <strong>Intelligentes Speichern:</strong>
                    Das System waehlt je nach Dateigroesse automatisch die beste Speicherstrategie
                  </div>
                  <div>
                    🎯 <strong>Tipp:</strong> Unter 100MB bleiben Dateien dauerhaft gespeichert
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm("Alle Spielparameter auf Standard zuruecksetzen?")) {
                        setPlayerInitialLength(8);
                        setEnemySpawnInterval(1000);
                        setSegmentMaxHealth(1);
                        setInitialBallBlinkSpeed(500);
                        setTotalBallsHit(0);
                        // 重置当前关卡的蛇大小和间距
                        setSnakeScaleByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: 4 };
                          localStorage.setItem(
                            "snakeGameSnakeScaleByLevel",
                            JSON.stringify(updated),
                          );
                          return updated;
                        });
                        setSnakeSpacingFactorByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: 0.5 };
                          localStorage.setItem(
                            "snakeGameSpacingFactorByLevel",
                            JSON.stringify(updated),
                          );
                          return updated;
                        });
                      }
                    }}
                    className="px-4 py-2 win95-button bg-[#c0c0c0] text-xs"
                  >
                    🔄 Spielparameter zuruecksetzen
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Alle benutzerdefinierten Assets loeschen und Standard wiederherstellen? Dieser Vorgang kann nicht rueckgaengig gemacht werden!",
                        )
                      ) {
                        localStorage.removeItem("snakeGameCustomAssets");
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 win95-button bg-[#c0c0c0] text-xs"
                  >
                    ⚠️ Alle Assets zuruecksetzen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
}
