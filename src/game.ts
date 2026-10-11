import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  BINDINGS,
  BEST_LABEL,
  BITE_SECONDS,
  BOARD_X,
  BOARD_Y,
  CELL,
  CLEARED_TEXT,
  COIL_DEBUG_VERSION,
  COMBO_MAX,
  COMBO_WINDOW,
  CUES,
  CUE_PATHS,
  DIRECTIONS,
  GAMEOVER_TEXT,
  GRID_COLS,
  GRID_ROWS,
  HEAD_FRAMES,
  INTERIOR_MAX_COL,
  INTERIOR_MAX_ROW,
  INTERIOR_MIN_COL,
  INTERIOR_MIN_ROW,
  MODE,
  MODE_LABEL,
  OBSTACLE_CELLS,
  OVER_ITEMS,
  PAUSE_ITEMS,
  PELLET_POINTS,
  SCORE_LABEL,
  SCREENS,
  SPRITE_PATHS,
  STAGE_CX,
  STAGE_H,
  STAGE_W,
  START_CELLS,
  START_DIR,
  TAGLINE_TEXT,
  TICK_SECONDS,
  TITLE_ITEMS,
  TITLE_TEXT,
  TURN_QUEUE_MAX,
} from "./constants";
import type { Cell, Direction, Screen } from "./constants";

export const BACKGROUND = "#070d1b";

type Rect = { x: number; y: number; w: number; h: number };
type Switches = { steering: boolean; travel: boolean; pelletRespawn: boolean };
export interface CoilState extends Switches {
  screen: Screen;
  menuIndex: number;
  titleIndex: number;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: Direction;
  turns: Direction[];
  snake: Cell[];
  pellet: Cell | null;
  obstacles: Cell[];
  nextPellet: Cell | null;
  accumulator: number;
  bite: number;
  pointerDownItem: number | null;
}
type RState = DeepReadonly<CoilState>;
export interface CoilDebugApi {
  version: number;
  reset(s: RState): CoilState;
  reconcile(s: RState): CoilState;
  snapshot(s: RState): Omit<
    CoilState,
    "accumulator" | "bite" | "pointerDownItem"
  > & {
    version: number;
    mode: typeof MODE;
  };
  menuItemRect(s: RState, index: number): Rect | null;
  setScreen(s: RState, screen: Screen): CoilState;
  setMenuIndex(s: RState, index: number): CoilState;
  setScore(s: RState, points: number): CoilState;
  setBest(s: RState, points: number): CoilState;
  setCombo(s: RState, multiplier: number): CoilState;
  setComboWindow(s: RState, seconds: number): CoilState;
  setSnake(s: RState, cells: readonly Cell[]): CoilState;
  setDirection(s: RState, dir: Direction): CoilState;
  clearTurns(s: RState): CoilState;
  setSnakeSteering(s: RState, enabled: boolean): CoilState;
  setSnakeTravel(s: RState, enabled: boolean): CoilState;
  setPellet(s: RState, col: number, row: number): CoilState;
  clearPellet(s: RState): CoilState;
  setPelletRespawn(s: RState, enabled: boolean): CoilState;
  setNextPellet(s: RState, col: number, row: number): CoilState;
  drawPelletCell(s: RState): Cell | null;
}
const copy = (s: RState): CoilState => ({
  ...s,
  turns: [...s.turns],
  snake: s.snake.map((c) => ({ ...c })),
  obstacles: s.obstacles.map((c) => ({ ...c })),
  pellet: s.pellet && { ...s.pellet },
  nextPellet: s.nextPellet && { ...s.nextPellet },
});
const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;
const interior = (c: Cell): boolean =>
  c.col >= INTERIOR_MIN_COL &&
  c.col <= INTERIOR_MAX_COL &&
  c.row >= INTERIOR_MIN_ROW &&
  c.row <= INTERIOR_MAX_ROW;
const gridCell = (c: Cell): boolean =>
  Number.isInteger(c.col) &&
  Number.isInteger(c.row) &&
  c.col >= 0 &&
  c.col < GRID_COLS &&
  c.row >= 0 &&
  c.row < GRID_ROWS;
