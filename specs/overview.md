# Coil

## Overview

Coil is a neon grid serpent played in the browser. A snake threads one
continuous path across a bordered grid, eating pellets that make it one cell
longer each time. The longer it grows the less room it has to move, until a
single wrong turn runs it into a wall or into its own body and the round ends.

Coil's defining idea is the combo. Pellets eaten in quick succession build a
scoring multiplier that lapses the moment the player dawdles, so the strong
player is the one who plans an efficient route from one pellet to the next
rather than the one who merely survives.

Coil ships the art and the sound it plays, and this build makes them. The
snake's sprite set and the game's cues and music are produced during the build
with the asset-generation binaries on the `PATH`, committed to the repository,
and bundled by the build. `specs/assets.md` is that contract.

Coil has its own name, look, and combo rule, and its assets, branding, and
design are original to it.

The specification spans several files under `specs/`.

| File | What it fixes |
| --- | --- |
| `specs/overview.md` | The stage, the project, the build interface, and what a player reads at a glance. |
| `specs/board.md` | The cell grid, the wall border, the snake's starting chain, and where a pellet spawns. |
| `specs/movement.md` | The fixed tick, the order a tick resolves in, turning, growth, and collision. |
| `specs/scoring.md` | The score, the combo multiplier and its window, and the best score. |
| `specs/mode.md` | The mode the game is played in and the menu entry that starts it. |
| `specs/controls.md` | The actions a player drives the game with and the keys bound to them. |
| `specs/ui.md` | The screens, the menus, the HUD, and the audio cues. |
| `specs/assets.md` | The assets this build produces, how each is made, and how it is wired in. |
| `specs/instrumentation.md` | The debugging and automation surface, and the snapshot it reports. |
| `specs/showcase.md` | The showcase the finished game ships beside its source. |

Read all of them and build the game they describe as one cohesive whole.

## The runtime

The game is built on the Simple 2D engine, which documents itself in the
`engine/` directory at the root of this repository. It owns the frame loop and
the delta time the game is given, the input actions the menus and the snake are
driven by, audio cues, asset loading, the canvas fit, and the debug overlay.
Read its documentation before you start. This specification states only what is
specific to Coil.

## The project you build in

The project at the root of this repository is already wired up, and its
`README.md` describes it. It is a TypeScript project built with Vite, tested
with Vitest, linted with ESLint, and formatted with Prettier. That toolchain is
fixed and supplied.

### What you implement

`src/game.ts`, any new modules you add beside it under `src/`, and the assets
under `assets/`, which does not exist yet.

`src/game.ts` exports `game`, a `Game<CoilState, CoilDebugApi>`: `initialize`
builds the state and the debug surface once and returns them together as
`[state, debug]`, `update` takes the current state as a read-only view
(`DeepReadonly<CoilState>`) and returns the next state, advanced against the
frame's delta time in seconds, and `render` is handed that next state, read-only
again, and draws it. The engine holds the state by value and replaces it with
what each `update` returns, so a frame builds the next state from the current one
rather than writing into it, and nothing but `update` and the debug surface's
poses advances the game. All three functions throw `"not implemented"` as they
stand. Implement them.

`src/game.ts` also declares and exports `CoilState`, the game's whole state, and
`CoilDebugApi`, the debug and automation surface `specs/instrumentation.md`
fixes. What `CoilState` carries is yours to shape, subject to the snapshot that
same file fixes.

`src/game.ts` also exports `BACKGROUND`, a CSS color string: the stage
background. `src/main.ts` hands it to the engine as the color the canvas is
cleared to each frame, so the letterbox bars around the stage match the board's
surround. The seeded stub exports a placeholder; replace it with the color your
game uses.

### What stays as it is

- `src/main.ts`, the entry point. It stands the engine up over the page's canvas,
  binds `game` to it, and runs.
- `src/constants.ts`, holding every figure this specification fixes.
- `index.html`, the page and the canvas the engine fits the stage into.
- `.vendor/`, holding the vendored engine that `package.json` resolves the
  dependency from.
- `engine/`, the engine's own documentation.
- The configuration: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, and `.gitignore`.

`package.json` takes one kind of change: a dependency you genuinely need, added
along with the updated `package-lock.json`. Its existing entries and scripts stay
as they are.

### Every figure comes from `src/constants.ts`

Every number, identifier, key binding, cue name, and piece of screen copy this
specification fixes is exported from `src/constants.ts` under the name this
specification gives it. Import it and use it. Where this specification states a
value it also names the constant that holds it, and the constant is
authoritative. Anything this specification does not name is yours to decide.

### Your own tests

