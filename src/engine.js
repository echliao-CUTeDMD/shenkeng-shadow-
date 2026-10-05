'use strict';
const MineRules=(()=>{
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],TOOLS=['pick','lamp','cart'];
const PATHS=[
{id:'ns',name:'老街直巷',ports:[0,2],count:7,first:1},
{id:'ew',name:'河岸步道',ports:[1,3],count:7,first:8},
{id:'ne',name:'豆腐轉角',ports:[0,1],count:5,first:15},
{id:'nw',name:'茶香轉角',ports:[0,3],count:5,first:20},
{id:'new',name:'廟埕岔路',ports:[0,1,3],count:3,first:25},
{id:'nes',name:'竹筍岔路',ports:[0,1,2],count:3,first:28},
{id:'cross',name:'四寶交會',ports:[0,1,2,3],count:2,first:31},
{id:'deadN',name:'施工封巷',ports:[0],count:2,first:33,dead:true},
{id:'deadE',name:'貨箱封巷',ports:[1],count:2,first:35,dead:true},
{id:'deadS',name:'積水封巷',ports:[2],count:2,first:37,dead:true},
{id:'deadW',name:'圍籬封巷',ports:[3],count:2,first:39,dead:true}
];
const key=(x,y)=>x+','+y;
function shuffle(a,rng=Math.random){for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deck(){let a=[];for(let p of PATHS)for(let i=0;i<p.count;i++)a.push({kind:'path',shape:p.id,code:'P'+String(p.first+i).padStart(2,'0')});for(let tool of TOOLS){for(let i=0;i<3;i++)a.push({kind:'break',tools:[tool]});for(let i=0;i<2;i++)a.push({kind:'repair',tools:[tool]})}for(let tools of [['pick','lamp'],['pick','cart'],['lamp','cart']])a.push({kind:'repair',tools});for(let i=0;i<6;i++)a.push({kind:'map'});for(let i=0;i<3;i++)a.push({kind:'fall'});return a.map((c,i)=>({...c,id:i}))}
function shape(t){if(t.start)return {ports:[0,1,2,3]};if(t.goal)return {ports:[0,1,2,3]};return PATHS.find(p=>p.id===t.shape)}
function groups(t){if(t.goal&&!t.open)return [];let s=shape(t),p=s.ports.map(d=>(d+(t.rot||0))%4);return s.dead?p.map(d=>[d]):[p]}
function ports(t){return groups(t).flat()}
class Game{
 constructor(n=5,rng=Math.random){if(!Number.isInteger(n)||n<3||n>10)throw Error('玩家須為 3–10 人');this.rng=rng;this.s={version:1,players:Array.from({length:n},(_,i)=>({name:'玩家 '+(i+1),gold:[]})),round:0,current:0,goldDeck:shuffle([...Array(16).fill(1),...Array(8).fill(2),...Array(4).fill(3)],rng),log:[],history:[]};this.startRound(0)}
 static restore(s){if(s?.version!==1||!Array.isArray(s.players)||s.players.length<3||s.players.length>10||!s.board||!Array.isArray(s.deck)||!Number.isInteger(s.current)||!s.players[s.current]||!['turn','roundEnd','award','between','over'].includes(s.phase))throw Error('存檔格式錯誤');let g=Object.create(Game.prototype);g.rng=Math.random;g.s=s;return g}
 log(message){this.s.log.unshift(message);this.s.log=this.s.log.slice(0,90)}
 startRound(first){let s=this.s,n=s.players.length;s.goldDeck=shuffle([...Array(16).fill(1),...Array(8).fill(2),...Array(4).fill(3)],this.rng);s.players.forEach(p=>p.roundStart=p.gold.reduce((a,b)=>a+b,0));s.round++;s.current=first;s.phase='turn';s.turn=1;s.lastActor=first;s.winner=null;s.discard=[];s.board={'0,0':{start:true,x:0,y:0,rot:0}};s.deck=shuffle(deck(),this.rng);let sab=n<=4?1:n<=6?2:n<=9?3:4,roles=shuffle([...Array(sab).fill('saboteur'),...Array(n+1-sab).fill('miner')],this.rng);s.unusedRole=roles.pop();for(let p of s.players){p.role=roles.pop();p.hand=s.deck.splice(0,n<=5?6:n<=7?5:4);p.broken=[];p.damageCards={};p.known={}}let goals=shuffle(['gold','rockA','rockB'],this.rng);[-2,0,2].forEach((y,i)=>s.board[key(8,y)]={goal:true,label:['A','B','C'][i],content:goals[i],open:false,x:8,y,rot:0});s.lastPlaced='0,0';s.awardQueue=[];s.goldPool=[];this.log('第 '+s.round+' 回合開始：身分重新分配。')}
 reachable(){let board=this.s.board,visited=new Set(),queue=[['0,0',0]];while(queue.length){let [k,g]=queue.pop(),nk=k+':'+g;if(visited.has(nk))continue;let t=board[k],ds=t&&groups(t)[g];if(!ds)continue;visited.add(nk);for(let d of ds){let n=board[key(t.x+DIRS[d][0],t.y+DIRS[d][1])];if(!n)continue;groups(n).forEach((ng,j)=>{if(ng.includes((d+2)%4))queue.push([key(n.x,n.y),j])})}}return visited}
 frontier(){let f=new Map;for(let t of Object.values(this.s.board)){if(t.goal&&!t.open)continue;for(let [dx,dy]of DIRS){let x=t.x+dx,y=t.y+dy;if(!this.s.board[key(x,y)])f.set(key(x,y),{x,y})}}return [...f.values()]}
 legal(card,x,y,rot=0){if(card?.kind!=='path'||![0,2].includes(rot)||this.s.board[key(x,y)]||!Number.isInteger(x)||!Number.isInteger(y))return false;let t={...card,x,y,rot},ps=ports(t),reach=this.reachable(),connected=false;for(let d=0;d<4;d++){let n=this.s.board[key(x+DIRS[d][0],y+DIRS[d][1])];if(!n||(n.goal&&!n.open))continue;let opposite=(d+2)%4,np=ports(n);if(ps.includes(d)!==np.includes(opposite))return false;if(ps.includes(d)&&groups(n).some((g,j)=>g.includes(opposite)&&reach.has(key(n.x,n.y)+':'+j)))connected=true}return connected}
 pathMoves(card){if(this.s.players[this.s.current].broken.length||card?.kind!=='path')return [];let a=[];for(let p of this.frontier())for(let rot of [0,2])if(this.legal(card,p.x,p.y,rot))a.push({...p,rot});return a}
 revealGoals(){let found=false,changed=true;while(changed){changed=false;let reach=this.reachable();for(let t of Object.values(this.s.board).filter(t=>t.goal&&!t.open)){let connected=DIRS.some(([dx,dy],d)=>{let n=this.s.board[key(t.x+dx,t.y+dy)];return n&&groups(n).some((g,j)=>g.includes((d+2)%4)&&reach.has(key(n.x,n.y)+':'+j))});if(connected){t.open=true;t.rot=0;changed=true;if(t.content==='gold')found=true;this.log('目標 '+t.label+' 翻開：'+(t.content==='gold'?'四寶文化箱！':t.content==='rockA'?'集順廟前廣場（空點）':'老街茶香巷（空點）'))}}}return found}
 actionTargets(card){let s=this.s,targets=[];if(!card)return targets;if(card.kind==='break')s.players.forEach((p,i)=>{if(!p.broken.includes(card.tools[0]))targets.push({player:i,tool:card.tools[0]})});if(card.kind==='repair')s.players.forEach((p,i)=>card.tools.forEach(tool=>{if(p.broken.includes(tool))targets.push({player:i,tool})}));if(card.kind==='fall')Object.entries(s.board).forEach(([k,t])=>{if(!t.start&&!t.goal)targets.push({cell:k})});if(card.kind==='map')Object.entries(s.board).forEach(([k,t])=>{if(t.goal&&!t.open)targets.push({cell:k})});return targets}
 play(index,action={}){let s=this.s,p=s.players[s.current],card=p.hand[index];if(s.phase!=='turn'||!Number.isInteger(index)||!card)throw Error('目前無法出牌');let info=null,found=false;
 if(action.type==='discard'){s.discard.push(card);this.log(p.name+' 蓋牌棄置一張。')}
 else if(card.kind==='path'){if(p.broken.length)throw Error('工具損壞，無法放置道路');if(!this.legal(card,action.x,action.y,action.rot||0))throw Error('道路不相接，或無法連回起點');let t={...card,x:action.x,y:action.y,rot:action.rot||0};s.board[key(t.x,t.y)]=t;s.lastPlaced=key(t.x,t.y);this.log(p.name+' 放置道路。');found=this.revealGoals()}
 else {let target=this.actionTargets(card).find(t=>t.cell? t.cell===action.cell:t.player===action.player&&t.tool===action.tool);if(!target)throw Error('請選擇有效的行動目標');if(card.kind==='break'){s.players[target.player].broken.push(target.tool);s.players[target.player].damageCards[target.tool]=card;this.log(p.name+' 破壞 '+s.players[target.player].name+' 的'+toolName(target.tool)+'。')}if(card.kind==='repair'){let other=s.players[target.player];if(other.damageCards[target.tool])s.discard.push(other.damageCards[target.tool]);delete other.damageCards[target.tool];other.broken=other.broken.filter(t=>t!==target.tool);this.log(p.name+' 修復 '+other.name+' 的'+toolName(target.tool)+'。')}if(card.kind==='fall'){s.discard.push(s.board[target.cell]);delete s.board[target.cell];this.log(p.name+' 使用工區拆除，移除一張道路。')}if(card.kind==='map'){let t=s.board[target.cell];p.known[t.label]=t.content;info={label:t.label,content:t.content};this.log(p.name+' 查看了一張街坊線索。')}if(card.kind!=='break')s.discard.push(card)}
 p.hand.splice(index,1);s.lastActor=s.current;if(found){this.finishRound('miner');return {info,ended:true}}if(s.deck.length)p.hand.push(s.deck.pop());if(s.players.every(p=>!p.hand.length)){this.finishRound('saboteur');return {info,ended:true}}do{s.current=(s.current+1)%s.players.length}while(!s.players[s.current].hand.length);s.turn++;return {info,ended:false}}
 finishRound(winner){let s=this.s;s.winner=winner;s.phase='roundEnd';s.history.push({round:s.round,winner,roles:s.players.map(p=>p.role)});this.log(winner==='miner'?'導覽隊接通文化箱，本回合結束。':'手牌耗盡，暗影隊阻止了尋寶。')}
 beginAwards(){let s=this.s;if(s.phase!=='roundEnd')return false;if(s.winner==='miner'){let miners=s.players.filter(p=>p.role==='miner').length;s.goldPool=s.goldDeck.splice(0,miners);if(s.goldPool.length!==miners)throw Error('文化點卡不足');s.awardQueue=[];for(let step=0;step<s.players.length;step++){let i=(s.lastActor-step+s.players.length)%s.players.length;if(s.players[i].role==='miner')s.awardQueue.push(i)}s.current=s.awardQueue[0];s.phase='award'}else{let winners=s.players.filter(p=>p.role==='saboteur'),amount=winners.length===1?4:winners.length===4?2:3;for(let p of winners)p.gold.push(amount);this.afterAwards()}return true}
 chooseGold(index){let s=this.s;if(s.phase!=='award'||!Number.isInteger(index)||index<0||index>=s.goldPool.length)throw Error('請選一張文化點卡');s.players[s.current].gold.push(s.goldPool.splice(index,1)[0]);s.awardQueue.shift();if(s.awardQueue.length)s.current=s.awardQueue[0];else this.afterAwards()}
 afterAwards(){for(let p of this.s.players){if(!p.scores)p.scores=[];p.scores.push(p.gold.reduce((a,b)=>a+b,0)-p.roundStart)}this.s.phase=this.s.round===3?'over':'between'}
 nextRound(){if(this.s.phase!=='between')return false;this.startRound((this.s.lastActor+1)%this.s.players.length);return true}
}
function toolName(t){return {pick:'鏟子',lamp:'照明燈',cart:'推車'}[t]}
return {Game,PATHS,DIRS,TOOLS,key,deck,shape,groups,ports,shuffle,toolName};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MineRules;