const assert = (good: boolean, message: string): void => {
  if (!good) throw new RangeError(message);
};
const whole = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;
const validCells = (s: RState): Cell[] => {
  const out: Cell[] = [];
  for (let row = INTERIOR_MIN_ROW; row <= INTERIOR_MAX_ROW; row++)
    for (let col = INTERIOR_MIN_COL; col <= INTERIOR_MAX_COL; col++) {
      const c = { col, row };
      if (
        !s.snake.some((q) => same(q, c)) &&
        !s.obstacles.some((q) => same(q, c)) &&
        !(s.pellet && same(s.pellet, c))
      )
        out.push(c);
    }
  return out;
};
const drawPelletCell = (s: RState): Cell | null => {
  const cells = validCells(s);
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
};
const spawn = (s: CoilState): Cell | null => {
  const cells = validCells(s);
  const posed = s.nextPellet;
  s.nextPellet = null;
  return cells.length
    ? posed && cells.some((c) => same(c, posed))
      ? posed
      : cells[Math.floor(Math.random() * cells.length)]
    : null;
};
const opening = (muted: boolean): CoilState => ({
  screen: "title",
  menuIndex: 0,
  titleIndex: 0,
  score: 0,
  best: 0,
  combo: 1,
  comboWindow: 0,
  muted,
  ticks: 0,
  simTime: 0,
  dir: START_DIR,
  turns: [],
  snake: START_CELLS.map((c) => ({ ...c })),
  pellet: null,
  obstacles: OBSTACLE_CELLS.map((c) => ({ ...c })),
  steering: true,
  travel: true,
  pelletRespawn: true,
  nextPellet: null,
  accumulator: 0,
  bite: 0,
  pointerDownItem: null,
});
const menuItems = (screen: Screen): readonly string[] =>
  screen === "title"
    ? TITLE_ITEMS
    : screen === "paused"
      ? PAUSE_ITEMS
      : screen === "gameover" || screen === "cleared"
        ? OVER_ITEMS
        : screen === "howto"
          ? ["BACK"]
          : [];
const menuItemRect = (s: RState, i: number): Rect | null => {
  assert(whole(i), "invalid menu index");
  const items = menuItems(s.screen);
  if (i >= items.length) return null;
  const top =
    s.screen === "title"
      ? 430
      : s.screen === "howto"
        ? 600
        : s.screen === "paused"
          ? 365
          : 494;
  return { x: STAGE_CX - 170, y: top + i * 58, w: 340, h: 48 };
};
const startRound = (s: CoilState): CoilState => {
  s.screen = "playing";
  s.menuIndex = 0;
  s.score = 0;
  s.combo = 1;
  s.comboWindow = 0;
  s.ticks = 0;
  s.simTime = 0;
  s.accumulator = 0;
  s.dir = START_DIR;
  s.turns = [];
  s.snake = START_CELLS.map((c) => ({ ...c }));
  s.obstacles = OBSTACLE_CELLS.map((c) => ({ ...c }));
  s.pellet = null;
  s.bite = 0;
  s.pointerDownItem = null;
  s.pellet = spawn(s);
  return s;
};
const delta: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const perpendicular = (a: Direction, b: Direction): boolean =>
  (a === "up" || a === "down") !== (b === "up" || b === "down");
