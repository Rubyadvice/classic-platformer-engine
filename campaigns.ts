import data from './campaigns.json' with {type:'json'};
import {prototypeLevels,roomPlatforms,type LevelSet} from './levels.ts';
import hills from './map-slopes.json' with {type:'json'};
import scanned from './map-solids.json' with {type:'json'};
export const campaigns=data as unknown as Record<string,LevelSet>;
for(const levels of Object.values(campaigns)){
 levels.courses.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 levels.groups=Object.fromEntries(levels.courses.map(id=>[id,levels.groups?.[id]??'Region 1']));
}
// Preserve the prototype's hand-authored room transitions and geometry in Campaign B Region 1.
const campaignB=campaigns.campaignB;
const rename=(id:string)=>id.replace(/^fortress/,'1MiniFortress').replace(/^airship/,'1Airship');
for(const [id,room] of Object.entries(prototypeLevels.rooms)){
 const target=rename(id);
 campaignB.rooms[target]={...room,id:target,platforms:roomPlatforms(id),
  solid:id==='1-2'?[...room.solid.filter(r=>r[1]<400),...scanned['1-2-hills']]:room.solid,
  slopes:(hills as any)[id],pipes:room.pipes?.map(p=>({...p,to:rename(p.to)})),
  theme:id.startsWith('fortress')?'castle':id.startsWith('airship')?'airship':room.sky==='#000'?'underground':'ground'};
}
