/** Classic platform movement and collision. See README.md for units and values. */
export const physics = Object.freeze({
  tickRate: 60, units: 16, walkSpeed: 0x18, runSpeed: 0x28, powerSpeed: 0x38,
  steepSlideSpeed: 0x3c, gradualSlideSpeed: 0x30, slopeSpeedMod: 4,
  maxSpeedMeter: 7, speedMeterStepFrames: 8, cornerCorrectionPx: 3,
  jumpSpeed: -0x38, jumpBoost: [0, 2, 4, 8],
  heldGravity: 1, releasedGravity: 5, heldThreshold: -0x20,
  // Prototype choices pending full original collision/fall-path validation.
  maxFall: 64, width: 12, height: 16, tile: 16,
});
export type SlopeType =
  | 'up-right'
  | 'down-right'
  | 'grad-up-right-low'
  | 'grad-up-right-high'
  | 'grad-down-right-high'
  | 'grad-down-right-low';
export type Input = { up?: boolean; left?: boolean; right?: boolean; down?: boolean; run?: boolean; jump?: boolean };
export type World = {
  width: number;
  height: number;
  solid: (x: number, y: number) => boolean;
  slope?: (x: number, y: number) => SlopeType | null;
};
export type Player = {
  x: number; y: number; vx: number; vy: number; grounded: boolean;
  jumpHeld: boolean; wiggly: number; speedMeter: number; speedMeterTimer: number;
  height?: number; slope: number; sliding: boolean; frame: number; state: string;
};
export function createPlayer(x = 32, y = 192): Player {
  return { x: x * 16, y: y * 16, vx: 0, vy: 0, grounded: true,
    jumpHeld: false, wiggly: 0, speedMeter: 0, speedMeterTimer: 0, slope: 0, sliding: false, frame: 0, state: 'idle' };
}
export function slopeGrade(type: SlopeType): number {
  if (type === 'up-right') return 2;
  if (type === 'down-right') return -2;
  if (type === 'grad-up-right-low' || type === 'grad-up-right-high') return 1;
  return -1;
}
export function slopeFloorY(type: SlopeType, row: number, localX: number): number {
  const clamped = Math.max(0, Math.min(15, localX));
  switch (type) {
    case 'up-right': return (row + 1) * 16 - 1 - clamped;
    case 'down-right': return row * 16 + clamped;
    case 'grad-up-right-low': return (row + 1) * 16 - 1 - (clamped >> 1);
    case 'grad-up-right-high': return (row + 1) * 16 - 9 - (clamped >> 1);
    case 'grad-down-right-high': return row * 16 + (clamped >> 1);
    case 'grad-down-right-low': return row * 16 + 8 + (clamped >> 1);
  }
}
function probeSlope(p: Player, world: World): { floorY: number; grade: number } | null {
  if (!world.slope) return null;
  const x = Math.floor(p.x / 16), y = Math.floor(p.y / 16), footY = y + (p.height ?? physics.height);
  const samples = [x + 1, x + 6, x + 10];
  const baseRow = Math.floor(footY / 16);
  let best: { floorY: number; grade: number } | null = null;
  for (let row = baseRow - 1; row <= baseRow + 1; row++) {
    for (const sx of samples) {
      const col = Math.floor(sx / 16);
      const type = world.slope(col, row);
      if (!type) continue;
      const localX = ((sx % 16) + 16) % 16;
      const floorY = slopeFloorY(type, row, localX);
      if (footY >= floorY - 6 && footY <= floorY + 6) {
        if (!best || floorY < best.floorY) best = { floorY, grade: slopeGrade(type) };
      }
    }
  }
  return best;
}
function overlaps(p: Player, world: World): boolean {
  const x = Math.floor(p.x / 16), y = Math.floor(p.y / 16);
  for (let row = Math.floor(y / 16); row <= Math.floor((y + (p.height ?? physics.height) - 1) / 16); row++) {
    for (let col = Math.floor(x / 16); col <= Math.floor((x + physics.width - 1) / 16); col++) {
      if (world.solid(col, row)) return true;
    }
  }
  return false;
}
/** Attempt to nudge around a grazed ceiling edge before cancelling upward velocity. */
function tryCornerCorrection(p: Player, world: World): boolean {
  const originalX = p.x;
  for (let px = 1; px <= physics.cornerCorrectionPx; px++) {
    for (const dir of [1, -1]) {
      p.x = originalX + dir * px * physics.units;
      if (!overlaps(p, world)) return true;
    }
  }
  p.x = originalX;
  return false;
}
/** Axis-separated subpixel stepping prevents tunnelling at every supported speed. */
function move(p: Player, world: World, axis: 'x' | 'y', distance: number): boolean {
  const direction = Math.sign(distance);
  for (let remaining = Math.abs(distance); remaining > 0; remaining--) {
    p[axis] += direction;
    if (axis === 'x' && p.grounded && world.slope) {
      const s = probeSlope(p, world);
      if (s) p.y = (s.floorY - (p.height ?? physics.height)) * 16;
    }
    if (axis === 'y' && direction > 0 && world.slope) {
      const s = probeSlope(p, world);
      if (s && Math.floor(p.y / 16) + (p.height ?? physics.height) >= s.floorY) {
        p.y = (s.floorY - (p.height ?? physics.height)) * 16;
        return true;
      }
    }
    if (overlaps(p, world)) {
      if (axis === 'x' && p.grounded && world.slope) {
        const origY = p.y;
        let stepped = false;
        for (let lift = 1; lift <= 2; lift++) {
          p.y = origY - lift * 16;
          if (!overlaps(p, world)) { stepped = true; break; }
        }
        if (stepped) continue;
        p.y = origY;
      }
      if (axis === 'y' && direction < 0 && tryCornerCorrection(p, world)) continue;
      p[axis] -= direction;
      return true;
    }
  }
  return false;
}
export function updateRunMeter(p: Player, input: Input, slope = 0): void {
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  // Speed meter charge/decay: 7 tiers, 8 frames per step.
  const canCharge = p.grounded && !p.sliding && Boolean(input.run) && direction !== 0 &&
    direction === Math.sign(p.vx) && Math.abs(p.vx) >= physics.runSpeed + Math.min(0, -direction * slope * physics.slopeSpeedMod);
  const holdAirPower = !p.grounded && p.speedMeter === physics.maxSpeedMeter &&
    Boolean(input.run) && direction !== 0 && direction === Math.sign(p.vx);
  if (canCharge) {
    p.speedMeterTimer++;
    if (p.speedMeterTimer >= physics.speedMeterStepFrames) {
      p.speedMeterTimer = 0;
      p.speedMeter = Math.min(physics.maxSpeedMeter, p.speedMeter + 1);
    }
  } else if (holdAirPower) {
    p.speedMeterTimer = 0;
  } else if (p.speedMeter > 0) {
    p.speedMeterTimer++;
    if (p.speedMeterTimer >= physics.speedMeterStepFrames) {
      p.speedMeterTimer = 0;
      p.speedMeter = Math.max(0, p.speedMeter - 1);
    }
  } else {
    p.speedMeterTimer = 0;
  }
}
export function runSpeedFor(p: Player): number {
  return p.speedMeter === physics.maxSpeedMeter ? physics.powerSpeed : physics.runSpeed;
}
export function step(p: Player, input: Input, world: World): void {
  p.frame++;
  p.wiggly = ((p.wiggly & 0xf0) - 0x90) & 255;
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const initialSlope = p.grounded ? (probeSlope(p, world)?.grade ?? 0) : 0;
  p.slope = initialSlope;
  if (p.grounded && input.down && initialSlope !== 0 && !direction) {
    p.sliding = true;
  } else if (!p.grounded || direction !== 0 || input.jump) {
    p.sliding = false;
  }
  const speed = Math.abs(p.vx);
  updateRunMeter(p, input, initialSlope);
  const baseTop = input.run ? runSpeedFor(p) : physics.walkSpeed;
  // Slope uphill/downhill speed modifier: uphill slows (-4/-8), downhill boosts (+4/+8).
  const slopeMod = initialSlope !== 0 && direction !== 0
    ? -Math.sign(direction * initialSlope) * Math.abs(initialSlope) * physics.slopeSpeedMod
    : 0;
  const top = Math.max(8, baseTop + slopeMod);
  let main = 0, fraction = 0, sign = direction;
  if (p.sliding) {
    if (initialSlope !== 0) {
      const downhill = -Math.sign(initialSlope);
      const slideCap = Math.abs(initialSlope) > 1 ? physics.steepSlideSpeed : physics.gradualSlideSpeed;
      if (Math.sign(p.vx) !== downhill || Math.abs(p.vx) < slideCap) {
        p.vx += downhill * Math.abs(initialSlope);
        if (Math.abs(p.vx) > slideCap) p.vx = downhill * slideCap;
      }
      sign = 0;
    } else if (p.grounded && speed) {
      main = -1; fraction = 0x60; sign = Math.sign(p.vx);
    } else {
      p.sliding = false;
    }
  } else if (!direction) {
    if (p.grounded && speed) { main = -1; fraction = 0x60; sign = Math.sign(p.vx); }
  } else if (p.vx && direction !== Math.sign(p.vx)) {
    main = 2;
  } else if (speed < top) {
    fraction = 0xe0;
  } else if (speed > top && p.grounded) {
    main = -1; fraction = 0x60;
  }
  if (sign) {
    // Apply the fixed-point byte carry for horizontal acceleration.
    const signedFixed = sign * (main * 256 + fraction);
    const whole = Math.floor(signedFixed / 256);
    const low = ((signedFixed % 256) + 256) % 256;
    p.vx += whole + Number(low + p.wiggly >= 256);
    if (p.sliding && p.vx === 0 && initialSlope === 0) p.sliding = false;
  }
  if (input.jump && !p.jumpHeld && p.grounded) {
    p.vy = physics.jumpSpeed - physics.jumpBoost[Math.min(3, Math.abs(p.vx) >> 4)];
    p.grounded = false;
    p.sliding = false;
    p.slope = 0;
  }
  p.jumpHeld = Boolean(input.jump);
  if (!p.grounded) {
    p.vy = Math.min(physics.maxFall, p.vy +
      (input.jump && p.vy < physics.heldThreshold ? physics.heldGravity : physics.releasedGravity));
  }
  if (move(p, world, 'x', p.vx)) { p.vx = 0; p.speedMeter = 0; p.speedMeterTimer = 0; p.sliding = false; }
  const hitY = move(p, world, 'y', p.vy);
  if (hitY) { p.grounded = p.vy > 0; p.vy = 0; }
  // Check slope surface or flat ground support after horizontal and vertical resolution.
  const activeSlope = p.vy >= 0 ? probeSlope(p, world) : null;
  if (activeSlope) {
    p.y = (activeSlope.floorY - (p.height ?? physics.height)) * 16;
    p.grounded = true;
    p.vy = 0;
    p.slope = activeSlope.grade;
  } else {
    const originalY = p.y;
    p.y += 16;
    const supported = overlaps(p, world);
    p.y = originalY;
    p.grounded = supported && p.vy >= 0;
    if (p.grounded) p.vy = 0;
    p.slope = 0;
    if (p.sliding && p.vx === 0) p.sliding = false;
  }
  p.state = !p.grounded ? (p.vy < 0 ? 'jump' : 'fall') :
    p.sliding ? 'slide' :
    direction && p.vx && direction !== Math.sign(p.vx) ? 'skid' :
    Math.abs(p.vx) > physics.runSpeed ? 'sprint' : p.vx ? 'run' : 'idle';
}
export function createWorld(): World {
  const platforms = [[16, 10, 5], [24, 8, 4], [32, 10, 5], [48, 10, 6], [59, 8, 5], [70, 10, 6]];
  const slopes = new Map<string, SlopeType>([
    // 45° steep hill around cols 8..14
    ['8,12', 'up-right'], ['9,11', 'up-right'],
    ['13,11', 'down-right'], ['14,12', 'down-right'],
    // 22.5° gradual hill around cols 20..25
    ['20,12', 'grad-up-right-low'], ['21,12', 'grad-up-right-high'],
    ['24,12', 'grad-down-right-high'], ['25,12', 'grad-down-right-low'],
    // 45° steep hill near goal around cols 77..83
    ['77,12', 'up-right'], ['78,11', 'up-right'],
    ['82,11', 'down-right'], ['83,12', 'down-right'],
  ]);
  return {
    width: 1440,
    height: 240,
    slope(x, y) {
      return slopes.get(`${x},${y}`) ?? null;
    },
    solid(x, y) {
      if (x < 0 || x >= 90) return true;
      if (y < 0) return false;
      if (slopes.has(`${x},${y}`)) return false;
      if (y >= 13) return !(x >= 39 && x <= 42 || x >= 66 && x <= 68);
      if (y === 12 && (x === 9 || x === 13 || x === 22 || x === 23 || x === 78 || x === 82)) return true;
      return platforms.some(([left, row, length]) => y === row && x >= left && x < left + length)
        || (x >= 10 && x <= 12 && y >= 11) || (x >= 79 && x <= 81 && y >= 11);
    },
  };
}