function tick(s: CoilState, api: UpdateApi): void {
  s.ticks++;
  if (s.steering && s.turns.length) {
    const turn = s.turns.shift()!;
    if (perpendicular(s.dir, turn)) s.dir = turn;
  }
  if (s.travel) {
    const head = {
      col: s.snake[0].col + delta[s.dir].col,
      row: s.snake[0].row + delta[s.dir].row,
    };
    const eating = !!s.pellet && same(head, s.pellet);
    const solid = s.snake
      .slice(0, eating ? undefined : -1)
      .some((c) => same(c, head));
    if (!interior(head) || s.obstacles.some((c) => same(c, head)) || solid) {
      s.screen = "gameover";
      s.menuIndex = 0;
      s.accumulator = 0;
      api.audio.play(CUES.death);
      api.audio.stop(CUES.music);
      return;
    }
    s.snake = [head, ...s.snake.slice(0, eating ? undefined : -1)];
    if (eating) {
      const before = s.combo;
      s.combo = s.comboWindow > 0 ? Math.min(COMBO_MAX, s.combo + 1) : 1;
      s.score += PELLET_POINTS * s.combo;
      s.best = Math.max(s.best, s.score);
      s.comboWindow = COMBO_WINDOW;
      s.bite = BITE_SECONDS;
      s.pellet = null;
      api.audio.play(CUES.eat);
      if (s.combo > before) api.audio.play(CUES.comboUp);
      if (s.pelletRespawn) {
        s.pellet = spawn(s);
        if (!s.pellet) {
          s.screen = "cleared";
          s.menuIndex = 0;
          s.accumulator = 0;
          api.audio.stop(CUES.music);
        }
      }
    }
  }
  s.comboWindow = Math.max(0, s.comboWindow - TICK_SECONDS);
  if (s.comboWindow === 0) s.combo = 1;
}
const images: Record<string, ImageBitmap> = {};
const debug: CoilDebugApi = {
  version: COIL_DEBUG_VERSION,
  reset: (s) => opening(s.muted),
  reconcile: (s) => copy(s),
  snapshot: (s) => ({
    version: COIL_DEBUG_VERSION,
    screen: s.screen,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    mode: MODE,
    score: s.score,
    best: s.best,
    combo: s.combo,
    comboWindow: s.comboWindow,
    muted: s.muted,
    ticks: s.ticks,
    simTime: s.simTime,
    dir: s.dir,
    turns: [...s.turns],
    snake: s.snake.map((c) => ({ ...c })),
    pellet: s.pellet && { ...s.pellet },
    obstacles: s.obstacles.map((c) => ({ ...c })),
    steering: s.steering,
    travel: s.travel,
    pelletRespawn: s.pelletRespawn,
    nextPellet: s.nextPellet && { ...s.nextPellet },
  }),
  menuItemRect,
  setScreen: (s, screen) => {
    assert(SCREENS.includes(screen), "invalid screen");
    return { ...copy(s), screen };
  },
  setMenuIndex: (s, index) => {
    assert(
      whole(index) &&
        (s.screen === "playing"
          ? index === 0
          : index < menuItems(s.screen).length),
      "invalid menu index",
    );
    return { ...copy(s), menuIndex: index };
  },
  setScore: (s, points) => {
    assert(whole(points), "invalid score");
    return { ...copy(s), score: points };
  },
  setBest: (s, points) => {
    assert(whole(points), "invalid best");
    return { ...copy(s), best: points };
  },
  setCombo: (s, multiplier) => {
    assert(
      whole(multiplier) && multiplier >= 1 && multiplier <= COMBO_MAX,
      "invalid combo",
    );
    return { ...copy(s), combo: multiplier };
  },
  setComboWindow: (s, seconds) => {
    assert(
      Number.isFinite(seconds) && seconds >= 0 && seconds <= COMBO_WINDOW,
      "invalid combo window",
    );
    return { ...copy(s), comboWindow: seconds };
  },
  setSnake: (s, cells) => {
    const used = new Set<string>();
    assert(cells.length > 0, "empty snake");
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const key = `${c.col},${c.row}`;
      assert(
        gridCell(c) &&
          interior(c) &&
          !s.obstacles.some((o) => same(o, c)) &&
          !used.has(key),
        "invalid snake",
      );
      if (i)
        assert(
          Math.abs(c.col - cells[i - 1].col) +
            Math.abs(c.row - cells[i - 1].row) ===
            1,
          "disconnected snake",
        );
      used.add(key);
    }
    return { ...copy(s), snake: cells.map((c) => ({ ...c })) };
  },
  setDirection: (s, dir) => {
    assert(DIRECTIONS.includes(dir), "invalid direction");
    return { ...copy(s), dir };
  },
  clearTurns: (s) => ({ ...copy(s), turns: [] }),
  setSnakeSteering: (s, enabled) => {
    assert(typeof enabled === "boolean", "invalid steering");
    return {
      ...copy(s),
      steering: enabled,
      turns: enabled ? [...s.turns] : [],
    };
  },
  setSnakeTravel: (s, enabled) => {
    assert(typeof enabled === "boolean", "invalid travel");
    return { ...copy(s), travel: enabled };
  },
  setPellet: (s, col, row) => {
    const c = { col, row };
    assert(
      gridCell(c) &&
        interior(c) &&
        !s.snake.some((q) => same(q, c)) &&
        !s.obstacles.some((q) => same(q, c)),
      "invalid pellet",
    );
    return { ...copy(s), pellet: c };
  },
  clearPellet: (s) => ({ ...copy(s), pellet: null }),
  setPelletRespawn: (s, enabled) => {
    assert(typeof enabled === "boolean", "invalid respawn");
    return { ...copy(s), pelletRespawn: enabled };
  },
  setNextPellet: (s, col, row) => {
    const c = { col, row };
    assert(gridCell(c), "invalid next pellet");
    return { ...copy(s), nextPellet: c };
  },
  drawPelletCell,
};

