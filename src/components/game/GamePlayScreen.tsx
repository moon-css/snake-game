import type { RefObject } from "react";
import { GRID_SIZE, CELL_SIZE } from "@/game/constants";
import type { LevelMode } from "@/game/types";
import { GameInlineVideoHost } from "./GameInlineVideoHost";

export type KeyMappingState = {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
};

export type GamePlayScreenProps = {
  levelName: string;
  levelMode: LevelMode | undefined;
  levelThumbSrc: string;
  inlineVideoElement: HTMLVideoElement | null;
  score: number;
  snakeLength: number;
  ballsOnMap: number;
  totalBallsHit: number;
  survivalTimeSec: number;
  segmentHealth: number[];
  segmentMaxHealth: number;
  isPaused: boolean;
  gameOver: boolean;
  keyMapping: KeyMappingState;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onCloseToLevelSelect: () => void;
};

const gridPx = GRID_SIZE * CELL_SIZE;

export function GamePlayScreen({
  levelName,
  levelMode,
  levelThumbSrc,
  inlineVideoElement,
  score,
  snakeLength,
  ballsOnMap,
  totalBallsHit,
  survivalTimeSec,
  segmentHealth,
  segmentMaxHealth,
  isPaused,
  gameOver,
  keyMapping,
  canvasRef,
  onCloseToLevelSelect,
}: GamePlayScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[#1a1a2e]"
        style={{
          backgroundImage: levelThumbSrc ? `url(${levelThumbSrc})` : undefined,
          filter: "blur(8px)",
          transform: "scale(1.1)",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="bg-[#c0c0c0] win95-outset p-1 max-w-3xl w-full relative"
        style={{
          boxShadow: levelThumbSrc ? "0 10px 40px rgba(0,0,0,0.5)" : "",
          zIndex: 10,
        }}
      >
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
          <span className="text-white text-sm font-bold">🐍 {levelName}</span>
          <button
            type="button"
            onClick={onCloseToLevelSelect}
            className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
          >
            ×
          </button>
        </div>

        <div className="bg-[#c0c0c0] p-2">
          <div className="bg-[#c0c0c0] border-b border-white mb-2 pb-1">
            <div className="flex gap-4 px-1">
              <button
                type="button"
                onClick={onCloseToLevelSelect}
                className="text-sm hover:bg-[#000080] hover:text-white px-2 py-0.5"
              >
                Zurück
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              <div className="win95-inset px-3 py-1 bg-white">
                <span className="text-sm font-mono">Punktzahl: {score}</span>
              </div>
              <div className="win95-inset px-3 py-1 bg-white">
                <span className="text-sm font-mono">Länge: {snakeLength}</span>
              </div>
              {levelMode === "blink" && (
                <>
                  <div className="win95-inset px-3 py-1 bg-white">
                    <span className="text-sm font-mono">
                      Auf Karte: {ballsOnMap}
                    </span>
                  </div>
                  <div className="win95-inset px-3 py-1 bg-white">
                    <span className="text-sm font-mono">
                      Treffer: {totalBallsHit}
                    </span>
                  </div>
                </>
              )}
              {levelMode === "escape" && (
                <>
                  <div className="win95-inset px-3 py-1 bg-white">
                    <span className="text-sm font-mono">
                      Überleben: {survivalTimeSec}s
                    </span>
                  </div>
                  <div className="win95-inset px-3 py-1 bg-white">
                    <span className="text-sm font-mono">
                      Schwanz-Lebenspunkte:{" "}
                      {segmentHealth.length > 0
                        ? segmentHealth[segmentHealth.length - 1]
                        : 0}
                      /{segmentMaxHealth}
                    </span>
                  </div>
                </>
              )}
              {isPaused && (
                <div className="win95-inset px-3 py-1 bg-yellow-100">
                  <span className="text-sm">⏸ Pausiert</span>
                </div>
              )}
            </div>
          </div>

          <div
            className="mx-auto win95-inset bg-[#c0c0c0] mb-2"
            style={{
              width: gridPx + 4,
              height: gridPx + 4,
              padding: "2px",
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: gridPx,
                height: gridPx,
              }}
            >
              {inlineVideoElement && (
                <GameInlineVideoHost video={inlineVideoElement} />
              )}
              <canvas
                ref={canvasRef}
                width={gridPx}
                height={gridPx}
                className="relative block"
                style={{ zIndex: 10 }}
              />

              {gameOver && (
                <div
                  className="absolute inset-0 bg-[#c0c0c0]/95 flex items-center justify-center"
                  style={{ zIndex: 20 }}
                >
                  <div className="text-center bg-[#c0c0c0] win95-outset p-6">
                    <div className="text-4xl mb-2">💀</div>
                    <div className="font-bold mb-2">Spiel vorbei!</div>
                    <div className="text-sm mb-4">Endpunktzahl: {score}</div>
                    <button
                      type="button"
                      onClick={onCloseToLevelSelect}
                      className="px-6 py-2 win95-button bg-[#c0c0c0] text-sm"
                    >
                      Levelauswahl
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="win95-outset bg-[#c0c0c0] p-2">
            <div className="text-xs font-bold mb-2">Steuerung</div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <div className="win95-inset bg-white px-2 py-1">
                ↑ / {keyMapping.up[1]?.toUpperCase()} - Hoch
              </div>
              <div className="win95-inset bg-white px-2 py-1">
                ↓ / {keyMapping.down[1]?.toUpperCase()} - Runter
              </div>
              <div className="win95-inset bg-white px-2 py-1">
                ← / {keyMapping.left[1]?.toUpperCase()} - Links
              </div>
              <div className="win95-inset bg-white px-2 py-1">
                → / {keyMapping.right[1]?.toUpperCase()} - Rechts
              </div>
            </div>
            <div className="win95-inset bg-white px-2 py-1 text-[11px] mt-1">
              Leertaste - Pause
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
