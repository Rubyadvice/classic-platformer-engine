/** Starting stage terrain in native pixels, with a 208px sky margin. */
import type { Player, World } from './physics.ts';
export const spawn = { x: 32, y: 400 };
export const goalX = 2704;
// x, y, width, height. Decorative bushes/clouds intentionally have no collision.
export const surfaces = [
  [0,416,624,16], [624,400,464,32], [1152,416,352,16],
  [1536,416,80,16], [1664,416,1152,16],
  [240,368,48,48], [272,336,48,80], [352,368,32,48],
  [400,368,80,48], [464,336,64,80], [512,304,64,112], [512,384,96,32],
  [176,352,32,16], [224,304,32,16], [416,320,16,16], [704,352,16,16],
  [1264,384,112,32], [1296,352,112,64], [1328,320,112,96],
  [1472,368,16,16], [1504,336,32,16],
  [1568,400,48,16], [1584,384,32,16], [1600,368,16,16],
  [1664,368,16,48], [1680,384,16,32], [1696,400,16,16],
  [1792,384,32,32], [1856,368,32,48], [1952,400,16,16],
  [1968,384,80,32], [1984,368,64,16], [2096,384,16,32],
  [2144,368,48,48], [2176,272,48,144], [2256,112,32,208],
  [2256,368,32,48], [2320,384,32,32],
];
// Colored backdrop platforms support Player only from above.
const platformXs = new Set([240,272,400,464,512,1264,1296,1328,2144,2176]);
export const startingPlatforms = surfaces.filter(([left]) => platformXs.has(left));
export function createStartingWorld(player?: Player, includePlatforms = true): World {
  return {
    width:2816, height:432,
    solid(x,y) {
      if(x<0 || x>=176) return true;
      return surfaces.some(([left,top,w,h]) => {
        if (platformXs.has(left)) {
          return includePlatforms && x*16>=left && x*16<left+w && y*16===top &&
            (!player || (player.vy >= 0 && player.y/16 + (player.height ?? 16) <= top + 2));
        }
        return x*16>=left && x*16<left+w && y*16>=top && y*16<top+h;
      });
    },
  };
}
