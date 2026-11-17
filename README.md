# Classic platformer engine

Run the TypeScript with Node.js 24 or a TypeScript-aware bundler.

## Components

| File | Role |
| --- | --- |
| physics.ts | Player state, input contract, acceleration, friction, braking, Speed meter, jumping, gravity, collision, slopes, sliding, and corner correction |
| gameplay.ts | Classic session lifecycle, simulation tick, crouching, growth, moving-platform riding, swimming, power-ups, flight, stomping, shells, blocks, coins, projectiles, hazards, pipes, death, respawn, and course completion |
| levels.ts | Room types, collision indexing, one-way platforms, slope lookup, and prototype rooms |
| startingTerrain.ts | Starting stage spawn, terrain, and platform collision |
| map-solids.json | Scanned solid geometry used by collision |
| map-slopes.json | Sloped tile geometry |
| campaigns.ts | Campaign selection and Campaign B room assembly |
| campaigns.json | Courses, rooms, enemies, collectibles, hazards, spawns, and pipes for three example campaigns |
| physics-values.json | Machine-readable classic physics constants |

physics.ts exposes classic actions. gameplay.ts is specialized to classic movement and retains the original numeric values and interaction rules. Engine and level identifiers are renamed consistently across the code and data.

## Units and classic values

Simulation runs at 60 ticks per second. Player position and velocity use 16 internal units per pixel. Room geometry uses native pixels, and solid() accepts 16-pixel tile coordinates. Positive Y points downward.

| Parameter | Value |
| --- | --- |
| Walking speed | 24 units per tick, 1.5 pixels per tick |
| Running speed | 40 units per tick, 2.5 pixels per tick |
| Full speed-meter speed | 56 units per tick, 3.5 pixels per tick |
| Steep / gradual slide speed | 60 / 48 units per tick |
| Slope speed modifier | 4 units per slope grade |
| Speed meter maximum / interval | 7 tiers / 8 ticks per tier |
| Jump velocity | -56 units per tick |
| Speed-dependent jump boosts | 0, 2, 4, or 8 upward units |
| Held / released gravity | 1 / 5 units per tick squared |
| Held-jump gravity threshold | -32 units per tick |
| Maximum falling speed | 64 units per tick |
| Small player collision box | 12 by 16 pixels |
| Large player standing / crouching height | 28 / 16 pixels |
| Ceiling corner correction | Up to 3 pixels |
| Acceleration fractional byte | 224 / 256 |
| Ground friction | -1 + 96 / 256, before fixed-point carry |
| Reverse acceleration | 2 internal velocity units, with fixed-point carry |
| Stomp bounce, jump held / released | -56 / -40 units per tick |
| Swimming fall cap / stroke | 20 / -32 units per tick |
| Flight power duration / lift / glide fall cap | 240 ticks / -24 / 12 units per tick |
| Pipe input hold / travel / cooldown | 12 / 30 / 45 ticks |
| Damage protection after shrinking | 120 ticks |
| Respawn delay | 60 ticks |
| Shield duration | 600 ticks |
| Initial lives / course time | 3 / 300 seconds |

The byte accumulator in step() determines the exact acceleration and braking cadence. gameplay.ts also contains enemy, reward, projectile, and moving-platform constants at their points of use.

## Using the copied engine

```js
import {campaigns} from './campaigns.ts';
import {createSession, tick} from './gameplay.ts';
import {physics} from './physics.ts';

const game = createSession({levels: campaigns.campaignC});
// Other choices are campaigns.campaignA and campaigns.campaignB.
// Call once per simulation tick at a fixed 1 / physics.tickRate interval.
tick(game, {right: true, run: true, jump: false, fire: false});
console.log(game.player, game.events);
```

For custom room geometry, supply a LevelSet to createSession(). For just the character controller, use createPlayer() and step() from physics.ts with a World providing solid() and optionally slope().

Rendering, artwork, audio, browser controls, and the desktop are presentation integrations. The copied engine produces player state, world state, and events for a host application to display.
