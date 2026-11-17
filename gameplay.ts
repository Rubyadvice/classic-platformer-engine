import { createPlayer, step, slopeFloorY, type Input, type Player, type World } from './physics.ts';
import {prototypeLevels,roomWorld,type Pipe,type LevelSet} from './levels.ts';
export type Block = {x:number;y:number;content:'coin'|'growthPickup'|'projectilePickup'|'flightPickup'|'shield'|'extraLife';used:boolean;bump:number};
export type Actor = {x:number;y:number;vx:number;vy:number;kind:'walker'|'shelledWalker'|'shell'|'growthPickup'|'projectilePickup'|'flightPickup'|'shield'|'extraLife'|'arenaBoss'|'flyingBoss'|'plantGuard'|'spiny'|'beetle'|'fish'|'ghost'|'tallWalker'|'bullet'|'hammer'|'crusher'|'finalBoss'|'fire';sprite?:string;spriteWidth?:number;spriteHeight?:number;originX?:number;originY?:number;dead:number;emerging?:number;hp?:number;immune?:number};
export type MovementMode = 'classic';
export type Session = {
 levels:LevelSet;movementMode:MovementMode;player:Player;world:World;blocks:Block[];actors:Actor[];coins:{x:number;y:number;taken:boolean}[];
 score:number;coinCount:number;lives:number;time:number;ticks:number;invincible:number;
 course:string;room:string;completed:string[];roomCache:Record<string,{blocks:Block[];actors:Actor[];coins:Session['coins']}>;power:'small'|'large'|'fire'|'flight';shield:number;flight:number;attack:number;fireHeld:boolean;pipeHold:number;pipeCooldown:number;travel:null|{pipe:Pipe;ticks:number};projectiles:{x:number;y:number;vx:number;vy:number;ttl:number}[];moving:number[][];big:boolean;won:boolean;gameOver:boolean;death:number;facing:number;events:string[];
};
const newBlock = ([x,y,content]:[number,number,string]):Block => ({x,y,content:content as Block['content'],used:false,bump:0});
const newActor = ([x,y,kind]:[number,number,string]):Actor => ({x,y,kind:kind as Actor['kind'],vx:-.5,vy:0,dead:0,...(kind==='arenaBoss'||kind==='flyingBoss'?{hp:3,immune:0}:{})});
const newCoin = ([x,y]:number[]) => ({x,y,taken:false});
export function createSession({levels=prototypeLevels}:{levels?:LevelSet}={}):Session {
 const first=levels.courses[0];
 if(!first||!levels.rooms[first])throw new Error('Campaign has no starting course');
 const player=createPlayer(...levels.rooms[first].spawn as [number,number]);
 const g:Session={levels,movementMode:'classic',player,world:roomWorld(first,player,[],true,levels),blocks:[],actors:[],coins:[],score:0,coinCount:0,lives:3,time:300,ticks:0,invincible:0,big:false,won:false,gameOver:false,death:0,facing:1,events:[],course:first,room:first,completed:[],roomCache:{},power:'small',shield:0,flight:0,attack:0,fireHeld:false,pipeHold:0,pipeCooldown:0,travel:null,projectiles:[],moving:[]};
 resetCourse(g);return g;
}
export function enterRoom(g:Session,id:string,position?:number[]) {
 const r=g.levels.rooms[id];if(!r)throw new Error('Unknown room '+id);
 if(g.room)g.roomCache[g.room]={blocks:g.blocks,actors:g.actors,coins:g.coins};
 g.room=id;g.moving=[];g.world=roomWorld(id,g.player,g.moving,true,g.levels);
 const state=g.roomCache[id];
 g.blocks=state?.blocks??(r.blocks??[]).map(newBlock);
 g.actors=state?.actors??(r.enemies??[]).map(newActor);
 if(!state)for(const entity of r.entities??[])g.actors.push({...entity,kind:entity.kind as Actor['kind'],originX:entity.x,originY:entity.y,vx:entity.kind==='bullet'?-2:-.5,vy:0,dead:0,...(entity.kind==='finalBoss'?{hp:8,immune:0}:{})});
 g.coins=state?.coins??(r.coins??[]).map(newCoin);
 const [x,y]=position??r.spawn;Object.assign(g.player,createPlayer(x,y),{height:16});
 g.projectiles=[];g.travel=null;g.pipeHold=0;g.pipeCooldown=45;g.flight=0;
}
function resetCourse(g:Session) {
 g.roomCache={};g.room='';g.big=false;g.power='small';g.shield=0;g.invincible=0;g.time=300;g.ticks=0;g.death=0;g.facing=1;g.attack=0;g.fireHeld=false;
 enterRoom(g,g.course);
}
export function startCourse(g:Session,id:string) {
 const index=g.levels.courses.indexOf(id);
 if(g.gameOver||index<0)return false;
 g.course=id;g.won=false;g.gameOver=false;g.roomCache={};g.room='';g.time=300;g.ticks=0;g.death=0;g.travel=null;g.shield=0;g.fireHeld=false;
 enterRoom(g,id);return true;
}
export function clearCourse(g:Session){
 if(g.won)return;
 g.won=true;if(!g.completed.includes(g.course))g.completed.push(g.course);
 g.score+=g.time*50;g.events.push('win');
}
export function collectPower(g:Session,kind:Actor['kind']) {
 const p=g.player;g.score+=1000;g.events.push('powerup');
 if(kind==='extraLife'){g.lives++;g.events.push('life');return;}
 if(kind==='shield'){g.shield=600;return;}
 g.power=kind==='projectilePickup'?'fire':kind==='flightPickup'?'flight':g.big?g.power:'large';
 if(!g.big){g.big=true;g.invincible=60;const top=Math.floor((p.y/16-12)/16);const clear=[Math.floor(p.x/256),Math.floor((p.x/16+11)/16)].every(col=>!g.world.solid(col,top));if(clear){p.height=28;p.y-=192;}}
}
const isPower=(kind:Actor['kind'])=>['growthPickup','projectilePickup','flightPickup','shield','extraLife'].includes(kind);
function pipeTick(g:Session,input:Input){
 if(g.travel){
  if(--g.travel.ticks===0){const pipe=g.travel.pipe;enterRoom(g,pipe.to,pipe.exit);g.events.push('pipe');}
  return true;
 }
 if(g.pipeCooldown){g.pipeCooldown--;return false;}
 const p=g.player,x=p.x/16,y=p.y/16,feet=y+(p.height??16);
 const pipe=(g.levels.rooms[g.room].pipes??[]).find(a=>{
  if(a.direction==='right'||a.direction==='left')return (a.direction==='right'?input.right:input.left)&&Math.abs(x-a.x)<20&&Math.abs(feet-(a.y+16))<20;
  return x+6>=a.x&&x+6<=a.x+32&&(a.direction==='up'?(input.up||input.jump)&&Math.abs(y-a.y)<36:input.down&&Math.abs(feet-a.y)<18);
 });
 if(pipe){if(++g.pipeHold>=12){g.travel={pipe,ticks:30};p.vx=p.vy=0;g.events.push('pipe');}return true;}
 g.pipeHold=0;return false;
}
export function addCoin(g:Session) {
 g.coinCount++;g.score+=100;g.events.push('coin');
 if(g.coinCount>=100){g.coinCount-=100;g.lives++;g.events.push('life');}
}
export function hitBlock(g:Session,b:Block) {
 if(b.used)return;
 b.used=true;b.bump=12;
 if(b.content==='coin')addCoin(g);
 else g.actors.push({x:b.x,y:b.y,vx:1,vy:0,kind:b.content,dead:0,emerging:32});
 g.events.push('block');
}
export function hurt(g:Session, lethal=false) {
 if(g.death||g.gameOver||(!lethal&&(g.invincible>0||g.shield>0)))return;
 if(g.big&&!lethal){
  g.big=false;g.power='small';g.flight=0;g.player.y+=((g.player.height??16)-16)*16;g.player.height=16;g.invincible=120;g.events.push('hurt');return;
 }
 g.lives--;g.death=60;g.events.push('death');
 if(g.lives<=0)g.gameOver=true;
}
function overlaps(x:number,y:number,w:number,h:number,a:{x:number;y:number},aw=16,ah=16){return x<a.x+aw&&x+w>a.x&&y<a.y+ah&&y+h>a.y;}
function actorSolid(g:Session,a:Actor,x:number,y:number){
 // Use an actor's own feet for one-way platforms rather than Player's height.
 const p=createPlayer(x,y);p.vy=Math.round(a.vy*16);
 const w=roomWorld(g.room,p,g.moving,true,g.levels);
 return w.solid(Math.floor(x/16),Math.floor(y/16)) || w.solid(Math.floor((x+15)/16),Math.floor(y/16)) || w.solid(Math.floor(x/16),Math.floor((y+15)/16)) || w.solid(Math.floor((x+15)/16),Math.floor((y+15)/16));
}
function moveActor(g:Session,a:Actor) {
 if(a.kind==='plantGuard'){a.originY??=a.y;a.y=a.originY+Math.max(0,Math.sin(g.ticks/70))*24;return;}
 if(a.kind==='ghost'){
  const facingGhost=(g.player.x/16<a.x&&g.facing>0)||(g.player.x/16>a.x&&g.facing<0);
  if(!facingGhost){a.x+=Math.sign(g.player.x/16-a.x)*.4;a.y+=Math.sign(g.player.y/16-a.y)*.3;}return;
 }
 if(a.kind==='fish'){a.originY??=a.y;a.x+=a.vx;a.y=a.originY+Math.sin(g.ticks/45)*12;return;}
 if(a.kind==='bullet'){a.x+=a.vx;return;}
 if(a.kind==='fire'){a.originY??=a.y;a.y=a.originY-Math.abs(Math.sin(g.ticks/50))*64;return;}
 if(a.kind==='crusher'){a.originY??=a.y;const near=Math.abs(g.player.x/16-a.x)<80;if(near)a.vy=Math.min(5,a.vy+.3);else a.vy=a.y>a.originY?-1:0;if(!actorSolid(g,a,a.x,a.y+a.vy))a.y+=a.vy;else a.vy=0;return;}
 if(a.kind==='hammer'&&g.ticks%120===0)a.vy=-4;

 if(a.emerging){a.y-=.5;a.emerging--;return;}
 const previousFeet=a.y+16;
 if(actorSolid(g,a,a.x+a.vx,a.y))a.vx=-a.vx;else a.x+=a.vx;
 a.vy=Math.min(4,a.vy+.18);
 const dy=a.vy/Math.max(1,Math.ceil(Math.abs(a.vy)));
 for(let i=0;i<Math.ceil(Math.abs(a.vy));i++){
  if(actorSolid(g,a,a.x,a.y+dy)){a.vy=a.kind==='shield'?-3:0;break;}a.y+=dy;
 }
 // Enemies and moving items follow the same hill surface as Player.
 if(a.vy>=0){
  const w=roomWorld(g.room,createPlayer(a.x,a.y),g.moving,true,g.levels),sx=Math.floor(a.x+8);
  for(let row=Math.floor(previousFeet/16)-1;row<=Math.floor(previousFeet/16)+1;row++){
   const slope=w.slope?.(Math.floor(sx/16),row);if(!slope)continue;
   const floor=slopeFloorY(slope,row,sx%16);
   if(previousFeet<=floor+4&&a.y+16>=floor){a.y=floor-16;a.vy=a.kind==='shield'?-3:0;break;}
  }
 }
 if(a.y>g.world.height+48)a.dead=1;
}
function xOf(p:Player){return p.x/16;}
export function tick(g:Session,input:Input&{fire?:boolean}) {
 g.events=[];
 if(g.gameOver||g.won)return;
 if(g.death){if(--g.death===0)resetCourse(g);return;}
 g.ticks++;if(g.invincible)g.invincible--;if(g.shield)g.shield--;if(g.attack)g.attack--;
 if(pipeTick(g,input))return;
 const r=g.levels.rooms[g.room];
 if(g.levels.streamNext && g.player.x/16 >= r.width-96){
  const blocks=r.blocks?.length??0, enemies=r.enemies?.length??0, coins=r.coins?.length??0;
  g.levels.streamNext();
  // Refresh the shared collision index without replacing the world or controllers.
  roomWorld(g.room,g.player,g.moving,true,g.levels);
  g.blocks.push(...(r.blocks??[]).slice(blocks).map(newBlock));
  g.actors.push(...(r.enemies??[]).slice(enemies).map(newActor));
  g.coins.push(...(r.coins??[]).slice(coins).map(newCoin));
 }
 const oldPlatforms=g.moving.map(platform=>[...platform]);
 g.moving.splice(0,g.moving.length,...(r.moving??[]).map(([x,y,w,dx,dy])=>[Math.round((x+Math.sin(g.ticks/90)*dx)/16)*16,Math.round((y+Math.sin(g.ticks/90)*dy)/16)*16,w,16]));
 const rider=g.player;
 if(rider.grounded){
  const index=oldPlatforms.findIndex(([x,y,w])=>Math.abs(rider.y/16+(rider.height??16)-y)<2&&rider.x/16+12>x&&rider.x/16<x+w);
  if(index>=0&&g.moving[index]){rider.x+=(g.moving[index][0]-oldPlatforms[index][0])*16;rider.y+=(g.moving[index][1]-oldPlatforms[index][1])*16;}
 }
 if(input.fire&&!g.fireHeld){
  if(g.power==='fire'&&g.projectiles.length<2)g.projectiles.push({x:g.player.x/16+6,y:g.player.y/16+12,vx:g.facing*3,vy:1,ttl:160});
  if(g.power==='flight')g.attack=18;
 }
 g.fireHeld=Boolean(input.fire);
 if(!g.levels.streamNext&&g.ticks%60===0&&--g.time<=0){hurt(g,true);return;}
 for(const b of g.blocks)if(b.bump)b.bump--;
 const previousSwimJump=g.player.jumpHeld;
 const p=g.player,previous={x:p.x/16,y:p.y/16,vy:p.vy,feet:p.y/16+(p.height??16)};
 // Keep the feet fixed while growing/ducking; never expand through a ceiling.
 if(g.big){
  const feet=p.y/16+(p.height??16), top=feet-28;
  const blocked=input.down || [Math.floor(xOf(p)/16),Math.floor((xOf(p)+11)/16)].some(col=>{
   for(let row=Math.floor(top/16);row<Math.floor(p.y/256);row++)if(g.world.solid(col,row))return true;
   return false;
  });
  const height=blocked?16:28;p.y=(feet-height)*16;p.height=height;
 }
 if(g.power==='flight'){
  if(p.grounded&&p.speedMeter===7&&input.jump&&!p.jumpHeld)g.flight=240;
  if(g.flight){g.flight--;if(input.jump)p.vy=-24;}
  else if(!p.grounded&&input.jump&&p.vy>12)p.vy=12;
 }
 step(p,input,g.world);
 if(r.water || r.waterAt?.(p.x/16+6, p.y/16+8)){
  p.vy=Math.min(p.vy,20);
  if(input.jump&&!previousSwimJump) p.vy=-32;
  p.y=Math.max(0,p.y);
 }
 if(p.vx)g.facing=Math.sign(p.vx);
 const x=p.x/16,y=p.y/16,h=p.height??16;
 if(previous.vy<0&&p.vy===0&&!p.grounded){
  const block=g.blocks.find(b=>x+12>b.x&&x<b.x+16&&Math.abs(y-(b.y+16))<2);
  if(block)hitBlock(g,block);
 }
 if(y>g.world.height+32 || (r.hazards??[]).some(([a,b,w,hazardHeight])=>overlaps(x,y,12,h,{x:a,y:b},w,hazardHeight))){hurt(g,true);return;}
 for(const c of g.coins)if(!c.taken&&overlaps(x,y,12,h,c,12,16)){c.taken=true;addCoin(g);}
 for(const a of g.actors){
  if(a.dead){a.dead--;continue;}
  if(a.x>x+288||a.x<x-288)continue;
  if(a.immune)a.immune--;
  if(a.hp&&g.ticks%90===0){a.vy=-4;a.vx=x<a.x?-1.1:1.1;}
  moveActor(g,a);
  if(a.dead||a.emerging||!(overlaps(x,y,12,h,a)||(g.attack&&!isPower(a.kind)&&overlaps(x-16,y,44,h,a))))continue;
  if(isPower(a.kind)){
   a.dead=1;collectPower(g,a.kind);
  } else if(g.shield||g.attack&&Math.abs(x-a.x)<32){
   if(!a.hp){a.dead=1;g.score+=100;}else if(!a.immune){a.hp--;a.immune=90;if(!a.hp){a.dead=1;if(a.kind!=='finalBoss')clearCourse(g);}}
  } else if(p.vy>0&&previous.feet<=a.y+5&&!['plantGuard','spiny','ghost','crusher','fire','finalBoss'].includes(a.kind)){
   p.y=(a.y-h)*16;p.vy=input.jump?-56:-40;p.grounded=false;g.score+=100;g.events.push('stomp');
   if(a.hp){if(!a.immune){a.hp--;a.immune=90;if(!a.hp){a.dead=1;clearCourse(g);}}}else if(a.kind==='shelledWalker'||a.kind==='beetle'){a.kind='shell';a.sprite=undefined;a.vx=0;}else if(a.kind==='shell'){a.vx=0;}else a.dead=20;
  } else if(a.kind==='shell'&&a.vx===0){
   a.vx=x<a.x?4:-4;a.x+=a.vx;g.invincible=Math.max(g.invincible,12);g.events.push('kick');
  } else hurt(g);
 }
 // A kicked shell knocks out enemies it encounters.
 for(const shell of g.actors.filter(a=>a.kind==='shell'&&a.vx&&!a.dead)){
  for(const a of g.actors)if(a!==shell&&!a.dead&&!isPower(a.kind)&&!a.hp&&overlaps(shell.x,shell.y,16,16,a)){a.dead=1;g.score+=100;g.events.push('stomp');}
 }
 g.actors=g.actors.filter(a=>a.dead!==1);
 for(const ball of g.projectiles){
  ball.ttl--;ball.x+=ball.vx;ball.vy=Math.min(4,ball.vy+.2);ball.y+=ball.vy;
  if(g.world.solid(Math.floor(ball.x/16),Math.floor((ball.y+4)/16))){if(ball.vy>0){ball.y=Math.floor((ball.y+4)/16)*16-5;ball.vy=-3;}else ball.ttl=0;}
  if(g.world.solid(Math.floor((ball.x+Math.sign(ball.vx)*4)/16),Math.floor(ball.y/16)))ball.ttl=0;
  for(const a of g.actors)if(!a.dead&&!isPower(a.kind)&&overlaps(ball.x,ball.y,6,6,a)){
   ball.ttl=0;if(!a.hp){a.dead=1;g.score+=100;}else if(!a.immune){a.hp--;a.immune=90;if(!a.hp){a.dead=1;if(a.kind!=='finalBoss')clearCourse(g);}}
  }
 }
 g.projectiles=g.projectiles.filter(b=>b.ttl>0&&b.y<g.world.height);
 g.actors=g.actors.filter(a=>a.dead!==1);
 if(!g.death&&(!r.bossRequired||!g.actors.some(a=>a.kind==='finalBoss'&&!a.dead))&&((r.goal!==undefined&&x>=r.goal)||(r.goalArea&&overlaps(x,y,12,h,{x:r.goalArea[0],y:r.goalArea[1]},r.goalArea[2],r.goalArea[3]))))clearCourse(g);
}
