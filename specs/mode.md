# Coil — Classic

This file fixes the mode the game is played in and the menu entry that starts it.
The board it is played on is in `specs/board.md`, and everything the tick
resolves is in `specs/movement.md`. Every figure below carries the name this
specification gives it.

## The mode

The game ships one mode, Classic, and every round is a round of it. It is the
grid serpent played on the enclosed `GRID_COLS x GRID_ROWS` board of
`specs/board.md`. The border is solid and fatal, the interior is open, and
exactly one pellet is on the board at a time.

Classic takes the tick, the turning rules, the growth rule, and the collision
rules of `specs/movement.md`, the pellet placement of `specs/board.md`, and the
scoring of `specs/scoring.md` exactly as those files state them.

| Element | Constant | Content |
| --- | --- | --- |
| Menu entry | `MODE_ITEM` | `CLASSIC` |
| HUD label | `MODE_LABEL` | `CLASSIC` |

`MODE_ITEM` is the first item of the title menu, above `HOW TO PLAY`, as
`specs/ui.md` states. `MODE_LABEL` is the mode readout in the HUD.

## Obstacles

`OBSTACLE_CELLS` is empty in this mode. The interior carries no obstacle cell, so
the only solid cells on the board are the wall border and the snake's own body.
