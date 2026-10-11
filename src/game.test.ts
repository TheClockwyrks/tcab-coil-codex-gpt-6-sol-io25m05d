import { describe, expect, it, vi } from "vitest";
import { game } from "./game";
import { TICK_SECONDS, COMBO_WINDOW } from "./constants";

async function harness() {
  const pressed = new Set<string>();
  const played: string[] = [];
  let muted = false;
  let looping = false;
  const init = {
    input: { register: vi.fn() },
    audio: { load: async () => {} },
    assets: { loadImage: async () => ({}) },
    diagnostics: { register: vi.fn() },
  };
  const [initial, debug] = await game.initialize(init as never);
  const api = {
    input: {
      pressed: (name: string) => pressed.delete(name),
      pointerSamples: () => [],
    },
    audio: {
      play: (name: string) => {
        played.push(name);
      },
      loop: () => {
        looping = true;
      },
      stop: () => {
        looping = false;
      },
      looping: () => looping,
      muted: () => muted,
      setMuted: (value: boolean) => {
        muted = value;
      },
    },
  };
  const frame = (state: typeof initial, dt = TICK_SECONDS) =>
    game.update(state, api as never, dt);
  return { initial, debug, pressed, played, frame };
}

describe("Coil simulation", () => {
  it("starts a round on confirm and advances in fixed ticks", async () => {
    const h = await harness();
    h.pressed.add("confirm");
    const started = h.frame(h.initial, 0);
    expect(started.screen).toBe("playing");
    expect(started.pellet).not.toBeNull();
    const before = h.frame(started, TICK_SECONDS / 2);
    expect(before.snake[0]).toEqual({ col: 15, row: 8 });
    const after = h.frame(before, TICK_SECONDS / 2);
    expect(after.snake[0]).toEqual({ col: 16, row: 8 });
    expect(after.ticks).toBe(1);
  });

  it("grows, scores, and lapses a combo after its full window", async () => {
    const h = await harness();
    let s = h.debug.setScreen(h.initial, "playing");
    s = h.debug.setPellet(s, 16, 8);
    s = h.debug.setNextPellet(s, 17, 8);
    s = h.frame(s);
    expect(s.score).toBe(10);
    expect(s.snake).toHaveLength(4);
    expect(s.pellet).toEqual({ col: 17, row: 8 });
    s = h.frame(s);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(2);
    expect(h.played).toContain("combo-up");
    s = h.debug.setSnakeTravel(s, false);
    s = h.frame(s, COMBO_WINDOW);
    expect(s.combo).toBe(1);
    expect(s.comboWindow).toBe(0);
  });

  it("applies queued turns over separate ticks and freezes on pause", async () => {
    const h = await harness();
    let s = h.debug.setScreen(h.initial, "playing");
    h.pressed.add("down");
    h.pressed.add("left");
    s = h.frame(s, 0);
    expect(s.turns).toEqual(["down", "left"]);
    s = h.frame(s);
    expect(s.dir).toBe("down");
    s = h.frame(s);
    expect(s.dir).toBe("left");
    h.pressed.add("pause");
    s = h.frame(s);
    const frozen = h.frame(s, 10);
    expect(frozen.ticks).toBe(s.ticks);
    expect(frozen.simTime).toBe(s.simTime);
  });

  it("ends immediately on a wall without moving the snake", async () => {
    const h = await harness();
    let s = h.debug.setScreen(h.initial, "playing");
    s = h.debug.setSnake(s, [{ col: 28, row: 8 }]);
    const dead = h.frame(s);
    expect(dead.screen).toBe("gameover");
    expect(dead.snake).toEqual(s.snake);
    expect(h.played).toContain("death");
  });

  it("reports menu hit regions and rejects invalid debug arguments", async () => {
    const h = await harness();
    expect(h.debug.menuItemRect(h.initial, 0)).toMatchObject({ w: 340, h: 48 });
    expect(h.debug.menuItemRect(h.initial, 9)).toBeNull();
    expect(() => h.debug.menuItemRect(h.initial, -1)).toThrow();
    expect(() => h.debug.setCombo(h.initial, 6)).toThrow();
  });
});