Write unit tests for what you build, beside your sources as `src/**/*.test.ts`.
`npm test` runs them in process with Vitest, in Node, with coverage measured over
`src/`.
A test stands the engine up over its own canvas and clock and advances the game a
counted number of frames, so it needs no browser.

### The checks the repository passes

Four commands run over the finished repository before it is reviewed.

| Command | Checks |
| --- | --- |
| `npx tsc --noEmit` | The code type-checks. A repository that does not compile is not reviewed. |
| `npx eslint .` | The code is lint-clean. |
| `npx prettier --check .` | The code is formatted. |
| `npx vitest run --coverage` | Your tests pass, with their count and coverage reported. |

They run on the repository as you leave it. `npm run typecheck`, `npm run lint`,
`npm run format`, and `npm test` run the same four locally.

### The build interface

`npm ci` followed by `npm run build` produces the complete static site into
`dist/` at the repository root, with an `index.html` at the root of that
directory as the entry point. That directory runs correctly when served as-is,
both at the root of a static file server and mounted under a sub-path, so every
URL the build emits or constructs at runtime is page-relative rather than
root-absolute. The scripts that do this are already in `package.json`.

The build bundles the committed files under `assets/` and runs with the
asset-generation binaries absent, as `specs/assets.md` states.

## Goal of this build

Produce a complete, polished, playable game that runs entirely in a browser, and
the art and sound it plays. Aim for a game a person would enjoy playing.

### Hard requirements

- Build on the Simple 2D engine, taking the frame loop, the input actions,
  audio, asset loading, and the debug overlay from it.
- Render real graphics on the canvas. A text-only or character-cell rendering
  does not meet this.
- Produce the snake's sprite set and the game's audio during this build, commit
  the produced files, and bundle them. `specs/assets.md` states what to produce,
  how each file is made, and how it is wired in.
- Run in the browser with no backend. Everything needed to play is
  self-contained, and no API key or credential is needed to build, run, or play.
- Replace the starter `README.md` with one explaining what the game is, how to
  install dependencies, how to run it in development, how to produce the static
  production build, and the controls.

## Code quality

The code is fit for a long-lived codebase shared with human developers. The
type-check, lint, and format checks pass, and unit tests cover the simulation.

## Coordinate system and presentation

All positions and sizes in this specification are given in the game's own logical
units on a fixed stage of `STAGE_W x STAGE_H` (`1280 x 720`, 16:9). The origin
`(0, 0)` is the top-left; `x` increases to the right and `y` increases downward.
The stage center is `(STAGE_CX, STAGE_CY)` (`640, 360`). Where the board sits on
the stage, and where each cell falls, is given in `specs/board.md`.

- `STAGE_W x STAGE_H` is the game's logical design size. Fitting it to the
  browser window is the runtime's: the uniform scale that preserves the aspect
  ratio, the letterboxed centering, and the device pixel ratio. The complete
  stage is therefore on screen at every window size, on load and at any pixel
  density.
- The letterbox bars around the stage carry the stage's background color.
- Draw in logical units, and take the canvas element's own size from the runtime
  alone.
- The simulation operates in the integer cell coordinates of `specs/board.md`,
  independent of the rendered scale. Rendering maps a cell to its logical square
  and the runtime maps that to the screen.
- A pointer or touch position reaches the game in these same logical units, taken
  through that same fit, so a position the game reads and a menu item's region
  the game reports lie in one coordinate space.

Every duration in this specification is in seconds, and the simulation consumes
the delta time the runtime hands each update.

## Visual design

The board is a dark field carrying bright, saturated pieces. Choose the colors
and the typography, decide how the field and its border are drawn, and decide
what sits behind the menus and the panels.

Whatever look you choose, a player reads all of the following at a glance.

| What a player reads | Requirement |
| --- | --- |
| The board's extent | The interior play area and the one-cell wall border around it are told apart at a glance, and the border reads as solid. |
| The cell grid | The interior is faintly ruled cell by cell, so a player counts cells without the ruling dominating the field. |
| The snake's head | The head cell is drawn distinctly from every body cell, so the leading cell is unmistakable at any length. |
| The snake's body | The body reads as one continuous coil rather than a staircase of separate squares, and a bend is drawn as a bend. |
| The pellet | The pellet stands apart from the field, the border, and the snake. |
| The HUD | The score, the best score, and the combo are legible from across the board and sit clear of the play area. |
| Crispness | The produced sprites are sampled without smoothing, so their pixel art stays sharp at every scale the stage is fitted to. |
| Text | Text is legible against its background at the logical stage size. |

The palette, the type, any glow, and every other aspect of the look are yours.