function confirm(s: CoilState, api: UpdateApi): CoilState {
  const i = s.menuIndex;
  if (s.screen === "title") {
    s.titleIndex = i;
    if (i === 0) {
      startRound(s);
      api.audio.loop(CUES.music);
    } else {
      s.screen = "howto";
      s.menuIndex = 0;
    }
  } else if (s.screen === "howto") {
    s.screen = "title";
    s.menuIndex = s.titleIndex;
  } else if (s.screen === "paused") {
    if (i === 0) {
      s.screen = "playing";
      s.menuIndex = 0;
    } else if (i === 1) {
      startRound(s);
      if (!api.audio.looping(CUES.music)) api.audio.loop(CUES.music);
    } else {
      s.screen = "title";
      s.menuIndex = s.titleIndex;
      api.audio.stop(CUES.music);
    }
  } else if (s.screen === "gameover" || s.screen === "cleared") {
    if (i === 0) {
      startRound(s);
      api.audio.loop(CUES.music);
    } else {
      s.screen = "title";
      s.menuIndex = s.titleIndex;
    }
  }
  return s;
}
export const game: Game<CoilState, CoilDebugApi> = {
  async initialize(
    api: InitApi<CoilState>,
  ): Promise<[CoilState, CoilDebugApi]> {
    for (const action of ACTIONS)
      api.input.register(action, { keys: [...BINDINGS[action]] });
    await Promise.all(
      Object.entries(CUE_PATHS).map(([cue, path]) => api.audio.load(cue, path)),
    );
    const paths = [
      ...SPRITE_PATHS.head,
      SPRITE_PATHS.body,
      SPRITE_PATHS.corner,
      SPRITE_PATHS.tail,
    ];
    await Promise.all(
      paths.map(async (path) => {
        images[path] = await api.assets.loadImage(path);
      }),
    );
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("score", (s) => s.score);
    api.diagnostics.register("best", (s) => s.best);
    api.diagnostics.register(
      "combo",
      (s) => `x${s.combo} ${s.comboWindow.toFixed(2)}s`,
    );
    api.diagnostics.register("direction", (s) => s.dir);
    api.diagnostics.register("length", (s) => s.snake.length);
    api.diagnostics.register(
      "head",
      (s) => `${s.snake[0].col},${s.snake[0].row}`,
    );
    api.diagnostics.register("pellet", (s) =>
      s.pellet ? `${s.pellet.col},${s.pellet.row}` : "none",
    );
    return [opening(false), debug];
  },
  update(state: RState, api: UpdateApi, dt: number): CoilState {
    const s = copy(state);
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    s.muted = api.audio.muted();
    s.best = Math.max(s.best, s.score);
    if (s.screen === "playing") {
      if (api.input.pressed("back") || api.input.pressed("pause")) {
        s.screen = "paused";
        s.menuIndex = 0;
        return s;
      }
      for (const dir of DIRECTIONS)
        if (
          api.input.pressed(dir) &&
          s.steering &&
          s.turns.length < TURN_QUEUE_MAX
        )
          s.turns.push(dir);
      s.simTime += dt;
      s.accumulator += dt;
      s.bite = Math.max(0, s.bite - dt);
      while (s.accumulator + 1e-9 >= TICK_SECONDS && s.screen === "playing") {
        s.accumulator -= TICK_SECONDS;
        tick(s, api);
      }
      if (s.screen !== "playing") s.accumulator = 0;
      return s;
    }
    const items = menuItems(s.screen);
    if (api.input.pressed("up"))
      s.menuIndex = (s.menuIndex + items.length - 1) % items.length;
    if (api.input.pressed("down"))
      s.menuIndex = (s.menuIndex + 1) % items.length;
    if (
      (s.screen === "paused" && api.input.pressed("pause")) ||
      api.input.pressed("back")
    ) {
      if (s.screen === "paused") {
        s.screen = "playing";
        s.menuIndex = 0;
      } else if (
        s.screen === "howto" ||
        s.screen === "gameover" ||
        s.screen === "cleared"
      ) {
        s.screen = "title";
        s.menuIndex = s.titleIndex;
      }
      return s;
    }
    let accepted = api.input.pressed("confirm");
    for (const sample of api.input.pointerSamples()) {
      const index = items.findIndex((_, i) => {
        const r = menuItemRect(s, i)!;
        return (
          sample.x >= r.x &&
          sample.x < r.x + r.w &&
          sample.y >= r.y &&
          sample.y < r.y + r.h
        );
      });
      if (index >= 0) s.menuIndex = index;
      if (sample.type === "down" && sample.button === "primary")
        s.pointerDownItem = index >= 0 ? index : null;
      if (sample.type === "up" && sample.button === "primary") {
        if (index >= 0 && index === s.pointerDownItem) accepted = true;
        s.pointerDownItem = null;
      }
    }
    if (accepted) confirm(s, api);
    return s;
  },
  render(state: RState, api: RenderApi): void {
    drawScene(state, api.ctx);
  },
};

