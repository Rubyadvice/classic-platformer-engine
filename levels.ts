import {surfaces,createStartingWorld,startingPlatforms} from './startingTerrain.ts';
import type {Player,World,SlopeType} from './physics.ts';
import scanned from './map-solids.json' with {type:'json'};
import hills from './map-slopes.json' with {type:'json'};
export type Rect=number[];
export type Pipe={x:number;y:number;to:string;exit:number[];direction?:'down'|'up'|'left'|'right';door?:boolean};
export type GeneratedTerrain={gameStyle:string;tileMatrix:number[][];chunks:{archetype:string;act?:string;startTileX:number;widthTiles:number}[]};
export type Room={id:string;width:number;height:number;spawn:number[];goal?:number;solid:Rect[];platforms?:Rect[];pipes?:Pipe[];hazards?:Rect[];blocks?:[number,number,string][];enemies?:[number,number,string][];coins?:number[][];boss?:'arenaBoss'|'flyingBoss';moving?:number[][];sky?:string;image?:string;reference?:string;theme?:string;water?:boolean;waterAt?:(x:number,y:number)=>boolean;generatedTerrain?:GeneratedTerrain;goalArea?:number[];entities?:{x:number;y:number;kind:string;sprite?:string;spriteWidth?:number;spriteHeight?:number}[];bossRequired?:boolean;slopes?:Record<string,SlopeType>};
export const courses=['1-1','1-2','1-3','fortress','1-4','1-5','1-6','airship'];
export const courseNames:Record<string,string>={'fortress':'Mini-Fortress','airship':'Airship'};
const floor=(width:number,y=416):Rect=>[0,y,width,16];
const skyRoom=(id:string):Room=>({id,width:1024,height:432,spawn:[32,392],solid:[floor(1024),[848,368,32,64]],pipes:[{x:848,y:368,to:id.slice(0,3),exit:id==='1-5-sky'?[1488,32]:[2100,80]}],blocks:[[624,176,'extraLife']],coins:Array.from({length:15},(_,i)=>[128+i*32,368]),sky:'#2038ec'});
export const rooms:Record<string,Room>={
 '1-1':{id:'1-1',width:2816,height:432,spawn:[32,400],goal:2704,solid:surfaces,pipes:[{x:2256,y:368,to:'1-1-cellar',exit:[144,32]}],blocks:[[176,352,'coin'],[192,352,'growthPickup'],[224,304,'coin'],[240,304,'coin'],[416,320,'flightPickup'],[704,352,'projectilePickup'],[1472,368,'coin'],[1504,336,'coin'],[1520,336,'shield']],enemies:[[208,400,'walker'],[560,368,'walker'],[800,384,'shelledWalker'],[992,384,'walker'],[1320,336,'walker'],[1776,400,'shelledWalker'],[2080,400,'walker'],[2384,400,'walker']],coins:[[288,304],[304,304],[448,336],[480,304],[736,352],[768,352],[800,352],[1184,384],[1216,384],[1280,352],[1728,368],[1760,368],[2368,352],[2400,352]]},
 '1-1-cellar':{id:'1-1-cellar',width:512,height:192,spawn:[144,32],solid:[[0,0,128,192],[384,0,128,192],[0,176,512,16],[256,160,128,16],[288,144,96,16],[320,128,64,16],[336,112,48,16],[352,96,32,16],[368,80,16,16]],pipes:[{x:352,y:16,direction:'up',to:'1-1',exit:[2320,368]}],coins:Array.from({length:10},(_,i)=>[144+i%5*32,96+Math.floor(i/5)*32]),sky:'#000'},
 '1-2':{id:'1-2',width:2816,height:432,spawn:[32,384],goal:2704,solid:[[0,416,624,16],[640,416,1216,16],[1888,416,176,16],[2096,416,720,16],[352,288,64,32],[608,288,96,32],[640,304,32,112],[960,320,32,96],[1184,272,32,32],[1760,352,32,64],[1904,352,32,64],[2064,368,32,64],[2192,304,48,32]],pipes:[{x:960,y:320,to:'1-2-cellar',exit:[128,96]}],blocks:[[576,336,'flightPickup'],[1184,368,'projectilePickup'],[1488,272,'coin'],[1536,272,'coin'],[2128,336,'shield']],enemies:[[240,352,'walker'],[800,384,'walker'],[1120,384,'shelledWalker'],[1696,336,'walker'],[2272,336,'shelledWalker']]},
 '1-2-cellar':{id:'1-2-cellar',width:256,height:432,spawn:[128,96],solid:[[0,0,64,192],[192,0,64,192],[0,0,256,64],[0,416,256,16],[0,192,16,224],[240,192,16,224]],pipes:[{x:16,y:416,to:'1-2',exit:[1904,336]}],coins:Array.from({length:12},(_,i)=>[48+i%6*24,320+Math.floor(i/6)*32]),sky:'#000'},
 '1-3':{id:'1-3',width:2560,height:432,spawn:[32,400],goal:2448,solid:[[0,416,1280,16],[1296,416,160,16],[1488,416,1072,16],[512,352,32,64],[560,368,96,16],[592,336,64,16],[640,352,16,64],[720,352,64,16],[832,352,16,64],[1088,352,16,64],[1216,368,16,48]],platforms:[[176,384,64,32],[224,336,64,32],[1552,368,80,32],[1568,272,64,32],[1648,336,64,32],[1728,304,64,32],[1760,352,80,32],[1856,320,64,32],[1936,288,64,128]],pipes:[{x:2096,y:96,direction:'up',to:'1-3-sky',exit:[32,400]}],blocks:[[512,336,'flightPickup'],[736,352,'projectilePickup'],[1088,352,'shield']],enemies:[[144,400,'walker'],[464,400,'shelledWalker'],[928,400,'shelledWalker'],[1520,400,'walker'],[2032,400,'shelledWalker']]},
 '1-3-sky':skyRoom('1-3-sky'),
 '1-4':{id:'1-4',width:2048,height:432,spawn:[32,336],solid:[[1936,336,32,64],[2032,240,16,176],[1920,400,128,32]],platforms:[[0,352,160,80],[224,352,64,16],[384,336,80,16],[608,288,64,16],[640,368,32,16],[752,320,16,64],[768,368,48,16],[864,336,16,64],[880,384,32,16],[944,336,32,16],[960,400,64,16],[1008,352,80,16],[1152,384,80,16],[1184,304,64,16],[1264,368,32,16],[1392,304,48,16],[1536,384,64,16],[1728,288,16,48],[1776,368,48,16]],pipes:[{x:1936,y:336,to:'1-4-exit',exit:[128,368]}],blocks:[[1232,288,'flightPickup'],[1536,368,'projectilePickup']],enemies:[[400,320,'shelledWalker'],[1024,336,'walker']]},
 '1-4-exit':{id:'1-4-exit',width:512,height:432,spawn:[128,368],goal:392,solid:[floor(512),[128,384,32,32]]},
 '1-5':{id:'1-5',width:2304,height:432,spawn:[32,72],solid:scanned['1-5'],pipes:[{x:624,y:272,direction:'up',to:'1-5-sky',exit:[32,400]},{x:2240,y:288,direction:'up',to:'1-5-exit',exit:[32,368]}],blocks:[[1328,352,'projectilePickup']],enemies:[[400,352,'shelledWalker'],[1024,352,'walker'],[1456,352,'shelledWalker']],hazards:[[368,384,144,48],[960,352,144,80],[1168,352,80,80],[1312,352,48,80]],sky:'#000'},
 '1-5-sky':skyRoom('1-5-sky'),
 '1-5-exit':{id:'1-5-exit',width:512,height:432,spawn:[32,368],goal:392,solid:[floor(512),[32,384,32,32]]},
 '1-6':{id:'1-6',width:2560,height:432,spawn:[32,384],goal:2448,solid:[[2112,416,448,16]],platforms:[[0,400,112,16],[128,368,48,16],[224,336,48,32],[272,304,48,16],[384,400,48,16],[432,304,48,16],[688,352,64,16],[800,400,112,32],[816,304,64,16],[944,400,64,16],[1024,400,48,16],[1024,304,128,16],[1136,272,48,16],[1200,272,112,16],[1696,304,48,16]],moving:[[528,336,64,0,64],[1376,352,64,96,0],[1536,320,64,80,0],[1808,336,64,80,0],[1984,368,64,48,0]],blocks:[[400,336,'flightPickup'],[800,368,'projectilePickup'],[1184,384,'extraLife']],enemies:[[280,288,'shelledWalker'],[704,336,'shelledWalker'],[1248,256,'shelledWalker']]},
 'fortress':{id:'fortress',width:2560,height:432,spawn:[32,384],solid:scanned.fortress,pipes:[{x:1744,y:400,to:'fortress-boss',exit:[32,384],door:true}],hazards:[[272,416,144,16],[480,416,192,16],[1296,416,64,16],[1392,416,48,16]],blocks:[[576,320,'projectilePickup'],[1568,352,'flightPickup']],enemies:[[704,384,'shelledWalker'],[1136,336,'walker']],sky:'#000'},
 'fortress-boss':{id:'fortress-boss',width:160,height:432,spawn:[32,384],solid:scanned['fortress-boss'],boss:'arenaBoss',enemies:[[96,384,'arenaBoss']],sky:'#000'},
 'airship':{id:'airship',width:1536,height:432,spawn:[96,176],solid:[[64,192,144,16],[176,224,352,16],[480,272,640,16],[640,128,560,16],[976,144,224,48],[1088,304,224,16],[1264,288,192,16],[1312,272,192,16],[1344,224,176,16],[1408,192,32,32],[592,224,32,48],[704,224,16,48],[944,224,16,48]],pipes:[{x:1408,y:192,to:'airship-boss',exit:[32,144]}],blocks:[[848,208,'flightPickup']],enemies:[[384,208,'shelledWalker'],[640,256,'walker'],[896,256,'shelledWalker'],[1200,288,'walker']]},
 'airship-boss':{id:'airship-boss',width:256,height:208,spawn:[32,144],solid:[[0,0,16,208],[240,0,16,208],[0,160,256,48]],boss:'flyingBoss',enemies:[[176,144,'flyingBoss']],sky:'#000'},
};
export type LevelSet={id:string;title:string;courses:string[];courseNames:Record<string,string>;groups?:Record<string,string>;rooms:Record<string,Room>;streamNext?:()=>void;createRun?:()=>LevelSet};
export const prototypeLevels:LevelSet={id:'prototype',title:'Region 1 prototype',courses,courseNames,rooms};
// Index only new geometry when a generated room grows.
const occupied=new WeakMap<Room,{tiles:Set<string>;solidCount:number;blockCount:number}>();
export function roomPlatforms(id:string,levels:LevelSet=prototypeLevels):Rect[] {
 return levels===prototypeLevels&&id==='1-1'?startingPlatforms:levels.rooms[id].platforms??[];
}
export function roomWorld(id:string,p:Player,moving:Rect[]=[],includePlatforms=true,levels:LevelSet=prototypeLevels):World {
 const r=levels.rooms[id];if(levels===prototypeLevels&&id==='1-1')return createStartingWorld(p,includePlatforms);
 const slopeTiles=r.slopes??(levels===prototypeLevels?(hills as Record<string,Record<string,SlopeType>>)[id]:undefined)??{};
 let occupancy=occupied.get(r);
 if(!occupancy||occupancy.solidCount!==r.solid.length||occupancy.blockCount!==(r.blocks?.length??0)){
  occupancy??={tiles:new Set<string>(),solidCount:0,blockCount:0};
  const solids=levels===prototypeLevels&&id==='1-2'?[...r.solid.filter(a=>a[1]<400),...scanned['1-2-hills']]:r.solid;
  for(const [x,y,w,h] of [...solids.slice(occupancy.solidCount),...(r.blocks??[]).slice(occupancy.blockCount).map(([x,y])=>[x,y,16,16])])
   for(let row=Math.ceil(y/16);row*16<y+h;row++)for(let col=Math.ceil(x/16);col*16<x+w;col++)occupancy.tiles.add(`${col},${row}`);
  occupancy.solidCount=r.solid.length;
  occupancy.blockCount=r.blocks?.length??0;
  occupied.set(r,occupancy);
 }
 const set=occupancy.tiles;
 return {get width(){return r.width;},height:r.height,slope:(x,y)=>slopeTiles[`${x},${y}`]??null,solid(col,row){
  if(col<0||col*16>=r.width)return true;
  if(slopeTiles[`${col},${row}`])return false;
  if(set.has(`${col},${row}`))return true;
  const supports=([a,b,w]:Rect)=>col*16+16>a&&col*16<a+w&&row===Math.floor(b/16)&&p.vy>=0&&p.y/16+(p.height??16)<=b+2;
  return includePlatforms&&((r.platforms??[]).some(supports)||moving.some(supports));
 }};
}
