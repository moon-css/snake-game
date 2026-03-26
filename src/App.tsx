import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Pause,
  Upload,
  X,
  Play,
} from "lucide-react";
import coverImage from "@/assets/img/game_cover.png";
import bgmCover from "@/assets/bgm/bgm_cover.mp3";
import bgmSelect from "@/assets/bgm/bgm_select.mp3";
// 8 个关卡背景图（assets/pass 内各关卡文件夹）
import pass1Bg from "@/assets/pass/pass-1/1.png";
import pass2Bg from "@/assets/pass/pass-2/2.png";
import pass3Bg from "@/assets/pass/pass-3/3.png";
import pass4_1 from "@/assets/pass/pass-4/1.png";
import pass4_2 from "@/assets/pass/pass-4/2.png";
import pass4_3 from "@/assets/pass/pass-4/3.png";
import pass4_4 from "@/assets/pass/pass-4/4.png";
import pass4_5 from "@/assets/pass/pass-4/5.png";
import pass5Bg from "@/assets/pass/pass-5/5.png";
import pass6Bg from "@/assets/pass/pass-6/6.png";
import pass7Bg from "@/assets/pass/pass-7/7.png";
import pass8Bg from "@/assets/pass/pass-8/8.png";
// 8 个关卡蛇的默认样式（assets/img 以 snack 开头）
import snack1 from "@/assets/img/snack-1.png";
import snack2 from "@/assets/img/snack-2.png";
import snack3 from "@/assets/img/snack-3.png";
import snack4 from "@/assets/img/snack-4.png";
import snack5 from "@/assets/img/snack-5.png";
import snack6 from "@/assets/img/snack-6.png";
import snack7 from "@/assets/img/snack-7.png";
import snack8 from "@/assets/img/snack-8.png";

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 150;
/** 素材缓存版本，改用 assets/pass 默认背景后设为 2，旧缓存会清空以使用新默认 */
const ASSETS_VERSION = 2;