const color = {
  white: "#e8fff8",
  muted: "#78a7af",
  cyan: "#47e9e6",
  lime: "#c3ff87",
  pink: "#ff5c9e",
  field: "#081725",
  panel: "#091b2ae8",
};
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fill = color.white,
  align: CanvasTextAlign = "left",
  weight = "700",
): void {
  ctx.fillStyle = fill;
  ctx.font = `${weight} ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}
function drawSprite(
  ctx: CanvasRenderingContext2D,
  path: string,
  c: Cell,
  turn: number,
): void {
  const image = images[path];
  if (!image) return;
  const x = BOARD_X + c.col * CELL + CELL / 2,
    y = BOARD_Y + c.row * CELL + CELL / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((turn * Math.PI) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, -CELL / 2, -CELL / 2, CELL, CELL);
  ctx.restore();
}
function angle(a: Cell, b: Cell): number {
  const dx = b.col - a.col,
    dy = b.row - a.row;
  return dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
}
function drawScene(s: RState, ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  // restrained neon architecture around a solid wall ring
  ctx.fillStyle = "#06111e";
  ctx.fillRect(
    BOARD_X - 12,
    BOARD_Y - 12,
    GRID_COLS * CELL + 24,
    GRID_ROWS * CELL + 24,
  );
  ctx.shadowColor = color.cyan;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#1d8293";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    BOARD_X - 7,
    BOARD_Y - 7,
    GRID_COLS * CELL + 14,
    GRID_ROWS * CELL + 14,
  );
  ctx.shadowBlur = 0;
  for (let row = 0; row < GRID_ROWS; row++)
    for (let col = 0; col < GRID_COLS; col++) {
      const x = BOARD_X + col * CELL,
        y = BOARD_Y + row * CELL;
      const wall =
        col === 0 ||
        row === 0 ||
        col === GRID_COLS - 1 ||
        row === GRID_ROWS - 1;
      ctx.fillStyle = wall
        ? (col + row) % 2
          ? "#123a4b"
          : "#164657"
        : color.field;
      ctx.fillRect(x, y, CELL, CELL);
      if (wall) {
        ctx.strokeStyle = "#24586a";
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = "#49b9b7";
        ctx.fillRect(x + 3, y + 3, 3, 3);
      } else {
        ctx.strokeStyle = "#173141";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
      }
    }
  for (const c of s.obstacles) {
    ctx.fillStyle = color.pink;
    ctx.fillRect(
      BOARD_X + c.col * CELL + 4,
      BOARD_Y + c.row * CELL + 4,
      CELL - 8,
      CELL - 8,
    );
  }
  if (s.pellet) {
    const x = BOARD_X + (s.pellet.col + 0.5) * CELL,
      y = BOARD_Y + (s.pellet.row + 0.5) * CELL;
    ctx.shadowColor = color.pink;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff5c9e";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff5be";
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = s.snake.length - 1; i >= 0; i--) {
    const c = s.snake[i];
    if (i === 0) {
      const frame =
        s.bite > 0
          ? Math.min(
              HEAD_FRAMES - 1,
              1 + Math.floor((BITE_SECONDS - s.bite) / (BITE_SECONDS / 3)),
            )
          : 0;
      drawSprite(
        ctx,
        SPRITE_PATHS.head[frame],
        c,
        angle(c, {
          col: c.col + delta[s.dir].col,
          row: c.row + delta[s.dir].row,
        }),
      );
    } else if (i === s.snake.length - 1)
      drawSprite(ctx, SPRITE_PATHS.tail, c, angle(c, s.snake[i - 1]));
    else {
      const a = s.snake[i - 1],
        b = s.snake[i + 1];
      if (a.col === b.col) drawSprite(ctx, SPRITE_PATHS.body, c, 1);
      else if (a.row === b.row) drawSprite(ctx, SPRITE_PATHS.body, c, 0);
      else {
        const sumx = a.col + b.col - 2 * c.col,
          sumy = a.row + b.row - 2 * c.row;
        const turn =
          sumx === 1 && sumy === 1
            ? 0
            : sumx === -1 && sumy === 1
              ? 1
              : sumx === -1 && sumy === -1
                ? 2
                : 3;
        drawSprite(ctx, SPRITE_PATHS.corner, c, turn);
      }
    }
  }
  // HUD
  ctx.fillStyle = "#0b2130";
  ctx.fillRect(BOARD_X, 12, GRID_COLS * CELL, 90);
  ctx.strokeStyle = "#286174";
  ctx.strokeRect(BOARD_X + 0.5, 12.5, GRID_COLS * CELL - 1, 89);
  label(ctx, SCORE_LABEL, 184, 44, 15, color.muted);
  label(ctx, String(s.score).padStart(4, "0"), 184, 83, 34);
  label(ctx, BEST_LABEL, 356, 44, 15, color.muted);
  label(ctx, String(s.best).padStart(4, "0"), 356, 83, 34);
  if (s.combo >= 2) {
    label(ctx, `x${s.combo} COMBO`, 545, 65, 25, color.lime);
    ctx.fillStyle = "#20474b";
    ctx.fillRect(545, 77, 190, 7);
    ctx.fillStyle = color.lime;
    ctx.fillRect(545, 77, (190 * s.comboWindow) / COMBO_WINDOW, 7);
  }
  label(ctx, MODE_LABEL, 850, 57, 21, color.cyan);
  label(
    ctx,
    s.muted ? "SOUND OFF" : "SOUND ON",
    850,
    82,
    13,
    s.muted ? color.pink : color.muted,
  );
  if (s.screen === "playing") return;
  ctx.fillStyle = "rgba(3,9,19,.78)";
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.fillStyle = color.panel;
  ctx.fillRect(340, 145, 600, 510);
  ctx.strokeStyle = "#3ee7db";
  ctx.lineWidth = 2;
  ctx.strokeRect(340, 145, 600, 510);
  if (s.screen === "title") {
    label(ctx, TITLE_TEXT, STAGE_CX, 275, 96, color.cyan, "center");
    label(ctx, TAGLINE_TEXT, STAGE_CX, 314, 19, color.lime, "center");
    label(ctx, BEST_LABEL, STAGE_CX, 359, 16, color.muted, "center");
    label(ctx, String(s.best), STAGE_CX, 397, 30, color.white, "center");
  } else if (s.screen === "howto") {
    label(ctx, "HOW TO PLAY", STAGE_CX, 212, 39, color.cyan, "center");
    const lines = [
      "THE COIL NEVER STOPS.",
      "TURN WITH ARROWS OR WASD; TURNS LAND NEXT TICK.",
      "ONLY PERPENDICULAR TURNS. NO DOUBLING BACK.",
      "EAT PELLETS TO GROW ONE CELL.",
      "WALLS AND YOUR BODY END THE ROUND.",
      "EAT QUICKLY TO BUILD x2 THROUGH x5.",
      "THE COMBO FALLS TO x1 WHEN ITS BAR RUNS OUT.",
      "P / ESC PAUSE    M MUTE    ENTER SELECT",
    ];
    lines.forEach((line, i) =>
      label(
        ctx,
        line,
        STAGE_CX,
        270 + i * 36,
        17,
        i === 5 ? color.lime : color.white,
        "center",
      ),
    );
  } else if (s.screen === "paused")
    label(ctx, "PAUSED", STAGE_CX, 285, 62, color.cyan, "center");
  else {
    label(
      ctx,
      s.screen === "cleared" ? CLEARED_TEXT : GAMEOVER_TEXT,
      STAGE_CX,
      270,
      48,
      s.screen === "cleared" ? color.lime : color.pink,
      "center",
    );
    label(
      ctx,
      `${SCORE_LABEL}  ${s.score}`,
      STAGE_CX,
      355,
      28,
      color.white,
      "center",
    );
    label(
      ctx,
      `${BEST_LABEL}  ${s.best}`,
      STAGE_CX,
      397,
      24,
      color.muted,
      "center",
    );
  }
  menuItems(s.screen).forEach((item, i) => {
    const r = menuItemRect(s, i)!;
    const selected = i === s.menuIndex;
    ctx.fillStyle = selected ? "#17495a" : "#102535";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = selected ? color.lime : "#286174";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (selected) {
      ctx.fillStyle = color.lime;
      ctx.fillRect(r.x, r.y, 5, r.h);
    }
    label(
      ctx,
      item,
      STAGE_CX,
      r.y + 32,
      21,
      selected ? color.white : color.muted,
      "center",
    );
  });
}