/** 图片/视频是否可安全用于 Canvas drawImage（broken 图会抛 InvalidStateError） */
function isDrawableCanvasImageSource(
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

function safeDrawImageDest(
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

/** 关卡选择等：缩略图加载失败时显示占位，避免裂图 */
function LevelThumbnailImage({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="text-3xl">🐍</span>;
  }
  return (
    <img
      src={src}
      alt=""
      className={className ?? "w-full h-full object-cover"}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

type Position = { x: number; y: number };
type Direction = { x: number; y: number };
type GameState = "menu" | "levelSelect" | "settings" | "playing";

interface MediaAsset {
  type: "image" | "video" | "gif";
  src: string;
  element?: HTMLImageElement | HTMLVideoElement;
  temporary?: boolean; // 标记为临时素材（不保存到localStorage）
}

interface LevelAssets {
  background: MediaAsset | null;
  backgrounds?: MediaAsset[]; // 关卡4：多张背景图（最多7张）
  fullSnakeTexture?: MediaAsset | null; // 全蛇贴图：一张图覆盖头身尾，可旋转
  snakeHead: MediaAsset | null;
  snakeHeadUp?: MediaAsset | null; // 蛇头向上
  snakeHeadDown?: MediaAsset | null; // 蛇头向下
  snakeHeadLeft?: MediaAsset | null; // 蛇头向左
  snakeHeadRight?: MediaAsset | null; // 蛇头向右
  snakeBody: MediaAsset | null;
  snakeBodyUp?: MediaAsset | null; // 蛇身向上
  snakeBodyDown?: MediaAsset | null; // 蛇身向下
  snakeBodyLeft?: MediaAsset | null; // 蛇身向左
  snakeBodyRight?: MediaAsset | null; // 蛇身向右
  snakeTail: MediaAsset | null;
  snakeTailUp?: MediaAsset | null; // 蛇尾向上
  snakeTailDown?: MediaAsset | null; // 蛇尾向下
  snakeTailLeft?: MediaAsset | null; // 蛇尾向左
  snakeTailRight?: MediaAsset | null; // 蛇尾向右
  thumbnail: MediaAsset | null;
}

interface EnemySnake {
  id: number;
  position: Position;
  body: Position[]; // 敌人蛇的身体
  color: string; // 敌人蛇的颜色
  path: Position[];
  pathIndex: number;
}

// 关卡7：球的数据结构
interface Ball {
  id: number;
  x: number; // 网格坐标
  y: number;
  opacity: number; // 透明度 (0-1)
  spawnTime: number; // 出现时间（毫秒）
  blinkSpeed: number; // 闪烁速度（毫秒）
  phaseOffset: number; // 相位偏移（0-1）
}

const LEVEL_CONFIGS = [
  {
    id: 1,
    chapter: 1,
    name: "关卡 1: 经典贪吃蛇",
    mode: "classic",
    desc: "经典玩法，吃红球变长",
  },
  {
    id: 2,
    chapter: 1,
    name: "关卡 2: 影子引导",
    mode: "shadow",
    desc: "跟随前方的影子蛇",
  },
  {
    id: 3,
    chapter: 1,
    name: "关卡 3: 红绿灯",
    mode: "traffic",
    desc: "只能吃绿色的球",
  },
  {
    id: 4,
    chapter: 2,
    name: "关卡 4: 成长世界",
    mode: "growing",
    desc: "吃球后地图变大",
  },
  {
    id: 5,
    chapter: 2,
    name: "关卡 5: 迷乱酒局",
    mode: "drunk",
    desc: "按键会随机变化",
  },
  {
    id: 6,
    chapter: 2,
    name: "关卡 6: 极速挑战",
    mode: "speed",
    desc: "红球每秒5次随机跳动",
  },
  {
    id: 7,
    chapter: 3,
    name: "关卡 7: 闪烁迷阵",
    mode: "blink",
    desc: "多球闪烁，一秒3次变换",
  },
  {
    id: 8,
    chapter: 3,
    name: "关卡 8: 逃脱追捕",
    mode: "escape",
    desc: "躲避小蛇的追捕",
  },
] as const;

// 默认素材配置（使用 assets/pass 背景 + assets/img 蛇样式）
type DefaultAssetConfigEntry =
  | { background: string; thumbnail: string; fullSnakeTexture?: string }
  | { backgrounds: string[]; thumbnail: string; fullSnakeTexture?: string };
const DEFAULT_ASSETS_CONFIG: Record<number, DefaultAssetConfigEntry> = {
  1: { background: pass1Bg, thumbnail: pass1Bg, fullSnakeTexture: snack1 },
  2: { background: pass2Bg, thumbnail: pass2Bg, fullSnakeTexture: snack2 },
  3: { background: pass3Bg, thumbnail: pass3Bg, fullSnakeTexture: snack3 },
  4: {
    backgrounds: [pass4_1, pass4_2, pass4_3, pass4_4, pass4_5],
    thumbnail: pass4_1,
    fullSnakeTexture: snack4,
  },
  5: { background: pass5Bg, thumbnail: pass5Bg, fullSnakeTexture: snack5 },
  6: { background: pass6Bg, thumbnail: pass6Bg, fullSnakeTexture: snack6 },
  7: { background: pass7Bg, thumbnail: pass7Bg, fullSnakeTexture: snack7 },
  8: { background: pass8Bg, thumbnail: pass8Bg, fullSnakeTexture: snack8 },
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [levelAssets, setLevelAssets] = useState<Record<number, LevelAssets>>(
    {},
  );
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mapScale, setMapScale] = useState(1);
  const [chaosFood, setChaosFood] = useState(0);
  const [keyMapping, setKeyMapping] = useState({
    up: ["arrowup", "w"],
    down: ["arrowdown", "s"],
    left: ["arrowleft", "a"],
    right: ["arrowright", "d"],
  });

  // 关卡2：影子蛇
  const [shadowSnake, setShadowSnake] = useState<Position[]>([]);
  const [shadowDirection, setShadowDirection] =
    useState<Direction>(INITIAL_DIRECTION);
  const [shadowPath, setShadowPath] = useState<string[]>([]); // 记录影子蛇走过的路径

  const shadowDirectionRef = useRef<Direction>(INITIAL_DIRECTION);

  // 关卡3：红绿灯
  const [foodColor, setFoodColor] = useState<"red" | "green">("red");
  const [trafficSpeed, setTrafficSpeed] = useState(2000); // 初始2秒

  // 关卡4：成长世界 - 背景切换
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  // 关卡6：速度挑战
  const [speedFoodBlinkSpeed, setSpeedFoodBlinkSpeed] = useState(200); // 位置切换速度：200ms（一秒5次）
  const [speedFoodPixelPos, setSpeedFoodPixelPos] = useState<{
    x: number;
    y: number;
  } | null>(null); // 食物的当前像素坐标
  const [speedFoodTarget, setSpeedFoodTarget] = useState<Position | null>(null); // 食物的目标网格位置
  const [speedFoodMoveStartTime, setSpeedFoodMoveStartTime] =
    useState<number>(0); // 开始移动的时间
  const speedFoodPixelRef = useRef<{ x: number; y: number } | null>(null); // ref用于动画访问

  // 关卡7：闪烁迷阵
  const [balls, setBalls] = useState<Ball[]>([]); // 所有球
  const [nextBallId, setNextBallId] = useState(0); // 球的ID计数器
  const [ballCount, setBallCount] = useState(5); // 当前球数量
  const [initialBallBlinkSpeed, setInitialBallBlinkSpeed] = useState(500); // 新球闪烁周期基准（毫秒），重置用
  const [totalBallsHit, setTotalBallsHit] = useState(0); // 已击中的球数（关卡7统计）
  const ballOpacityPhaseRef = useRef(0); // 透明度动画相位（0-1循环）

  // 关卡8：逃脱
  const [enemySnakes, setEnemySnakes] = useState<EnemySnake[]>([]);
  const [nextEnemyId, setNextEnemyId] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0); // 生存时间（秒）
  const [playerInitialLength, setPlayerInitialLength] = useState(() => {
    const saved = localStorage.getItem("snakeGamePlayerInitialLength");
    return saved ? parseInt(saved) : 8;
  }); // 玩家蛇初始长度（关卡8）
  const [enemySpawnInterval, setEnemySpawnInterval] = useState(() => {
    const saved = localStorage.getItem("snakeGameEnemySpawnInterval");
    return saved ? parseInt(saved) : 1000;
  }); // 敌人蛇生成间隔�����毫秒）
  const [segmentMaxHealth, setSegmentMaxHealth] = useState(() => {
    const saved = localStorage.getItem("snakeGameSegmentMaxHealth");
    return saved ? parseInt(saved) : 1;
  }); // 每格蛇身的最大血量（关卡8）
  const [segmentHealth, setSegmentHealth] = useState<number[]>([]); // 每格蛇身的当前血量

  // 蛇的大小缩放（按关卡存储，1-5倍）
  const [snakeScaleByLevel, setSnakeScaleByLevel] = useState<
    Record<number, number>
  >(() => {
    const saved = localStorage.getItem("snakeGameSnakeScaleByLevel");
    return saved ? JSON.parse(saved) : {};
  });

  // 蛇节间距系数（按关卡存储，0-2倍）
  const [snakeSpacingFactorByLevel, setSnakeSpacingFactorByLevel] = useState<
    Record<number, number>
  >(() => {
    const saved = localStorage.getItem("snakeGameSpacingFactorByLevel");
    return saved ? JSON.parse(saved) : {};
  });

  // 获取当前关卡的蛇缩放和间距
  const snakeScale = snakeScaleByLevel[currentLevel] ?? 1;
  const snakeSpacingFactor = snakeSpacingFactorByLevel[currentLevel] ?? 0;

  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE); // 保存蛇的引用以便在interval中访问
  const ballsRef = useRef<Ball[]>([]); // 保存球的引用以便在interval中访问
  const bgmRef = useRef<HTMLAudioElement>(null);

  // 根据当前页面循环播放对应 BGM：封面=bgm_cover，关卡选择=bgm_select
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    if (gameState === "menu") {
      audio.src = bgmCover;
      audio.loop = true;
      audio.play().catch(() => {});
    } else if (gameState === "levelSelect") {
      audio.src = bgmSelect;
      audio.loop = true;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [gameState]);

  const getLevelConfig = (levelId: number) =>
    LEVEL_CONFIGS.find((l) => l.id === levelId);
  const getLevelAssets = (levelId: number): LevelAssets =>
    levelAssets[levelId] || {
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

  // 获取当前背景（用于UI外的背景填充）
  const getCurrentBackground = (): MediaAsset | null => {
    const config = getLevelConfig(currentLevel);
    const assets = getLevelAssets(currentLevel);

    if (
      config?.mode === "growing" &&
      assets.backgrounds &&
      assets.backgrounds.length > 0
    ) {
      // 关卡4：使用对应索引的背景
      const bg =
        assets.backgrounds[
          Math.min(backgroundIndex, assets.backgrounds.length - 1)
        ];
      return bg ?? null;
    }
    if (assets.background) {
      return assets.background;
    }
    return null;
  };

  // 加载默认素材和用户自定义素材（应用启动时）
  useEffect(() => {
    const loadAssets = async () => {
      const newAssets: Record<number, LevelAssets> = {};

      // 首先加载默认素材
      for (const [levelId, config] of Object.entries(DEFAULT_ASSETS_CONFIG)) {
        const level = parseInt(levelId);

        // 初始化空的素材对象
        newAssets[level] = {
          background: null,
          backgrounds: [],
          fullSnakeTexture: null,
          snakeHead: null,
          snakeBody: null,
          snakeTail: null,
          thumbnail: null,
        };

        // 加载蛇的默认样式（全蛇贴图，assets/img 以 snack 开头）
        if (config.fullSnakeTexture) {
          const snakeImg = new Image();
          configureImageForUrl(snakeImg, config.fullSnakeTexture);
          newAssets[level].fullSnakeTexture = {
            type: "image",
            src: config.fullSnakeTexture,
            element: snakeImg,
          };
        }

        // 加载缩略图
        if (config.thumbnail) {
          const img = new Image();
          configureImageForUrl(img, config.thumbnail);
          newAssets[level].thumbnail = {
            type: "image",
            src: config.thumbnail,
            element: img,
          };
        }

        // 加载背景（关卡4有多张背景）
        if ("backgrounds" in config && config.backgrounds?.length) {
          newAssets[level].backgrounds = config.backgrounds.map(
            (url: string) => {
              const img = new Image();
              configureImageForUrl(img, url);
              return {
                type: "image" as const,
                src: url,
                element: img,
              };
            },
          );
        } else if ("background" in config && config.background) {
          const url = config.background;
          const img = new Image();
          configureImageForUrl(img, url);
          newAssets[level].background = {
            type: "image",
            src: url,
            element: img,
          };
        }
      }

      console.log("✅ 默认素材加载完成");

      // 素材版本：旧缓存清空以使用 pass 文件夹默认背景
      const storedVersion = parseInt(
        localStorage.getItem("snakeGameAssetsVersion") || "0",
        10,
      );
      if (storedVersion < ASSETS_VERSION) {
        localStorage.removeItem("snakeGameCustomAssets");
        localStorage.setItem("snakeGameAssetsVersion", String(ASSETS_VERSION));
        console.log("🔄 已清除旧素材缓存，使用 pass 文件夹默认背景");
      }

      // 检查localStorage使用情况
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      console.log(
        `📊 localStorage当前使用: ${(totalSize / 1024).toFixed(2)}KB / ~5-10MB`,
      );

      // 然后尝试从localStorage加载用户自定义素材
      try {
        const savedAssets = localStorage.getItem("snakeGameCustomAssets");
        if (savedAssets) {
          console.log(
            `🔍 找到自定义素材 (${(savedAssets.length / 1024).toFixed(2)}KB)，开始加载...`,
          );
          const customAssets = JSON.parse(savedAssets) as Record<
            string,
            Partial<LevelAssets>
          >;

          // 合并自定义素材（会覆盖默认素材）
          for (const [levelId, assets] of Object.entries(customAssets)) {
            const level = parseInt(levelId);
            if (!newAssets[level]) {
              newAssets[level] = {
                background: null,
                backgrounds: [],
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
            }

            // 恢复每个素材
            const levelAssets = newAssets[level];

            // 恢复多张背景（关卡4）
            if (
              assets.backgrounds &&
              Array.isArray(assets.backgrounds) &&
              assets.backgrounds.length > 0
            ) {
              console.log(
                `关卡${level}：加载${assets.backgrounds.length}张背景图`,
              );
              levelAssets.backgrounds = assets.backgrounds.map((asset: any) => {
                if (asset.type === "video") {
                  const video = document.createElement("video");
                  video.src = asset.src;
                  video.loop = true;
                  video.muted = true;
                  video.autoplay = true;
                  video.playsInline = true;
                  video.addEventListener("loadeddata", () => {
                    video
                      .play()
                      .catch((err) =>
                        console.log("多背景视频自动播放失败:", err),
                      );
                  });
                  return { type: asset.type, src: asset.src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, asset.src);
                  return { type: asset.type, src: asset.src, element: img };
                }
              });
            }

            // 恢复单张背景（其他关卡）
            if (assets.background && assets.background.src) {
              const { type, src } = assets.background;
              console.log(
                `关卡${level}：加载${type}背景，大小：${(src.length / 1024).toFixed(2)}KB`,
              );
              if (type === "video") {
                const video = document.createElement("video");
                video.src = src;
                video.loop = true;
                video.muted = true;
                video.autoplay = true;
                video.playsInline = true;
                // 立������加载视频
                video.load();
                // 尝试播放视频
                video.addEventListener("loadeddata", () => {
                  console.log(`关卡${level}：视频数据已加载，开始播放`);
                  video
                    .play()
                    .catch((err) => console.log("视频自动播放失败:", err));
                });
                video.addEventListener("error", (e) => {
                  console.error(`关卡${level}：视频加载失败`, e);
                });
                levelAssets.background = { type, src, element: video };
              } else {
                const img = new Image();
                configureImageForUrl(img, src);
                img.addEventListener("load", () => {
                  console.log(`关卡${level}：图片加载成功`);
                });
                img.addEventListener("error", (e) => {
                  console.error(`关卡${level}：图片加载失败`, e);
                });
                levelAssets.background = { type, src, element: img };
              }
            }

            if (assets.snakeHead) {
              const { type, src } = assets.snakeHead;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeHead = { type, src, element: img };
            }

            // 加载4个方向的蛇头
            if (assets.snakeHeadUp) {
              const { type, src } = assets.snakeHeadUp;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeHeadUp = { type, src, element: img };
            }

            if (assets.snakeHeadDown) {
              const { type, src } = assets.snakeHeadDown;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeHeadDown = { type, src, element: img };
            }

            if (assets.snakeHeadLeft) {
              const { type, src } = assets.snakeHeadLeft;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeHeadLeft = { type, src, element: img };
            }

            if (assets.snakeHeadRight) {
              const { type, src } = assets.snakeHeadRight;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeHeadRight = { type, src, element: img };
            }

            if (assets.snakeTail) {
              const { type, src } = assets.snakeTail;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeTail = { type, src, element: img };
            }

            // 加载4个方向的蛇尾
            if (assets.snakeTailUp) {
              const { type, src } = assets.snakeTailUp;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeTailUp = { type, src, element: img };
            }

            if (assets.snakeTailDown) {
              const { type, src } = assets.snakeTailDown;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeTailDown = { type, src, element: img };
            }

            if (assets.snakeTailLeft) {
              const { type, src } = assets.snakeTailLeft;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeTailLeft = { type, src, element: img };
            }

            if (assets.snakeTailRight) {
              const { type, src } = assets.snakeTailRight;
              const img = new Image();
              configureImageForUrl(img, src);
              levelAssets.snakeTailRight = { type, src, element: img };
            }

            // 兼容旧版本：snakeBody可能是数组格式，需要转换
            if (assets.snakeBody) {
              // 如果是数组格式（旧版本），取第一个
              const bodyAsset = Array.isArray(assets.snakeBody)
                ? assets.snakeBody[0]
                : assets.snakeBody;
              if (bodyAsset) {
                const { type, src } = bodyAsset;
                if (type === "video") {
                  const video = document.createElement("video");
                  video.src = src;
                  video.loop = true;
                  video.muted = true;
                  video.playsInline = true;
                  video.autoplay = true;
                  levelAssets.snakeBody = { type, src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, src);
                  levelAssets.snakeBody = { type, src, element: img };
                }
              }
            }

            // 加载4个方向的蛇身（兼容旧版本数组格式）
            if (assets.snakeBodyUp) {
              const bodyAsset = Array.isArray(assets.snakeBodyUp)
                ? assets.snakeBodyUp[0]
                : assets.snakeBodyUp;
              if (bodyAsset) {
                const { type, src } = bodyAsset;
                if (type === "video") {
                  const video = document.createElement("video");
                  video.src = src;
                  video.loop = true;
                  video.muted = true;
                  video.playsInline = true;
                  video.autoplay = true;
                  levelAssets.snakeBodyUp = { type, src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, src);
                  levelAssets.snakeBodyUp = { type, src, element: img };
                }
              }
            }

            if (assets.snakeBodyDown) {
              const bodyAsset = Array.isArray(assets.snakeBodyDown)
                ? assets.snakeBodyDown[0]
                : assets.snakeBodyDown;
              if (bodyAsset) {
                const { type, src } = bodyAsset;
                if (type === "video") {
                  const video = document.createElement("video");
                  video.src = src;
                  video.loop = true;
                  video.muted = true;
                  video.playsInline = true;
                  video.autoplay = true;
                  levelAssets.snakeBodyDown = { type, src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, src);
                  levelAssets.snakeBodyDown = { type, src, element: img };
                }
              }
            }

            if (assets.snakeBodyLeft) {
              const bodyAsset = Array.isArray(assets.snakeBodyLeft)
                ? assets.snakeBodyLeft[0]
                : assets.snakeBodyLeft;
              if (bodyAsset) {
                const { type, src } = bodyAsset;
                if (type === "video") {
                  const video = document.createElement("video");
                  video.src = src;
                  video.loop = true;
                  video.muted = true;
                  video.playsInline = true;
                  video.autoplay = true;
                  levelAssets.snakeBodyLeft = { type, src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, src);
                  levelAssets.snakeBodyLeft = { type, src, element: img };
                }
              }
            }

            if (assets.snakeBodyRight) {
              const bodyAsset = Array.isArray(assets.snakeBodyRight)
                ? assets.snakeBodyRight[0]
                : assets.snakeBodyRight;
              if (bodyAsset) {
                const { type, src } = bodyAsset;
                if (type === "video") {
                  const video = document.createElement("video");
                  video.src = src;
                  video.loop = true;
                  video.muted = true;
                  video.playsInline = true;
                  video.autoplay = true;
                  levelAssets.snakeBodyRight = { type, src, element: video };
                } else {
                  const img = new Image();
                  configureImageForUrl(img, src);
                  levelAssets.snakeBodyRight = { type, src, element: img };
                }
              }
            }

            if (assets.thumbnail) {
              const img = new Image();
              configureImageForUrl(img, assets.thumbnail.src);
              levelAssets.thumbnail = {
                type: assets.thumbnail.type,
                src: assets.thumbnail.src,
                element: img,
              };
            }
          }
          console.log("✅ 自定义素材加载完成");
        } else {
          console.log("ℹ��� 没有找到自定义素材，使用默认素材");
        }
      } catch (error) {
        console.error("❌ 加�������定义素材失败:", error);
      }

      console.log("🎮 所有素材加载完成，游戏就绪");
      setLevelAssets(newAssets);
    };

    loadAssets();
  }, []); // 只在应用启动时运行一次

  // 保存用户自定义素材到localStorage（当素材变化时）
  useEffect(() => {
    // 只保存用户上传的部分（有src的素材），跳过临时素材
    const assetsToSave: Record<number, Record<string, unknown>> = {};

    for (const [levelId, assets] of Object.entries(levelAssets) as [
      string,
      LevelAssets,
    ][]) {
      const level = parseInt(levelId);
      assetsToSave[level] = {
        background:
          assets.background && !assets.background.temporary
            ? { type: assets.background.type, src: assets.background.src }
            : null,
        backgrounds: assets.backgrounds
          ? assets.backgrounds
              .filter((asset) => !asset.temporary)
              .map((asset) => ({ type: asset.type, src: asset.src }))
          : [],
        snakeHead:
          assets.snakeHead && !assets.snakeHead.temporary
            ? { type: assets.snakeHead.type, src: assets.snakeHead.src }
            : null,
        snakeHeadUp:
          assets.snakeHeadUp && !assets.snakeHeadUp.temporary
            ? { type: assets.snakeHeadUp.type, src: assets.snakeHeadUp.src }
            : null,
        snakeHeadDown:
          assets.snakeHeadDown && !assets.snakeHeadDown.temporary
            ? { type: assets.snakeHeadDown.type, src: assets.snakeHeadDown.src }
            : null,
        snakeHeadLeft:
          assets.snakeHeadLeft && !assets.snakeHeadLeft.temporary
            ? { type: assets.snakeHeadLeft.type, src: assets.snakeHeadLeft.src }
            : null,
        snakeHeadRight:
          assets.snakeHeadRight && !assets.snakeHeadRight.temporary
            ? {
                type: assets.snakeHeadRight.type,
                src: assets.snakeHeadRight.src,
              }
            : null,
        snakeBody:
          assets.snakeBody && !assets.snakeBody.temporary
            ? { type: assets.snakeBody.type, src: assets.snakeBody.src }
            : null,
        snakeBodyUp:
          assets.snakeBodyUp && !assets.snakeBodyUp.temporary
            ? { type: assets.snakeBodyUp.type, src: assets.snakeBodyUp.src }
            : null,
        snakeBodyDown:
          assets.snakeBodyDown && !assets.snakeBodyDown.temporary
            ? { type: assets.snakeBodyDown.type, src: assets.snakeBodyDown.src }
            : null,
        snakeBodyLeft:
          assets.snakeBodyLeft && !assets.snakeBodyLeft.temporary
            ? { type: assets.snakeBodyLeft.type, src: assets.snakeBodyLeft.src }
            : null,
        snakeBodyRight:
          assets.snakeBodyRight && !assets.snakeBodyRight.temporary
            ? {
                type: assets.snakeBodyRight.type,
                src: assets.snakeBodyRight.src,
              }
            : null,
        snakeTail:
          assets.snakeTail && !assets.snakeTail.temporary
            ? { type: assets.snakeTail.type, src: assets.snakeTail.src }
            : null,
        snakeTailUp:
          assets.snakeTailUp && !assets.snakeTailUp.temporary
            ? { type: assets.snakeTailUp.type, src: assets.snakeTailUp.src }
            : null,
        snakeTailDown:
          assets.snakeTailDown && !assets.snakeTailDown.temporary
            ? { type: assets.snakeTailDown.type, src: assets.snakeTailDown.src }
            : null,
        snakeTailLeft:
          assets.snakeTailLeft && !assets.snakeTailLeft.temporary
            ? { type: assets.snakeTailLeft.type, src: assets.snakeTailLeft.src }
            : null,
        snakeTailRight:
          assets.snakeTailRight && !assets.snakeTailRight.temporary
            ? {
                type: assets.snakeTailRight.type,
                src: assets.snakeTailRight.src,
              }
            : null,
        thumbnail:
          assets.thumbnail && !assets.thumbnail.temporary
            ? { type: assets.thumbnail.type, src: assets.thumbnail.src }
            : null,
      };
    }

    try {
      const jsonString = JSON.stringify(assetsToSave);
      const sizeInBytes = jsonString.length;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      // 只在有实际内容时才保存
      if (sizeInBytes < 100) {
        console.log("ℹ️ 没有需要保存的素材（都是临时文件或默认素材）");
        return;
      }

      // localStorage限制通常是5-10MB，我们设置安全阈值为5MB
      const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB (实际限制)

      if (sizeInBytes > MAX_STORAGE_SIZE) {
        console.log(`⚠️ 素材总大小 ${sizeInMB}MB 超过localStorage限制 5MB`);
        console.log("💡 尝试清理旧数据并重新保存...");

        // 先清理旧数据
        try {
          localStorage.removeItem("snakeGameCustomAssets");
        } catch (e) {
          console.error("清理旧数据失败:", e);
        }

        // 如果还是太大，就不保存
        console.log(
          "⚠️ 素材过大，无法保存到localStorage（会在会话期间保持可用）",
        );
        alert(
          "⚠️ 素材文件过大\n\n您上传的素材总大小超过了浏览器存储限制（5MB）。\n\n当前状态：\n• 素材可以正常使用（临时模式）\n• 刷新页面后需要重新上传\n\n💡 建议：\n• 使用更小的图片（压缩或降低分辨率）\n• 只上传必要的素材\n• 避免使用视频文件（改用GIF）",
        );
        return;
      }

      localStorage.setItem("snakeGameCustomAssets", jsonString);
      localStorage.setItem("snakeGameAssetsVersion", String(ASSETS_VERSION));
      console.log(`✅ 素材保存成功 (${sizeInMB}MB)`);
    } catch (error) {
      console.error("❌ 保存自定义素材失败:", error);
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.log("🔄 检测到QuotaExceeded，尝试清理localStorage并重试...");
        try {
          localStorage.removeItem("snakeGameCustomAssets");
          const jsonString = JSON.stringify(assetsToSave);
          localStorage.setItem("snakeGameCustomAssets", jsonString);
          localStorage.setItem(
            "snakeGameAssetsVersion",
            String(ASSETS_VERSION),
          );
          console.log("✅ 清理后保存成功");
          return; // 成功后直接返回
        } catch (retryError) {
          console.error("❌ 重试后仍然失败:", retryError);
        }
        alert(
          "⚠️ 存储空间不足\n\n部分素材无法保存，但可以正常使用（临时模式）。\n\n💡 提示：\n• 大文件已自动使用临时模式\n• 刷新后需要重新上传大文件\n• 小文件（<100MB）会自动永久保存",
        );
      } else {
        alert("保存素材失败：" + error);
      }
    }
  }, [levelAssets]);

  // 保存游戏参数到localStorage（带错误保护）
  useEffect(() => {
    try {
      localStorage.setItem(
        "snakeGamePlayerInitialLength",
        playerInitialLength.toString(),
      );
    } catch (e) {
      console.log("localStorage保存失败（playerInitialLength），但不影响游戏");
    }
  }, [playerInitialLength]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "snakeGameEnemySpawnInterval",
        enemySpawnInterval.toString(),
      );
    } catch (e) {
      console.log("localStorage保存失败（enemySpawnInterval），但不影响游戏");
    }
  }, [enemySpawnInterval]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "snakeGameSegmentMaxHealth",
        segmentMaxHealth.toString(),
      );
    } catch (e) {
      console.log("localStorage保存失败（segmentMaxHealth），但不影响游戏");
    }
  }, [segmentMaxHealth]);

  // 蛇���小������间距现在在onChange中直接保存到localStorage（按关卡）

  // 生成随机食物
  const generateFood = useCallback(
    (currentSnake: Position[]) => {
      let newFood: Position;
      const config = getLevelConfig(currentLevel);
      const gridSize =
        config?.mode === "growing" ? GRID_SIZE * mapScale : GRID_SIZE;

      do {
        newFood = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
        };
      } while (
        currentSnake.some(
          (segment) => segment.x === newFood.x && segment.y === newFood.y,
        )
      );

      return newFood;
    },
    [currentLevel, mapScale],
  );

  // 关卡7：生成新球
  const generateBalls = useCallback(
    (
      count: number,
      currentSnake: Position[],
      existingBalls: Ball[],
    ): Ball[] => {
      const newBalls: Ball[] = [];
      const usedPositions = new Set<string>();
      const currentTime = Date.now();

      // 标记已占用的位置（蛇和现有球）
      currentSnake.forEach((segment) =>
        usedPositions.add(`${segment.x},${segment.y}`),
      );
      existingBalls.forEach((ball) => usedPositions.add(`${ball.x},${ball.y}`));

      for (let i = 0; i < count; i++) {
        let pos: Position;
        do {
          pos = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          };
        } while (usedPositions.has(`${pos.x},${pos.y}`));

        usedPositions.add(`${pos.x},${pos.y}`);

        newBalls.push({
          id: nextBallId + i,
          x: pos.x,
          y: pos.y,
          opacity: 0, // 初始透明，等待出现
          spawnTime: currentTime + Math.random() * 2000, // 0-2秒内随机出现
          blinkSpeed: initialBallBlinkSpeed * (0.8 + Math.random() * 0.4), // 基于基准的闪烁周期
          phaseOffset: Math.random(), // 0-1的随机相位偏移
        });
      }

      setNextBallId((prev) => prev + count);
      return newBalls;
    },
    [nextBallId, initialBallBlinkSpeed],
  );

  // 生成随机食物列表（关卡6）
  const generateFoodList = useCallback(() => {
    const foods: Position[] = [];
    const usedPositions = new Set<string>();

    for (let i = 0; i < 15; i++) {
      let pos: Position;
      do {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
      } while (usedPositions.has(`${pos.x},${pos.y}`));

      usedPositions.add(`${pos.x},${pos.y}`);
      foods.push(pos);
    }
    return foods;
  }, []);

  // 生成敌人蛇的追踪路径 - 直线追击
  const generateEnemyPath = useCallback(
    (start: Position, target: Position): Position[] => {
      const path: Position[] = [];
      let current = { ...start };

      // 先移动X轴，再移动Y轴（直线追击）
      while (current.x !== target.x) {
        path.push({ ...current });
        current.x += current.x < target.x ? 1 : -1;
      }

      while (current.y !== target.y) {
        path.push({ ...current });
        current.y += current.y < target.y ? 1 : -1;
      }

      path.push({ ...target });
      return path;
    },
    [],
  );

  // 随机交换按键
  const shuffleKeys = useCallback(() => {
    const directions = ["up", "down", "left", "right"] as const;
    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    setKeyMapping({
      up: [
        "arrowup",
        shuffled[0] === "up"
          ? "w"
          : shuffled[0] === "down"
            ? "s"
            : shuffled[0] === "left"
              ? "a"
              : "d",
      ],
      down: [
        "arrowdown",
        shuffled[1] === "up"
          ? "w"
          : shuffled[1] === "down"
            ? "s"
            : shuffled[1] === "left"
              ? "a"
              : "d",
      ],
      left: [
        "arrowleft",
        shuffled[2] === "up"
          ? "w"
          : shuffled[2] === "down"
            ? "s"
            : shuffled[2] === "left"
              ? "a"
              : "d",
      ],
      right: [
        "arrowright",
        shuffled[3] === "up"
          ? "w"
          : shuffled[3] === "down"
            ? "s"
            : shuffled[3] === "left"
              ? "a"
              : "d",
      ],
    });
  }, []);

  // 初始化关卡
  useEffect(() => {
    if (gameState !== "playing") return;

    const config = getLevelConfig(currentLevel);

    if (config?.mode === "shadow") {
      // 关卡2：初始化影子蛇，玩家蛇1节长度
      const initialSnake: Position[] = [{ x: 10, y: 10 }];
      setSnake(initialSnake);

      // 影子蛇6节，尾巴在主角头部前方3格
      const initialShadow: Position[] = [
        { x: 18, y: 10 },
        { x: 17, y: 10 },
        { x: 16, y: 10 },
        { x: 15, y: 10 },
        { x: 14, y: 10 },
        { x: 13, y: 10 }, // 尾巴在13,10，距离主角头部(10,10)正好3格
      ];
      setShadowSnake(initialShadow);
      setShadowDirection(INITIAL_DIRECTION);
      shadowDirectionRef.current = INITIAL_DIRECTION;
      setShadowPath([
        "10,10",
        "11,10",
        "12,10",
        "13,10",
        "14,10",
        "15,10",
        "16,10",
        "17,10",
        "18,10",
      ]); // 初始路径
    } else if (config?.mode === "traffic") {
      // 关卡3：初始化红绿灯
      setFoodColor("red");
      setSnake(INITIAL_SNAKE);
    } else if (config?.mode === "speed") {
      // 关卡6：初始化平滑移动的红球
      const initialFood = generateFood(INITIAL_SNAKE);
      setFood(initialFood);
      setSpeedFoodBlinkSpeed(200); // 200ms移动一次 = 一秒5次
      setSpeedFoodPixelPos({
        x: initialFood.x * CELL_SIZE,
        y: initialFood.y * CELL_SIZE,
      });
      speedFoodPixelRef.current = {
        x: initialFood.x * CELL_SIZE,
        y: initialFood.y * CELL_SIZE,
      };
      setSpeedFoodTarget(initialFood);
      setSpeedFoodMoveStartTime(Date.now());
      setSnake(INITIAL_SNAKE);
    } else if (config?.mode === "blink") {
      // 关卡7：初始化闪烁迷阵 - 生成5个球
      setSnake(INITIAL_SNAKE);
      const initialBalls = generateBalls(5, INITIAL_SNAKE, []);
      setBalls(initialBalls);
      setBallCount(5);
      ballOpacityPhaseRef.current = 0;
    } else if (config?.mode === "escape") {
      // 关卡8：根据设置初始化蛇的长度
      const initialSnake: Position[] = [];
      for (let i = 0; i < playerInitialLength; i++) {
        initialSnake.push({ x: 10 - i, y: 10 });
      }
      setSnake(initialSnake);
      // 初始化每格蛇身的血量为最大血量
      setSegmentHealth(Array(playerInitialLength).fill(segmentMaxHealth));
      setEnemySnakes([]);
      setNextEnemyId(0);
    } else {
      // 其他关卡：使用默认初始蛇
      setSnake(INITIAL_SNAKE);
    }
  }, [
    currentLevel,
    gameState,
    generateFoodList,
    playerInitialLength,
    segmentMaxHealth,
  ]);

  // 同步snake到snakeRef
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  // 同步balls到ballsRef（关卡7）
  useEffect(() => {
    ballsRef.current = balls;
  }, [balls]);

  // 同步蛇身长度和血量数组（关卡8）
  useEffect(() => {
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "escape") return;
    if (gameState !== "playing") return;

    // 如果蛇变长了（虽然关卡8不吃食物，但为了完整性），给新格子添加满血量
    if (snake.length > segmentHealth.length) {
      setSegmentHealth((prev) => {
        const newHealth = [...prev];
        while (newHealth.length < snake.length) {
          newHealth.push(segmentMaxHealth);
        }
        return newHealth;
      });
    }
    // 如果蛇变短了，血量数组已经在碰撞处理中同步移除
  }, [
    snake.length,
    segmentHealth.length,
    currentLevel,
    gameState,
    segmentMaxHealth,
  ]);

  // 影子蛇自动���路移动（关卡2）- 慢速简单移动
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "shadow") return;
    if (shadowSnake.length === 0 || !shadowSnake[0]) return;

    // 慢速移动：使用更长的间隔
    const shadowMoveInterval = setInterval(() => {
      setShadowSnake((prevShadow) => {
        if (!prevShadow || prevShadow.length === 0) return prevShadow;

        const head = prevShadow[0];

        // 简单的AI：只在需要改变方向时才改，优先保持当前方向
        let newDirection = { ...shadowDirectionRef.current };
        const dx = food.x - head.x;
        const dy = food.y - head.y;

        // 简化寻路：只有当前方向无法���近目标时才改变方向
        const movingTowardsFood =
          (shadowDirectionRef.current.x > 0 && dx > 0) ||
          (shadowDirectionRef.current.x < 0 && dx < 0) ||
          (shadowDirectionRef.current.y > 0 && dy > 0) ||
          (shadowDirectionRef.current.y < 0 && dy < 0);

        if (!movingTowardsFood) {
          // 需要改变方向，选择最简单的路径
          if (Math.abs(dx) > Math.abs(dy)) {
            // 优先横向移动
            if (dx > 0 && shadowDirectionRef.current.x !== -1) {
              newDirection = { x: 1, y: 0 };
            } else if (dx < 0 && shadowDirectionRef.current.x !== 1) {
              newDirection = { x: -1, y: 0 };
            }
          } else {
            // 然后纵向移动
            if (dy > 0 && shadowDirectionRef.current.y !== -1) {
              newDirection = { x: 0, y: 1 };
            } else if (dy < 0 && shadowDirectionRef.current.y !== 1) {
              newDirection = { x: 0, y: -1 };
            }
          }
        }

        shadowDirectionRef.current = newDirection;
        setShadowDirection(newDirection);

        let newHead = {
          x: head.x + newDirection.x,
          y: head.y + newDirection.y,
        };

        // 穿墙
        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        else if (newHead.x >= GRID_SIZE) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        else if (newHead.y >= GRID_SIZE) newHead.y = 0;

        // 记录影子蛇走过的路径
        setShadowPath((prev) => [...prev, `${newHead.x},${newHead.y}`]);

        // 保持影子蛇6节长度
        const newShadow = [newHead, ...prevShadow];
        if (newShadow.length > 6) newShadow.pop();

        return newShadow;
      });
    }, GAME_SPEED * 2); // 慢速：两倍速度间隔

    return () => clearInterval(shadowMoveInterval);
  }, [gameState, isPaused, currentLevel, shadowSnake, food]);

  // 红绿灯变化（关卡3）
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "traffic") return;

    // 如果分数小于20（吃到2个球前），使用固定间隔
    if (score < 20) {
      const trafficInterval = setInterval(() => {
        setFoodColor((prev) => (prev === "red" ? "green" : "red"));
      }, trafficSpeed);

      return () => clearInterval(trafficInterval);
    } else {
      // 吃到2个球后（分数>=20），使用随机间隔
      let timeoutId: ReturnType<typeof setTimeout>;

      const scheduleNextChange = () => {
        // 基于当前trafficSpeed生成随机间隔：50%~150%的范围
        const minInterval = trafficSpeed * 0.5;
        const maxInterval = trafficSpeed * 1.5;
        const randomInterval =
          minInterval + Math.random() * (maxInterval - minInterval);

        timeoutId = setTimeout(() => {
          setFoodColor((prev) => (prev === "red" ? "green" : "red"));
          scheduleNextChange(); // 递归调度下一次变化
        }, randomInterval);
      };

      scheduleNextChange();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [gameState, isPaused, currentLevel, trafficSpeed, score]);

  // 关卡6：红球平滑移动 - 每隔一段时间选择新目标（一秒5次）
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "speed") return;

    const positionChangeInterval = setInterval(() => {
      setSnake((currentSnake) => {
        const newTarget = generateFood(currentSnake);

        // 保存当前位置作为起始点（用于平滑插值）
        if (!speedFoodPixelRef.current) {
          // 如果是第一次，直接设置到目标位置
          speedFoodPixelRef.current = {
            x: newTarget.x * CELL_SIZE,
            y: newTarget.y * CELL_SIZE,
          };
        }

        setSpeedFoodTarget(newTarget);
        setFood(newTarget); // 同时更新food用于碰撞检测
        setSpeedFoodMoveStartTime(Date.now());
        return currentSnake;
      });
    }, speedFoodBlinkSpeed);

    return () => clearInterval(positionChangeInterval);
  }, [gameState, isPaused, currentLevel, speedFoodBlinkSpeed, generateFood]);

  // 关卡6：红球平滑移动动画
  useEffect(() => {
    if (gameState !== "playing") return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "speed") return;
    if (!speedFoodTarget) return; // 如果没有目标，不启动动画

    let animationFrameId: number;

    const animate = () => {
      if (!speedFoodPixelRef.current || !speedFoodTarget) {
        // 等待初始化完成
        return;
      }

      const now = Date.now();
      const elapsed = now - speedFoodMoveStartTime;
      const duration = speedFoodBlinkSpeed; // 移动持续时间等于切换间隔
      const progress = Math.min(elapsed / duration, 1); // 0到1之间

      // 计算起始位置和目标位置
      const startX = speedFoodPixelRef.current.x;
      const startY = speedFoodPixelRef.current.y;
      const targetX = speedFoodTarget.x * CELL_SIZE;
      const targetY = speedFoodTarget.y * CELL_SIZE;

      // 线性插值
      const currentX = startX + (targetX - startX) * progress;
      const currentY = startY + (targetY - startY) * progress;

      // 更新当前位置
      const newPos = { x: currentX, y: currentY };
      speedFoodPixelRef.current = newPos;
      setSpeedFoodPixelPos(newPos);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    gameState,
    currentLevel,
    speedFoodTarget,
    speedFoodMoveStartTime,
    speedFoodBlinkSpeed,
  ]);

  // 关卡7：球的位置切换（一秒3次 = 333ms）
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "blink") return;

    const positionChangeInterval = setInterval(() => {
      setSnake((currentSnake) => {
        setBalls((prevBalls) => {
          const currentTime = Date.now();

          // 只对已经出现的球改变位置
          return prevBalls.map((ball) => {
            // 如果球还没出现，保持原样
            if (currentTime < ball.spawnTime) {
              return ball;
            }

            // 生成新位置（避开蛇和其他球）
            const usedPositions = new Set<string>();
            currentSnake.forEach((segment) =>
              usedPositions.add(`${segment.x},${segment.y}`),
            );
            prevBalls.forEach((b) => {
              if (b.id !== ball.id) {
                usedPositions.add(`${b.x},${b.y}`);
              }
            });

            let newPos: Position;
            do {
              newPos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
              };
            } while (usedPositions.has(`${newPos.x},${newPos.y}`));

            // 保留原有的闪烁属性，只改变位置
            return {
              ...ball,
              x: newPos.x,
              y: newPos.y,
            };
          });
        });
        return currentSnake;
      });
    }, 333); // 333ms = 一秒3次

    return () => clearInterval(positionChangeInterval);
  }, [gameState, isPaused, currentLevel, generateBalls]);

  // 关卡7：球的透明度闪烁动画（每个球独立闪烁）
  useEffect(() => {
    if (gameState !== "playing") return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "blink") return;

    let animationFrameId: number;

    const animate = () => {
      const currentTime = Date.now();

      // 更新每个球的透明度（独立计算）
      setBalls((prevBalls) =>
        prevBalls.map((ball) => {
          // 如果球还未到出现时间，保持透明
          if (currentTime < ball.spawnTime) {
            return { ...ball, opacity: 0 };
          }

          // 计算该球的闪烁相位
          const timeSinceSpawn = currentTime - ball.spawnTime;
          const phase =
            (timeSinceSpawn / ball.blinkSpeed + ball.phaseOffset) % 1; // 0-1循环

          // 使用正弦波创建平滑的渐隐渐现效果（透明度在0.3-1之间）
          const opacity =
            0.3 + (0.7 * (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1)) / 2;

          return { ...ball, opacity };
        }),
      );

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState, currentLevel]);

  // 生成敌人蛇（关卡8）
  useEffect(() => {
    if (gameState !== "playing" || isPaused || gameOver) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "escape") return;

    // 使用ref来追踪敌人ID，避免闭包问题
    const enemyIdRef = { current: nextEnemyId };

    // 生成敌人蛇的函数
    const spawnEnemy = () => {
      setEnemySnakes((prev) => {
        // 移除限制，允许更多敌人蛇同时存在
        if (prev.length >= 10) return prev; // 最多10条，避免性能问题

        const edge = Math.floor(Math.random() * 4);
        let start: Position;
        let direction: { dx: number; dy: number };

        switch (edge) {
          case 0: // 从上边进入 - 头向下
            start = { x: Math.floor(Math.random() * GRID_SIZE), y: 0 };
            direction = { dx: 0, dy: 1 }; // 身体向上延伸到地图外（负y）
            break;
          case 1: // 从右边进入 - 头向左
            start = {
              x: GRID_SIZE - 1,
              y: Math.floor(Math.random() * GRID_SIZE),
            };
            direction = { dx: -1, dy: 0 }; // 身体向右延伸到地图外（超过GRID_SIZE）
            break;
          case 2: // 从下边进入 - 头向上
            start = {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: GRID_SIZE - 1,
            };
            direction = { dx: 0, dy: -1 }; // 身体向下延伸到地图外
            break;
          default: // 从左边进入 - 头向右
            start = { x: 0, y: Math.floor(Math.random() * GRID_SIZE) };
            direction = { dx: 1, dy: 0 }; // 身体向左延伸到地图外（负x）
        }

        // 生成3-5��长度的敌人蛇身体
        // 注意：direction表示头的朝向，身体应该在相反方向
        const bodyLength = 3 + Math.floor(Math.random() * 3); // 3-5格
        const body: Position[] = [start];
        for (let i = 1; i < bodyLength; i++) {
          const prevSegment = body[i - 1];
          // 身体在头的反方向
          body.push({
            x: prevSegment.x - direction.dx,
            y: prevSegment.y - direction.dy,
          });
        }

        // 随机颜色（丰富的颜色池，每条蛇颜色不同）
        const colors = [
          "#ff0000", // 红色
          "#0000ff", // 蓝色
          "#00ff00", // 绿色
          "#ffff00", // 黄色
          "#ff00ff", // 洋红
          "#00ffff", // 青色
          "#ff8800", // 橙色
          "#8800ff", // 紫色
          "#ff0088", // 粉红
          "#88ff00", // 黄绿色
        ];
        const usedColors = prev.map((e) => e.color);
        const availableColors = colors.filter((c) => !usedColors.includes(c));
        const color =
          availableColors.length > 0
            ? availableColors[
                Math.floor(Math.random() * availableColors.length)
              ]
            : colors[Math.floor(Math.random() * colors.length)];

        enemyIdRef.current++;
        setNextEnemyId(enemyIdRef.current);

        return [
          ...prev,
          {
            id: enemyIdRef.current,
            position: start,
            body: body,
            color: color,
            path: [], // 实时计算，不需要预生成路径
            pathIndex: 0,
          },
        ];
      });
    };

    // 使用自定义间隔生成新的敌人蛇
    const spawnInterval = setInterval(() => {
      spawnEnemy();
    }, enemySpawnInterval);

    return () => clearInterval(spawnInterval);
  }, [
    gameState,
    isPaused,
    gameOver,
    currentLevel,
    enemySpawnInterval,
    nextEnemyId,
  ]);

  // 敌人蛇移动（关卡8）
  useEffect(() => {
    if (gameState !== "playing" || isPaused || gameOver) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "escape") return;

    const enemyMoveInterval = setInterval(() => {
      const currentPlayerSnake = snakeRef.current;
      if (!currentPlayerSnake || currentPlayerSnake.length === 0) return;

      // 目标是玩家蛇的尾巴（最后一格）
      const playerTail = currentPlayerSnake[currentPlayerSnake.length - 1];

      setEnemySnakes((prev) => {
        if (prev.length === 0) return prev;

        // 先移动所有敌人蛇
        const movedEnemies = prev.map((enemy) => {
          // 使用身体第一段作为当前位置
          const currentHead =
            enemy.body && enemy.body.length > 0
              ? enemy.body[0]
              : enemy.position;

          // 每次移动都重新计算路径，直接追击玩家尾巴
          const dx = playerTail.x - currentHead.x;
          const dy = playerTail.y - currentHead.y;

          let newPosition = { ...currentHead };

          // 优先移动距离更远的轴（更直接的追击）
          if (Math.abs(dx) > Math.abs(dy)) {
            newPosition.x += dx > 0 ? 1 : -1;
          } else if (Math.abs(dy) > 0) {
            newPosition.y += dy > 0 ? 1 : -1;
          } else if (Math.abs(dx) > 0) {
            newPosition.x += dx > 0 ? 1 : -1;
          }

          const newBody = [
            newPosition,
            ...enemy.body.slice(0, enemy.body.length - 1),
          ];
          return {
            ...enemy,
            position: newPosition,
            body: newBody,
            path: [], // 不再使用预计算路径
            pathIndex: 0,
          };
        });

        // 检测碰撞
        const currentPlayerSnake = snakeRef.current;
        const collidedEnemyIds: number[] = [];

        movedEnemies.forEach((enemy) => {
          // 检查敌人蛇的任意身体部分是否与玩家蛇的任意身体部分碰撞
          const hasCollision = enemy.body.some((enemySegment) => {
            // 只检查在地图内的段
            if (
              enemySegment.x < 0 ||
              enemySegment.x >= GRID_SIZE ||
              enemySegment.y < 0 ||
              enemySegment.y >= GRID_SIZE
            ) {
              return false;
            }

            return currentPlayerSnake.some(
              (playerSegment) =>
                playerSegment.x === enemySegment.x &&
                playerSegment.y === enemySegment.y,
            );
          });

          if (hasCollision) {
            collidedEnemyIds.push(enemy.id);
          }
        });

        // 如果有碰撞，处理碰撞效果
        if (collidedEnemyIds.length > 0) {
          const totalHits = collidedEnemyIds.length;

          // 一次性处理所有碰撞的血量扣除
          setSegmentHealth((prevHealth) => {
            if (prevHealth.length === 0) return prevHealth;

            let newHealth = [...prevHealth];
            let segmentsToRemove = 0;
            let remainingDamage = totalHits;

            // 从尾巴开始扣血量
            while (remainingDamage > 0 && newHealth.length > 0) {
              const lastIndex = newHealth.length - 1;
              const currentHealth = newHealth[lastIndex];

              if (remainingDamage >= currentHealth) {
                // 伤害足够摧毁这一格
                remainingDamage -= currentHealth;
                segmentsToRemove++;
                newHealth.pop();
              } else {
                // 伤害不足以摧毁这一格，只扣血
                newHealth[lastIndex] -= remainingDamage;
                remainingDamage = 0;
              }
            }

            // 如果有格子被摧毁，同步更新蛇
            if (segmentsToRemove > 0) {
              setSnake((prevSnake) => {
                const newSnake = prevSnake.slice(0, -segmentsToRemove);

                // 如果减少后长度为0，游戏失败
                if (newSnake.length === 0) {
                  setGameOver(true);
                }

                return newSnake;
              });
            }

            return newHealth;
          });
        }

        // 移除碰撞的敌人蛇
        return movedEnemies.filter(
          (enemy) => !collidedEnemyIds.includes(enemy.id),
        );
      });
    }, 200);

    return () => clearInterval(enemyMoveInterval);
  }, [gameState, isPaused, gameOver, currentLevel]);

  // 关卡8：生存时间计时器
  useEffect(() => {
    if (gameState !== "playing" || isPaused || gameOver) return;
    const config = getLevelConfig(currentLevel);
    if (config?.mode !== "escape") return;

    const timer = setInterval(() => {
      setSurvivalTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isPaused, gameOver, currentLevel]);

  // 确保背景视频播放
  useEffect(() => {
    const currentBg = getCurrentBackground();
    if (currentBg && currentBg.type === "video" && currentBg.element) {
      const videoElement = currentBg.element as HTMLVideoElement;
      videoElement.play().catch(() => {
        // 自动播放可能被浏览器阻止，用户交互后会播放
      });
    }
  }, [gameState, currentLevel, backgroundIndex]);

  // 绘制游戏
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const config = getLevelConfig(currentLevel);
    const assets = getLevelAssets(currentLevel);
    const gridSize =
      config?.mode === "growing" ? GRID_SIZE * mapScale : GRID_SIZE;

    ctx.clearRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    ctx.save();

    if (config?.mode === "growing" && mapScale > 1) {
      const drawWidth = gridSize * CELL_SIZE;
      const drawHeight = gridSize * CELL_SIZE;
      const canvasCenterX = (GRID_SIZE * CELL_SIZE) / 2;
      const canvasCenterY = (GRID_SIZE * CELL_SIZE) / 2;
      const mapCenterX = drawWidth / 2;
      const mapCenterY = drawHeight / 2;
      const scale = 1 / mapScale;

      ctx.translate(canvasCenterX, canvasCenterY);
      ctx.scale(scale, scale);
      ctx.translate(-mapCenterX, -mapCenterY);
    }

    const drawWidth = gridSize * CELL_SIZE;
    const drawHeight = gridSize * CELL_SIZE;

    // 绘制背景
    if (
      config?.mode === "growing" &&
      assets.backgrounds &&
      assets.backgrounds.length > 0
    ) {
      // 关卡4：使用多张背景
      const currentBg =
        assets.backgrounds[
          Math.min(backgroundIndex, assets.backgrounds.length - 1)
        ];
      if (
        currentBg?.element &&
        safeDrawImageDest(
          ctx,
          currentBg.element,
          0,
          0,
          drawWidth,
          drawHeight,
        )
      ) {
        // 背景已绘制
      } else {
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(0, 0, drawWidth, drawHeight);
        ctx.strokeStyle = "#808080";
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridSize; i++) {
          ctx.beginPath();
          ctx.moveTo(i * CELL_SIZE, 0);
          ctx.lineTo(i * CELL_SIZE, drawHeight);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * CELL_SIZE);
          ctx.lineTo(drawWidth, i * CELL_SIZE);
          ctx.stroke();
        }
      }
    } else if (
      assets.background?.element &&
      safeDrawImageDest(
        ctx,
        assets.background.element,
        0,
        0,
        drawWidth,
        drawHeight,
      )
    ) {
      // 背景已绘制
    } else {
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(0, 0, drawWidth, drawHeight);
      ctx.strokeStyle = "#808080";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, drawHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(drawWidth, i * CELL_SIZE);
        ctx.stroke();
      }
    }

    // 绘制影子蛇（关卡2）- 始终使用固定的1倍大小和0间距
    if (config?.mode === "shadow" && shadowSnake.length > 0) {
      shadowSnake.forEach((segment, index) => {
        // 影子蛇不使用间距设置，保持默认紧凑
        const spacingOffsetX = 0;
        const spacingOffsetY = 0;

        const x = segment.x * CELL_SIZE + spacingOffsetX;
        const y = segment.y * CELL_SIZE + spacingOffsetY;

        // 影子蛇固定使用1倍大小，不受用户设置影响
        const baseSize = CELL_SIZE - 4;
        const scaledSize = baseSize * 1; // 固定1倍
        const offset = (CELL_SIZE - scaledSize) / 2;

        // 半透明蓝色
        ctx.fillStyle =
          index === 0 ? "rgba(100, 150, 255, 0.6)" : "rgba(100, 150, 255, 0.4)";
        ctx.fillRect(x + offset, y + offset, scaledSize, scaledSize);
        // 影子蛇头部标记
        if (index === 0) {
          // 按实际缩放比例计算（基于基础尺寸20px）
          const actualScale = scaledSize / 20;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          const outerSize = 12 * actualScale;
          const outerOffset = (scaledSize - outerSize) / 2;
          ctx.fillRect(
            x + offset + outerOffset,
            y + offset + outerOffset,
            outerSize,
            outerSize,
          );
          ctx.fillStyle = "rgba(100, 150, 255, 0.8)";
          const innerSize = 8 * actualScale;
          const innerOffset = (scaledSize - innerSize) / 2;
          ctx.fillRect(
            x + offset + innerOffset,
            y + offset + innerOffset,
            innerSize,
            innerSize,
          );
        }
      });
    }

    // 绘制玩家蛇
    snake.forEach((segment, index) => {
      // 根据间距系数计算节点间距偏移
      let spacingOffsetX = 0;
      let spacingOffsetY = 0;

      if (index > 0 && snakeSpacingFactor > 0) {
        // 计算从头部到当前节点的累积间距
        for (let i = 1; i <= index; i++) {
          const prev = snake[i - 1];
          const curr = snake[i];

          // 计算方向（从curr指向prev的反方向，让身体向尾巴方向拉开）
          const dx = Math.sign(curr.x - prev.x);
          const dy = Math.sign(curr.y - prev.y);

          // 根据用户设置的间距系数拉开距离
          const extraSpacing = snakeSpacingFactor * CELL_SIZE;
          spacingOffsetX += dx * extraSpacing;
          spacingOffsetY += dy * extraSpacing;
        }
      }

      const x = segment.x * CELL_SIZE + spacingOffsetX;
      const y = segment.y * CELL_SIZE + spacingOffsetY;

      // 计算缩放后的尺寸和偏移
      const baseSize = CELL_SIZE - 4;
      const scaledSize = baseSize * snakeScale;
      const offset = (CELL_SIZE - scaledSize) / 2;

      let asset: MediaAsset | null = null;
      let rotation = 0; // 旋转角度（弧度）

      // 优先使用全蛇贴图（如果设置了）
      if (assets.fullSnakeTexture) {
        asset = assets.fullSnakeTexture;

        // 计算每个节点的朝向（用于旋转贴图）
        let directionX = 0;
        let directionY = 0;

        if (index === 0) {
          // 蛇头：使用当前移动方向
          directionX = direction.x;
          directionY = direction.y;
        } else {
          // ��身和蛇尾：根据指向前一节���方向
          const prevSegment = snake[index - 1];
          directionX = Math.sign(prevSegment.x - segment.x);
          directionY = Math.sign(prevSegment.y - segment.y);
        }

        // 根据方向计算旋转角度（假设原图朝右）
        if (directionX === 1 && directionY === 0) {
          rotation = 0; // 向右：0°
        } else if (directionX === -1 && directionY === 0) {
          rotation = Math.PI; // 向左：180°
        } else if (directionX === 0 && directionY === -1) {
          rotation = -Math.PI / 2; // 向上：-90°
        } else if (directionX === 0 && directionY === 1) {
          rotation = Math.PI / 2; // 向下：90°
        }
      } else {
        // 使用传统的分离式贴图
        if (index === 0) {
          // 蛇头：根据移动方向选择对应的贴图
          if (direction.y === -1 && assets.snakeHeadUp) {
            asset = assets.snakeHeadUp; // 向上
          } else if (direction.y === 1 && assets.snakeHeadDown) {
            asset = assets.snakeHeadDown; // 向下
          } else if (direction.x === -1 && assets.snakeHeadLeft) {
            asset = assets.snakeHeadLeft; // 向左
          } else if (direction.x === 1 && assets.snakeHeadRight) {
            asset = assets.snakeHeadRight; // 向右
          } else {
            asset = assets.snakeHead; // 默认蛇头
          }
        } else if (index === snake.length - 1) {
          // 蛇尾：根据指向前一节（身体方向）的方向选���贴图
          if (index > 0) {
            const prevSegment = snake[index - 1];
            // 计算前一节相对于当前节的方向（也就是尾巴指向的方向）
            const dx = prevSegment.x - segment.x;
            const dy = prevSegment.y - segment.y;

            if (dy < 0 && assets.snakeTailUp) {
              asset = assets.snakeTailUp; // 尾巴向上
            } else if (dy > 0 && assets.snakeTailDown) {
              asset = assets.snakeTailDown; // 尾巴向下
            } else if (dx < 0 && assets.snakeTailLeft) {
              asset = assets.snakeTailLeft; // 尾巴向左
            } else if (dx > 0 && assets.snakeTailRight) {
              asset = assets.snakeTailRight; // 尾巴向右
            } else {
              asset = assets.snakeTail; // 默认蛇尾
            }
          } else {
            asset = assets.snakeTail;
          }
        } else {
          // 蛇身：根据指向前一节（头部方向）的方向选择贴图
          if (index > 0) {
            const prevSegment = snake[index - 1];
            // 计算前一节相对于当前节的方向（也就是这一节指向的方向）
            const dx = prevSegment.x - segment.x;
            const dy = prevSegment.y - segment.y;

            if (dy < 0 && assets.snakeBodyUp) {
              asset = assets.snakeBodyUp; // 身体向上
            } else if (dy > 0 && assets.snakeBodyDown) {
              asset = assets.snakeBodyDown; // 身体向下
            } else if (dx < 0 && assets.snakeBodyLeft) {
              asset = assets.snakeBodyLeft; // 身体向左
            } else if (dx > 0 && assets.snakeBodyRight) {
              asset = assets.snakeBodyRight; // 身体向右
            } else {
              asset = assets.snakeBody; // 默认蛇身
            }
          } else {
            asset = assets.snakeBody;
          }
        }
      }

      if (asset?.element) {
        // 安全检查：确保图片/视频已加载且状态正常
        const element = asset.element;
        const drawWithRotation = (el: HTMLImageElement | HTMLVideoElement) => {
          if (!isDrawableCanvasImageSource(el)) {
            drawDefaultSnake();
            return;
          }
          try {
            if (rotation !== 0) {
              ctx.save();
              ctx.translate(
                x + offset + scaledSize / 2,
                y + offset + scaledSize / 2,
              );
              ctx.rotate(rotation);
              ctx.drawImage(
                el,
                -scaledSize / 2,
                -scaledSize / 2,
                scaledSize,
                scaledSize,
              );
              ctx.restore();
            } else {
              ctx.drawImage(el, x + offset, y + offset, scaledSize, scaledSize);
            }
          } catch {
            drawDefaultSnake();
          }
        };

        if (element instanceof HTMLImageElement) {
          if (isDrawableCanvasImageSource(element)) {
            drawWithRotation(element);
          } else {
            drawDefaultSnake();
          }
        } else if (element instanceof HTMLVideoElement) {
          if (isDrawableCanvasImageSource(element)) {
            drawWithRotation(element);
          } else {
            drawDefaultSnake();
          }
        } else {
          drawDefaultSnake();
        }
      } else {
        drawDefaultSnake();
      }

      function drawDefaultSnake() {
        if (index === 0) {
          ctx.fillStyle = "#008000";
          ctx.fillRect(x + offset, y + offset, scaledSize, scaledSize);
          ctx.fillStyle = "#ffffff";
          // 眼睛大小按实际缩放比例计算（基于基础尺寸20px）
          const actualScale = scaledSize / 20;
          const eyeSize = 6 * actualScale;
          const eyeOffset = 4 * actualScale;
          const eyeThickness = 2 * actualScale;
          ctx.fillRect(
            x + offset + eyeOffset,
            y + offset + eyeOffset,
            eyeSize,
            eyeThickness,
          );
          ctx.fillRect(
            x + offset + eyeOffset,
            y + offset + eyeOffset,
            eyeThickness,
            eyeSize,
          );
        } else {
          ctx.fillStyle = "#00a000";
          ctx.fillRect(x + offset, y + offset, scaledSize, scaledSize);
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          // 高光大小按实际缩放比例计算（基于基础尺寸20px）
          const actualScale = scaledSize / 20;
          const highlightSize = 8 * actualScale;
          const highlightOffset = 3 * actualScale;
          ctx.fillRect(
            x + offset + highlightOffset,
            y + offset + highlightOffset,
            highlightSize,
            highlightSize,
          );
        }
      }

      // 关卡8：在尾巴上显示血量条
      if (
        config?.mode === "escape" &&
        index === snake.length - 1 &&
        segmentHealth.length > 0
      ) {
        const health = segmentHealth[index];
        const maxHealth = segmentMaxHealth;
        if (maxHealth > 1 && health > 0) {
          // 绘制血量条背景（红色）
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(x + 2, y - 3, CELL_SIZE - 4, 2);
          // 绘制当前血量（绿色）
          const healthWidth = ((CELL_SIZE - 4) * health) / maxHealth;
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(x + 2, y - 3, healthWidth, 2);
        }
      }
    });

    // 绘制食物
    if (config?.mode === "shadow") {
      // 关卡2：正常绘制食物（圆形）
      const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
      const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
      const radius = (CELL_SIZE - 8) / 2;
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(foodX - 2, foodY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (config?.mode === "traffic") {
      // 关卡3：根据颜色绘制（圆形）
      const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
      const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
      const radius = (CELL_SIZE - 8) / 2;
      ctx.fillStyle = foodColor === "green" ? "#00ff00" : "#ff0000";
      ctx.beginPath();
      ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(foodX - 2, foodY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (config?.mode === "speed") {
      // 关卡6：使用平滑移动的像素坐标绘制红球（圆形）
      if (speedFoodPixelPos) {
        const foodX = speedFoodPixelPos.x + CELL_SIZE / 2;
        const foodY = speedFoodPixelPos.y + CELL_SIZE / 2;
        const radius = (CELL_SIZE - 8) / 2;
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(foodX - 2, foodY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (config?.mode === "blink") {
      // 关卡7：闪烁迷阵 - 绘制所有带透明度的球（圆形）
      balls.forEach((ball) => {
        const ballX = ball.x * CELL_SIZE + CELL_SIZE / 2;
        const ballY = ball.y * CELL_SIZE + CELL_SIZE / 2;
        const radius = (CELL_SIZE - 8) / 2;
        ctx.globalAlpha = ball.opacity;
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ballX - 2, ballY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // 恢复默认透明度
    } else if (config?.mode !== "escape") {
      // 其他关卡：正常绘制（圆形）
      const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
      const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
      const radius = (CELL_SIZE - 8) / 2;
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(foodX - 2, foodY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制敌人蛇（关卡8）
    if (config?.mode === "escape" && enemySnakes.length > 0) {
      const gridSize = GRID_SIZE;
      enemySnakes.forEach((enemy) => {
        if (enemy.body && enemy.body.length > 0) {
          // 绘制敌人蛇的每一节身体（只绘制在地图内的部分）
          enemy.body.forEach((segment, index) => {
            // 检查是否在地图范围内
            if (
              segment.x < 0 ||
              segment.x >= gridSize ||
              segment.y < 0 ||
              segment.y >= gridSize
            ) {
              return; // 跳过地图外的身体段
            }

            const x = segment.x * CELL_SIZE;
            const y = segment.y * CELL_SIZE;

            // 敌人蛇固定大小，不受玩家蛇缩放影响
            const baseSize = CELL_SIZE - 4;
            const scaledSize = baseSize; // 固定大小，不缩放
            const offset = (CELL_SIZE - scaledSize) / 2;
            const bodyBaseSize = CELL_SIZE - 6;
            const bodyScaledSize = bodyBaseSize; // 固定大小，不缩放
            const bodyOffset = (CELL_SIZE - bodyScaledSize) / 2;

            if (index === 0) {
              // 头部：使用敌人蛇的颜色，带眼睛
              ctx.fillStyle = enemy.color;
              ctx.fillRect(x + offset, y + offset, scaledSize, scaledSize);
              ctx.fillStyle = "#ffffff";
              // 按实际缩放比例计算眼睛（基��基础尺寸20px）
              const actualScale = scaledSize / 20;
              const eyeSize = 4 * actualScale;
              const leftEyeOffset = 6 * actualScale;
              const rightEyeOffset = 14 * actualScale;
              ctx.fillRect(
                x + offset + leftEyeOffset,
                y + offset + leftEyeOffset,
                eyeSize,
                eyeSize,
              );
              ctx.fillRect(
                x + offset + rightEyeOffset,
                y + offset + leftEyeOffset,
                eyeSize,
                eyeSize,
              );
            } else {
              // 身体：稍暗的颜色
              const bodyColor = enemy.color + "99"; // 添加透明度
              ctx.fillStyle = bodyColor;
              ctx.fillRect(
                x + bodyOffset,
                y + bodyOffset,
                bodyScaledSize,
                bodyScaledSize,
              );
            }
          });
        }
      });
    }

    ctx.restore();
  }, [
    gameState,
    snake,
    food,
    foodColor,
    currentLevel,
    levelAssets,
    mapScale,
    shadowSnake,
    enemySnakes,
    backgroundIndex,
    segmentHealth,
    segmentMaxHealth,
    snakeScale,
    snakeSpacingFactor,
    speedFoodPixelPos,
    balls,
    direction,
  ]);

  // 关卡7的球绘制现在在主绘制循环中处理（见drawCanvas）

  // 游戏循环
  useEffect(() => {
    if (gameState !== "playing" || gameOver || isPaused) return;

    const config = getLevelConfig(currentLevel);
    const gridSize =
      config?.mode === "growing" ? GRID_SIZE * mapScale : GRID_SIZE;

    const gameLoop = setInterval(
      () => {
        setSnake((prevSnake) => {
          if (!prevSnake || prevSnake.length === 0 || !prevSnake[0]) {
            return prevSnake;
          }

          const head = prevSnake[0];
          let newHead = {
            x: head.x + directionRef.current.x,
            y: head.y + directionRef.current.y,
          };

          // 穿墙
          if (newHead.x < 0) newHead.x = gridSize - 1;
          else if (newHead.x >= gridSize) newHead.x = 0;
          if (newHead.y < 0) newHead.y = gridSize - 1;
          else if (newHead.y >= gridSize) newHead.y = 0;

          // 自身碰撞（第8关除外）
          if (config?.mode !== "escape") {
            if (
              prevSnake.some(
                (segment) => segment.x === newHead.x && segment.y === newHead.y,
              )
            ) {
              setGameOver(true);
              return prevSnake;
            }
          }

          const newSnake = [newHead, ...prevSnake];

          // 关卡2：检查是否在影子蛇走过的路径上
          if (config?.mode === "shadow") {
            const posKey = `${newHead.x},${newHead.y}`;
            if (!shadowPath.includes(posKey)) {
              // 偏离路径，惩罚：减少一格，并复位
              if (newSnake.length > 1) {
                // 复位到初始位置（1格）
                const resetSnake: Position[] = [{ x: 10, y: 10 }];
                setSnake(resetSnake);

                // 复位影子蛇：6节，尾巴距离主角头部3格
                const resetShadow: Position[] = [
                  { x: 18, y: 10 },
                  { x: 17, y: 10 },
                  { x: 16, y: 10 },
                  { x: 15, y: 10 },
                  { x: 14, y: 10 },
                  { x: 13, y: 10 },
                ];
                setShadowSnake(resetShadow);
                setDirection(INITIAL_DIRECTION);
                directionRef.current = INITIAL_DIRECTION;
                setShadowDirection(INITIAL_DIRECTION);
                shadowDirectionRef.current = INITIAL_DIRECTION;
                setShadowPath([
                  "10,10",
                  "11,10",
                  "12,10",
                  "13,10",
                  "14,10",
                  "15,10",
                  "16,10",
                  "17,10",
                  "18,10",
                ]);

                return resetSnake;
              }
            }
          }

          // 关卡8：碰撞检测在敌人蛇移动时处理

          // 吃食物逻辑
          if (config?.mode === "shadow") {
            // 关卡2：正常吃食物，跟着影子蛇走
            if (newHead.x === food.x && newHead.y === food.y) {
              setScore((prev) => prev + 10);
              setFood(generateFood(newSnake));
              // 不减少长度，保持增长
            } else {
              newSnake.pop();
            }
          } else if (config?.mode === "traffic") {
            // 关卡3：红绿灯
            if (newHead.x === food.x && newHead.y === food.y) {
              if (foodColor === "green") {
                setScore((prev) => prev + 10);
                setFood(generateFood(newSnake));
                // 加速红绿灯变化，每次减少200ms，最快300ms
                setTrafficSpeed((prev) => Math.max(300, prev - 200));
              } else {
                // 吃红灯，长度减到1
                return [newHead];
              }
            } else {
              newSnake.pop();
            }
          } else if (config?.mode === "blink") {
            // 关卡7：闪烁迷阵 - 检查是否吃到任何球（只有已出现的球才能被吃）
            const currentBalls = ballsRef.current;
            const currentTime = Date.now();
            const hitBallIndex = currentBalls.findIndex(
              (ball) =>
                ball.x === newHead.x &&
                ball.y === newHead.y &&
                currentTime >= ball.spawnTime,
            );

            if (hitBallIndex !== -1) {
              setScore((prev) => prev + 10);
              setTotalBallsHit((prev) => prev + 1);

              // 移除被吃掉的球，并增加一个新球
              setBalls((prevBalls) => {
                const newBalls = prevBalls.filter(
                  (_, index) => index !== hitBallIndex,
                );
                const additionalBall = generateBalls(1, newSnake, newBalls);
                return [...newBalls, ...additionalBall];
              });

              setBallCount((prev) => prev + 1);
            }

            newSnake.pop(); // 不变长
          } else if (config?.mode === "escape") {
            // 关卡8：不吃食物，保持当前长度（碰撞会减少长度）
            newSnake.pop();
          } else if (newHead.x === food.x && newHead.y === food.y) {
            // 其他关卡正常吃食物
            setScore((prev) => prev + 10);

            if (config?.mode === "speed") {
              // 关卡6：吃到球后加快位置切换，并设置新目标触发平滑移动
              const newFood = generateFood(newSnake);
              setFood(newFood);
              setSpeedFoodTarget(newFood);
              setSpeedFoodMoveStartTime(Date.now());
              setSpeedFoodBlinkSpeed((prev) => Math.max(40, prev - 40));
            } else {
              setFood(generateFood(newSnake));
            }

            if (config?.mode === "growing") {
              setMapScale((prev) => Math.min(prev * 2, 20));
              // 切换到下一张背景（最多7张）
              setBackgroundIndex((prev) => Math.min(prev + 1, 6));
            }

            if (config?.mode === "drunk") {
              setChaosFood((prev) => {
                const newCount = prev + 1;
                if (newCount <= 3) {
                  shuffleKeys();
                } else if (newCount === 4) {
                  setKeyMapping({
                    up: ["arrowup", "o"],
                    down: ["arrowdown", "f"],
                    left: ["arrowleft", "z"],
                    right: ["arrowright", "m"],
                  });
                }
                return newCount;
              });
            }
          } else {
            newSnake.pop();
          }

          return newSnake;
        });
      },
      config?.mode === "shadow" ? GAME_SPEED * 2 : GAME_SPEED,
    ); // 关卡2慢速

    return () => clearInterval(gameLoop);
  }, [
    gameState,
    gameOver,
    isPaused,
    food,
    foodColor,
    generateFood,
    currentLevel,
    mapScale,
    shuffleKeys,
    enemySnakes,
    shadowPath,
  ]);

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== "playing" || gameOver) return;

      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      const newDirection = { ...directionRef.current };
      const key = e.key.toLowerCase();

      if (keyMapping.up.includes(key) && directionRef.current.y === 0) {
        newDirection.x = 0;
        newDirection.y = -1;
      } else if (
        keyMapping.down.includes(key) &&
        directionRef.current.y === 0
      ) {
        newDirection.x = 0;
        newDirection.y = 1;
      } else if (
        keyMapping.left.includes(key) &&
        directionRef.current.x === 0
      ) {
        newDirection.x = -1;
        newDirection.y = 0;
      } else if (
        keyMapping.right.includes(key) &&
        directionRef.current.x === 0
      ) {
        newDirection.x = 1;
        newDirection.y = 0;
      }

      directionRef.current = newDirection;
      setDirection(newDirection);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, gameOver, keyMapping]);

  // 开始游戏
  const startLevel = (levelId: number) => {
    setCurrentLevel(levelId);
    setFood({ x: 15, y: 15 });
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setGameOver(false);
    setScore(0);
    setTotalBallsHit(0);
    setMapScale(1);
    setBackgroundIndex(0); // 重置背景索引
    setChaosFood(0);
    setKeyMapping({
      up: ["arrowup", "w"],
      down: ["arrowdown", "s"],
      left: ["arrowleft", "a"],
      right: ["arrowright", "d"],
    });
    setIsPaused(false);
    setShadowSnake([]);
    setShadowDirection(INITIAL_DIRECTION);
    shadowDirectionRef.current = INITIAL_DIRECTION;
    setShadowPath([]);
    setFoodColor("red");
    setTrafficSpeed(2000); // 重置关卡3红绿灯速度
    setSpeedFoodBlinkSpeed(200); // 重置关卡6位置切换速度：200ms（一秒5次）
    setSpeedFoodPixelPos(null); // 重置关卡6球像素位置
    setSpeedFoodTarget(null); // 重置关卡6球目标位置
    setSpeedFoodMoveStartTime(0); // 重置关卡6移动开始时间
    speedFoodPixelRef.current = null; // 重置ref
    setBalls([]); // 重置关卡7球数组
    setNextBallId(0);
    setBallCount(5); // 重置关卡7球数量
    ballOpacityPhaseRef.current = 0; // 重置透明度相位

    // 针对第七关和第八关：先停止游戏，清理状态，然后重新开始
    const wasLevel7 = currentLevel === 7;
    const isLevel7 = levelId === 7;
    const wasLevel8 = currentLevel === 8;
    const isLevel8 = levelId === 8;

    setEnemySnakes([]);
    setNextEnemyId(0);
    setSurvivalTime(0);
    setSegmentHealth([]); // 重置血量数组

    if (wasLevel7 || isLevel7 || wasLevel8 || isLevel8) {
      // 如果涉及第七关或第八关，先设置为menu确保定时器和动画清理
      setGameState("menu");
      setTimeout(() => {
        setGameState("playing");
      }, 50);
    } else {
      setGameState("playing");
    }
    // 注意：蛇的初始化在 useEffect 中根��关卡模式处理
  };

  // 处理素材上传
  const handleAssetUpload = (
    levelId: number,
    assetType: keyof LevelAssets,
    file: File,
  ) => {
    const fileType = file.type;
    let mediaType: "image" | "video" | "gif" = "image";

    if (fileType.startsWith("video/")) {
      mediaType = "video";
    } else if (fileType === "image/gif") {
      mediaType = "gif";
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const base64SizeMB = fileSizeMB * 1.37; // base64会增大约37%
    console.log(
      `上传素材 - 关卡${levelId}, 类型:${assetType}, 文件:${file.name}, 媒体类型:${mediaType}, 大小:${fileSizeMB.toFixed(2)}MB (base64后约${base64SizeMB.toFixed(2)}MB)`,
    );

    // 判断是否使用临时模式（大文件不保存到localStorage���
    const useTemporary = base64SizeMB > 100; // 大于100MB使用临时模式

    if (useTemporary) {
      const confirmMsg =
        `📦 文件较大 (${fileSizeMB.toFixed(2)}MB)\n\n` +
        `为避免超出浏览器存储限制，此文件将使用"临时模式"：\n` +
        `✅ 立即可用\n` +
        `⚠️ 刷新页面后需要重新上传\n\n` +
        `建议：压缩文件至100MB以下可实现永久保存。\n\n` +
        `是否继续上传？`;

      if (!confirm(confirmMsg)) {
        return;
      }
      console.log(`⚠️ 使用临时模式（不保存到localStorage）`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      console.log(
        `文件读取完成 - Data URL长度: ${(src.length / 1024).toFixed(2)}KB, 临时模式: ${useTemporary}`,
      );

      if (mediaType === "video") {
        const video = document.createElement("video");
        video.src = src;
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.load(); // 立即加载
        video.addEventListener("loadeddata", () => {
          console.log(`视频上传成功并已加载 - 关卡${levelId}`);
          video.play().catch((err) => console.log("上传视频播放失败:", err));
        });
        video.addEventListener("error", (e) => {
          console.error(`视频上传失败 - 关卡${levelId}`, e);
        });

        const videoAsset = {
          type: "video" as const,
          src,
          element: video,
          temporary: useTemporary,
        };
        setLevelAssets((prev) => {
          const newBg =
            assetType === "backgrounds"
              ? [...(prev[levelId]?.backgrounds || []).slice(0, 6), videoAsset]
              : videoAsset;
          const newThumbnail =
            assetType === "backgrounds"
              ? Array.isArray(newBg) && newBg.length > 0
                ? newBg[0]
                : (prev[levelId]?.thumbnail ?? null)
              : videoAsset;
          return {
            ...prev,
            [levelId]: {
              ...(prev[levelId] || {
                background: null,
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
              }),
              [assetType]: newBg,
              thumbnail: newThumbnail,
            },
          };
        });
      } else {
        const img = new Image();
        img.onload = () => {
          const imgAsset = {
            type: mediaType,
            src,
            element: img,
            temporary: useTemporary,
          };
          setLevelAssets((prev) => {
            const newBg =
              assetType === "backgrounds"
                ? [...(prev[levelId]?.backgrounds || []).slice(0, 6), imgAsset]
                : imgAsset;
            const newThumbnail =
              assetType === "backgrounds"
                ? Array.isArray(newBg) && newBg.length > 0
                  ? newBg[0]
                  : (prev[levelId]?.thumbnail ?? null)
                : imgAsset;
            return {
              ...prev,
              [levelId]: {
                ...(prev[levelId] || {
                  background: null,
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
                }),
                [assetType]: newBg,
                thumbnail: newThumbnail,
              },
            };
          });
        };
        configureImageForUrl(img, src);
      }
    };
    reader.readAsDataURL(file);
  };

  // 渲染逻辑
  const renderContent = () => {
    if (gameState === "menu") {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
          {/* 背景图片：预留空间避免加载时闪烁 */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[#1a1a2e]"
            style={{
              backgroundImage: coverImage ? `url(${coverImage})` : undefined,
              filter: "blur(8px)",
              transform: "scale(1.1)",
            }}
          />
          {/* 暗色遮罩 */}
          <div className="absolute inset-0 bg-black/40" />

          <div className="bg-[#c0c0c0] win95-outset p-1 w-[700px] relative z-10">
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 mb-1">
              <span className="text-white text-sm font-bold">
                🐍 贪吃蛇游戏
              </span>
            </div>

            <div className="bg-[#c0c0c0] p-8 flex flex-col items-center gap-6">
              {/* 封面图片：固定宽高比，未加载时占位避免闪烁 */}
              <div className="w-full win95-inset p-1 bg-white aspect-[4/3] min-h-[240px] overflow-hidden flex items-center justify-center">
                <img
                  src={coverImage}
                  alt="游戏封面"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => setGameState("levelSelect")}
                  className="w-full px-8 py-4 win95-button bg-[#c0c0c0] text-lg font-bold hover:bg-[#dfdfdf]"
                >
                  <Play className="inline-block w-5 h-5 mr-2" />
                  开始游戏
                </button>

                <button
                  onClick={() => setGameState("settings")}
                  className="w-full px-8 py-4 win95-button bg-[#c0c0c0] text-lg font-bold hover:bg-[#dfdfdf]"
                >
                  <Upload className="inline-block w-5 h-5 mr-2" />
                  素材设置
                </button>
              </div>

              <div className="text-xs text-gray-600 text-center">
                使用方向键或WASD进行游戏
                <br />
                按空格键暂停
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (gameState === "levelSelect") {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
          {/* 背景图片：预留底色避免加载时闪烁 */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[#1a1a2e]"
            style={{
              backgroundImage: coverImage ? `url(${coverImage})` : undefined,
              filter: "blur(8px)",
              transform: "scale(1.1)",
            }}
          />
          {/* 暗色遮罩 */}
          <div className="absolute inset-0 bg-black/40" />

          <div className="bg-[#c0c0c0] win95-outset p-1 w-[95vw] max-w-[1400px] relative z-10">
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
              <span className="text-white text-sm font-bold">关卡选择</span>
              <button
                onClick={() => setGameState("menu")}
                className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
              >
                ×
              </button>
            </div>

            <div className="bg-[#c0c0c0] p-4">
              {/* 横向排列9个按钮：缩略图固定 1:1 占位，未加载时避免闪烁 */}
              <div className="grid grid-cols-9 gap-3">
                {/* 第一个：从第一关开始 - 使用关卡1的缩略图 */}
                <button
                  onClick={() => startLevel(1)}
                  className="win95-button bg-[#c0c0c0] p-3 hover:bg-[#dfdfdf] flex flex-col items-center gap-2 min-w-0"
                >
                  <div className="w-full aspect-square min-h-[64px] win95-inset bg-white flex items-center justify-center overflow-hidden relative">
                    <LevelThumbnailImage
                      src={getLevelAssets(1).thumbnail?.src ?? ""}
                      className="w-full h-full object-cover"
                    />
                    {/* 播放图标覆盖层 */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {/* 纯三角形播放图标 */}
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
                    <div className="font-bold">从第一关</div>
                    <div className="text-[10px] text-gray-600">开始游戏</div>
                  </div>
                </button>

                {/* 关卡1-8 */}
                {LEVEL_CONFIGS.map((config) => {
                  const assets = getLevelAssets(config.id);

                  return (
                    <button
                      key={config.id}
                      onClick={() => startLevel(config.id)}
                      className="win95-button bg-[#c0c0c0] p-3 hover:bg-[#dfdfdf] flex flex-col items-center gap-2 min-w-0"
                    >
                      <div className="w-full aspect-square min-h-[64px] win95-inset bg-white flex items-center justify-center overflow-hidden">
                        <LevelThumbnailImage
                          src={assets.thumbnail?.src ?? ""}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-center">
                        <div className="font-bold">关卡 {config.id}</div>
                        <div className="text-[10px] text-gray-600 line-clamp-2">
                          {config.mode}
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

    if (gameState === "settings") {
      const assets = getLevelAssets(selectedLevel);

      return (
        <div className="min-h-screen bg-[#008080] flex items-center justify-center p-4">
          <div className="bg-[#c0c0c0] win95-outset p-1 w-[800px] max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
              <span className="text-white text-sm font-bold">素材设置</span>
              <button
                onClick={() => setGameState("menu")}
                className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
              >
                ×
              </button>
            </div>

            <div className="bg-[#c0c0c0] p-4">
              <div className="mb-4">
                <label className="text-xs font-bold mb-2 block">
                  选择关卡：
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
                          "确定要重置当前关卡的所有素材为默认设置吗？这将清除您上传的自定义素材。",
                        )
                      ) {
                        // 重置当前关卡的素材为默认
                        const config =
                          DEFAULT_ASSETS_CONFIG[
                            selectedLevel as keyof typeof DEFAULT_ASSETS_CONFIG
                          ];
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
                            const img = new Image();
                            configureImageForUrl(img, config.thumbnail);
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
                                const img = new Image();
                                configureImageForUrl(img, url);
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
                            const img = new Image();
                            configureImageForUrl(img, url);
                            newAssets.background = {
                              type: "image",
                              src: url,
                              element: img,
                            };
                          }

                          if (config.fullSnakeTexture) {
                            const snakeImg = new Image();
                            configureImageForUrl(
                              snakeImg,
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
                    🔄 重置默认
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    关卡缩略图
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
                      ? "游戏背景（多张，最多7张）"
                      : "游戏背景（图片/GIF/视频）"}
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
                          // 关卡4：支持多张背景
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
                        已上传 {assets.backgrounds.length} 张
                        {assets.backgrounds.some((bg) => bg.temporary) && (
                          <span
                            className="text-orange-600 ml-1"
                            title="刷新后需重新上传"
                          >
                            ⚠️临时
                          </span>
                        )}
                      </div>
                    ) : assets.background ? (
                      <div className="win95-inset bg-white px-2 py-1 text-xs flex items-center gap-1">
                        <span>
                          {assets.background.type === "video"
                            ? "🎥 视频"
                            : assets.background.type === "gif"
                              ? "🎞️ GIF"
                              : "🖼️ 图片"}
                        </span>
                        {assets.background.temporary && (
                          <span
                            className="text-orange-600"
                            title="刷新后需��新上传"
                          >
                            ⚠️临时
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎨 全蛇贴图（可选）
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    一张贴图覆盖整条蛇（头身尾统一样式），会自动根据移动方向旋转。启用后���忽略下方的单独设置。
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
                            ? "🎥 视频"
                            : assets.fullSnakeTexture.type === "gif"
                              ? "🎞️ GIF"
                              : "🖼️ 图片"}
                        </span>
                        <span className="text-green-600">✓ 已启用</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    蛇头（图片/GIF/视频）
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
                          ? "🎥 视频"
                          : assets.snakeHead.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ 图片"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 蛇头方向贴图（可选）
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    为不同移动方向设置专属贴图，未设置则使用默认蛇头
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ 向上
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ 向下
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ 向左
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ 向右
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    蛇身（图片/GIF/视频）
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
                          ? "🎥 视频"
                          : assets.snakeBody.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ 图片"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 蛇身方向贴图（可选）
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    为不同移动方向设置专属贴图，未设置则使用默认蛇身
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ 向上
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ 向下
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
                          ✓ 已设���
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ 向左
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ 向右
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    蛇尾（图片/GIF/视频）
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
                          ? "🎥 视频"
                          : assets.snakeTail.type === "gif"
                            ? "🎞️ GIF"
                            : "🖼️ 图片"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    🎯 蛇尾方向贴图（可选）
                  </label>
                  <div className="text-[10px] text-gray-600 mb-2">
                    为不同移动方向设置专属贴图，未��置则使用默认蛇尾
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 向上 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬆️ 向上
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向下 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬇️ 向下
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向左 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ⬅️ 向左
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>

                    {/* 向右 */}
                    <div className="win95-inset bg-white p-2">
                      <label className="text-[10px] font-bold mb-1 block">
                        ➡️ 向右
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
                          ✓ 已设置
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 游戏参数设置 */}
              <div className="mt-4 space-y-3">
                {/* 全局参数 */}
                <div className="text-xs font-bold mb-2">🎨 全局参数设置</div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    蛇的大小
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
                    调整蛇的显示大小（1倍=20px，5倍=100px，最大限制72px）
                    <br />
                    ⚙️ 设置仅对当前关卡有效
                  </div>
                </div>

                <div className="win95-outset bg-[#c0c0c0] p-3">
                  <label className="text-xs font-bold mb-2 block">
                    蛇节间距
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
                    调整蛇各节之间的间距（0=紧密，2=松散）
                    <br />
                    ⚙️ 设置仅对当前关卡有效
                  </div>
                </div>

                {/* 关卡8参数 */}
                {selectedLevel === 8 && (
                  <>
                    <div className="text-xs font-bold mb-2 mt-4">
                      🎮 游戏参数设置（关卡8专用）
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        玩家蛇初始长度
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
                        <span className="text-xs">格（推荐：8格）</span>
                      </div>
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        敌人蛇生成间隔
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
                        <span className="text-xs">毫秒（1秒 = 1000毫秒）</span>
                      </div>
                    </div>

                    <div className="win95-outset bg-[#c0c0c0] p-3">
                      <label className="text-xs font-bold mb-2 block">
                        蛇身血量
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
                          HP（每格被攻击此次数后消失）
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-[10px] text-gray-600 win95-inset bg-white p-2 space-y-1">
                  <div>
                    💡 <strong>支持格式：</strong>
                    图片（JPG/PNG）、GIF动画、MP4视频
                  </div>
                  <div>
                    📦 <strong>文件大小：</strong>
                  </div>
                  <div className="ml-4">
                    • 小文件（&lt;100MB）：永久保存，刷新后仍然有效 ✅
                  </div>
                  <div className="ml-4">
                    • 大文件（≥100MB）：临时模式，刷新后需重新上传 ⚠️
                  </div>
                  <div>
                    💾 <strong>智能保存：</strong>
                    系统自动判断文件大小选择最佳存储方式
                  </div>
                  <div>
                    🎯 <strong>建议：</strong>压缩文件至100MB以下可实现永久保存
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm("确定要重置所有游戏参数为默认值吗？")) {
                        setPlayerInitialLength(8);
                        setEnemySpawnInterval(1000);
                        setSegmentMaxHealth(1);
                        setInitialBallBlinkSpeed(500);
                        setTotalBallsHit(0);
                        // 重置当前关卡的蛇大小和间距
                        setSnakeScaleByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: 1 };
                          localStorage.setItem(
                            "snakeGameSnakeScaleByLevel",
                            JSON.stringify(updated),
                          );
                          return updated;
                        });
                        setSnakeSpacingFactorByLevel((prev) => {
                          const updated = { ...prev, [currentLevel]: 0 };
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
                    🔄 重置游戏参数
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "确定要清除所有自定义素材并恢复默认素材吗？此操作不可撤销！",
                        )
                      ) {
                        localStorage.removeItem("snakeGameCustomAssets");
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 win95-button bg-[#c0c0c0] text-xs"
                  >
                    ⚠️ 重置所有素材
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const currentBg = getCurrentBackground();
    const hasBackground = currentBg !== null;
    const isVideoBg = currentBg?.type === "video";

    return (
      <div className="min-h-screen bg-[#008080] flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景层 */}
        {currentBg && (
          <>
            {isVideoBg && currentBg.element ? (
              <video
                key={currentBg.src}
                src={currentBg.src}
                autoPlay
                loop
                muted
                playsInline
                className="fixed inset-0 w-full h-full object-cover transition-opacity duration-500"
                style={{ objectFit: "cover", zIndex: 0 }}
              />
            ) : currentBg.src ? (
              <div
                className="fixed inset-0 w-full h-full transition-opacity duration-500"
                style={{
                  backgroundImage: `url(${currentBg.src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  zIndex: 0,
                }}
              />
            ) : null}
          </>
        )}

        {/* UI窗口 */}
        <div
          className="bg-[#c0c0c0] win95-outset p-1 max-w-3xl w-full relative"
          style={{
            boxShadow: hasBackground ? "0 10px 40px rgba(0,0,0,0.5)" : "",
            zIndex: 10,
          }}
        >
          <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between mb-1">
            <span className="text-white text-sm font-bold">
              🐍 {getLevelConfig(currentLevel)?.name}
            </span>
            <button
              onClick={() => setGameState("menu")}
              className="w-4 h-4 bg-[#c0c0c0] win95-button text-[8px]"
            >
              ×
            </button>
          </div>

          <div className="bg-[#c0c0c0] p-2">
            <div className="bg-[#c0c0c0] border-b border-white mb-2 pb-1">
              <div className="flex gap-4 px-1">
                <button
                  onClick={() => setGameState("menu")}
                  className="text-sm hover:bg-[#000080] hover:text-white px-2 py-0.5"
                >
                  返回
                </button>
                <button
                  onClick={() => startLevel(currentLevel)}
                  className="text-sm hover:bg-[#000080] hover:text-white px-2 py-0.5"
                >
                  重新开始
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <div className="win95-inset px-3 py-1 bg-white">
                  <span className="text-sm font-mono">分数: {score}</span>
                </div>
                <div className="win95-inset px-3 py-1 bg-white">
                  <span className="text-sm font-mono">
                    长度: {snake.length}
                  </span>
                </div>
                {getLevelConfig(currentLevel)?.mode === "blink" && (
                  <>
                    <div className="win95-inset px-3 py-1 bg-white">
                      <span className="text-sm font-mono">
                        地图上: {balls.length}
                      </span>
                    </div>
                    <div className="win95-inset px-3 py-1 bg-white">
                      <span className="text-sm font-mono">
                        已击中: {totalBallsHit}
                      </span>
                    </div>
                  </>
                )}
                {getLevelConfig(currentLevel)?.mode === "escape" && (
                  <>
                    <div className="win95-inset px-3 py-1 bg-white">
                      <span className="text-sm font-mono">
                        生存: {survivalTime}秒
                      </span>
                    </div>
                    <div className="win95-inset px-3 py-1 bg-white">
                      <span className="text-sm font-mono">
                        尾巴血量:{" "}
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
                    <span className="text-sm">⏸ 已暂停</span>
                  </div>
                )}
              </div>
            </div>

            <div
              className="mx-auto win95-inset bg-[#c0c0c0] mb-2"
              style={{
                width: GRID_SIZE * CELL_SIZE + 4,
                height: GRID_SIZE * CELL_SIZE + 4,
                padding: "2px",
              }}
            >
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={GRID_SIZE * CELL_SIZE}
                  height={GRID_SIZE * CELL_SIZE}
                />

                {gameOver && (
                  <div className="absolute inset-0 bg-[#c0c0c0]/95 flex items-center justify-center">
                    <div className="text-center bg-[#c0c0c0] win95-outset p-6">
                      <div className="text-4xl mb-2">💀</div>
                      <div className="font-bold mb-2">游戏结束！</div>
                      <div className="text-sm mb-4">最终分数: {score}</div>
                      <button
                        onClick={() => startLevel(currentLevel)}
                        className="px-6 py-2 win95-button bg-[#c0c0c0] text-sm"
                      >
                        再玩一次
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="win95-outset bg-[#c0c0c0] p-2">
              <div className="text-xs font-bold mb-2">游戏控制</div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="win95-inset bg-white px-2 py-1">
                  ↑ / {keyMapping.up[1]?.toUpperCase()} - 向上
                </div>
                <div className="win95-inset bg-white px-2 py-1">
                  ↓ / {keyMapping.down[1]?.toUpperCase()} - 向下
                </div>
                <div className="win95-inset bg-white px-2 py-1">
                  ← / {keyMapping.left[1]?.toUpperCase()} - 向左
                </div>
                <div className="win95-inset bg-white px-2 py-1">
                  → / {keyMapping.right[1]?.toUpperCase()} - 向���
                </div>
              </div>
              <div className="win95-inset bg-white px-2 py-1 text-[11px] mt-1">
                空格键 - 暂停
              </div>
            </div>

            <div className="win95-inset bg-[#c0c0c0] mt-2 px-2 py-1 flex justify-between text-[11px]">
              <span>就绪</span>
              <span>{getLevelConfig(currentLevel)?.desc}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <audio ref={bgmRef} />
      {renderContent()}
    </>
  );
}
