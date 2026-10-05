const assert=require('node:assert/strict');
const {Game,deck,PATHS,groups,ports,key}=require('./engine.js');
function rng(seed=431){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function fresh(n=5){return new Game(n,rng())}
function path(shape,x,y,rot=0){return {kind:'path',shape,x,y,rot,id:100+x+y*10}}
function chain(g,last=6){for(let x=1;x<=last;x++)g.s.board[key(x,0)]=path('ew',x,0)}
function inventory(g){let s=g.s;return s.deck.length+s.discard.length+s.players.reduce((n,p)=>n+p.hand.length+p.broken.length,0)+Object.values(s.board).filter(t=>!t.goal&&!t.start).length}
assert.equal(deck().length,67);assert.equal(deck().filter(c=>c.kind==='path').length,40);assert.equal(deck().filter(c=>c.kind==='break').length,9);assert.equal(PATHS.filter(p=>p.dead).reduce((n,p)=>n+p.count,0),8);
for(let n=3;n<=10;n++){let g=fresh(n);assert.equal(g.s.players[0].hand.length,n<=5?6:n<=7?5:4);assert.equal(inventory(g),67);assert.equal(g.s.goldDeck.length,28);assert.equal(g.s.players.filter(p=>p.role==='saboteur').length+(g.s.unusedRole==='saboteur'?1:0),n<=4?1:n<=6?2:n<=9?3:4);}
{
 let g=fresh(),c={kind:'path',shape:'ew'};assert(g.legal(c,1,0));assert(!g.legal(c,2,0));assert(!g.legal(c,1,0,1));assert(!g.legal({kind:'path',shape:'ns'},1,0));
 g.s.board['1,0']=path('deadW',1,0);assert(g.reachable().has('1,0:0'));assert(!g.legal(c,2,0),'cannot tunnel through separated dead ends');
 g.s.board['1,0']=path('ew',1,0);g.s.board['2,0']=path('ew',2,0);delete g.s.board['1,0'];assert(!g.legal(c,3,0),'disconnected branch cannot grow');assert(g.legal(c,1,0),'gap can reconnect');
}
{
 let g=fresh();let p=g.s.players[0];p.hand=[{kind:'break',tools:['pick']}];assert(g.actionTargets(p.hand[0]).some(t=>t.player===0));g.play(0,{player:1,tool:'pick'});assert(g.s.players[1].broken.includes('pick'));g.s.players[1].hand=[{kind:'path',shape:'ew'}];assert.throws(()=>g.play(0,{x:1,y:0}),/工具/);assert.deepEqual(g.pathMoves(g.s.players[1].hand[0]),[]);
 g.s.players[1].broken.push('lamp');g.s.players[1].hand=[{kind:'repair',tools:['pick','lamp']}];g.play(0,{player:1,tool:'pick'});assert.deepEqual(g.s.players[1].broken,['lamp']);
 g.s.players[g.s.current].hand=[{kind:'repair',tools:['cart']}];assert.equal(g.actionTargets(g.s.players[g.s.current].hand[0]).length,0);
}
{
 let g=fresh();g.s.players[0].hand=[{kind:'map'}];let out=g.play(0,{cell:'8,0'});assert.equal(out.info.label,'B');assert.equal(g.s.players[0].known.B,g.s.board['8,0'].content);assert(!g.s.board['8,0'].open);assert.deepEqual(g.s.players[1].known,{});
 g.s.players[g.s.current].hand=[{kind:'fall'}];chain(g);let targets=g.actionTargets(g.s.players[g.s.current].hand[0]);assert(!targets.some(t=>t.cell==='0,0'||t.cell==='8,0'));g.play(0,{cell:'3,0'});assert(!g.s.board['3,0']);assert(!g.legal({kind:'path',shape:'ew'},7,0));
}
{
 let g=fresh();chain(g);g.s.board['8,0'].content='rockA';g.s.players[0].hand=[{kind:'path',shape:'ew'}];g.play(0,{x:7,y:0});assert(g.s.board['8,0'].open);assert.equal(g.s.phase,'turn');
}
for(let actorRole of ['miner','saboteur']){
 let g=fresh();chain(g);g.s.board['8,0'].content='gold';g.s.players.forEach((p,i)=>p.role=i===0?actorRole:'miner');g.s.players[0].hand=[{kind:'path',shape:'ew'}];g.play(0,{x:7,y:0});assert.equal(g.s.phase,'roundEnd');assert.equal(g.s.winner,'miner');let miners=g.s.players.filter(p=>p.role==='miner').length;g.beginAwards();assert.equal(g.s.goldPool.length,miners);assert.equal(g.s.current,actorRole==='miner'?0:4);let sequence=[];while(g.s.phase==='award'){sequence.push(g.s.current);g.chooseGold(0)}assert.deepEqual(sequence,actorRole==='miner'?[0,4,3,2,1]:[4,3,2,1]);assert.equal(g.s.phase,'between');assert(g.nextRound());assert.equal(g.s.current,1);
}
for(let count of [0,1,2,3,4]){let g=fresh(10);g.s.players.forEach((p,i)=>p.role=i<count?'saboteur':'miner');g.finishRound('saboteur');g.beginAwards();assert.equal(g.s.phase,'between');g.s.players.forEach((p,i)=>assert.equal(p.gold.reduce((a,b)=>a+b,0),i<count?(count===1?4:count===4?2:3):0));}
let reports=[];
for(let n=3;n<=10;n++){let g=new Game(n,rng(n+20)),turns=0;while(g.s.phase!=='over'&&turns<300){if(g.s.phase==='turn'){g.play(0,{type:'discard'});turns++;assert.equal(inventory(g),67)}else if(g.s.phase==='roundEnd')g.beginAwards();else if(g.s.phase==='award')g.chooseGold(0);else g.nextRound()}assert.equal(g.s.phase,'over');assert.equal(g.s.round,3);assert.equal(turns,201);assert(g.s.players.every(p=>p.scores.length===3));assert(g.s.goldDeck.length<=28);reports.push(n+'人：三回合完成')}
// Full legal placements/actions retain all 67 cards, including active sabotage.
for(let seed=1;seed<=8;seed++){let g=new Game(5,rng(seed)),steps=0;while(g.s.phase!=='over'&&steps++<240){let s=g.s;if(s.phase==='roundEnd'){g.beginAwards();continue}if(s.phase==='award'){g.chooseGold(0);continue}if(s.phase==='between'){g.nextRound();continue}let p=s.players[s.current],options=[];p.hand.forEach((c,i)=>{for(let m of g.pathMoves(c))options.push({i,action:m,v:m.x-Math.abs(m.y)*.4+(PATHS.find(p=>p.id===c.shape).dead?-20:0)});for(let t of g.actionTargets(c))options.push({i,action:t,v:c.kind==='repair'&&t.player===s.current?20:-30})});options.sort((a,b)=>b.v-a.v);if(options.length)g.play(options[0].i,options[0].action);else g.play(0,{type:'discard'});assert.equal(inventory(g),67)}assert.equal(g.s.phase,'over');assert(g.s.players.every(p=>p.scores.length===3));assert(g.s.goldDeck.length<=28)}
assert.throws(()=>Game.restore({version:1,players:[]}));console.log('PASS: deck, roles, hand sizes, connectivity, dead ends, rotation, tools, maps, rockfall, goals, gold draft, rewards, round order, conservation.');console.log(reports.join('；'));

// Prototype-specific behavior: complete score deck resets, empty goals are four-way.
{let g=fresh();g.finishRound('saboteur');g.beginAwards();g.nextRound();assert.equal(g.s.goldDeck.length,28);assert.equal(g.s.goldDeck.filter(n=>n===1).length,16);assert.equal(g.s.goldDeck.filter(n=>n===2).length,8);assert.equal(g.s.goldDeck.filter(n=>n===3).length,4);for(let t of Object.values(g.s.board).filter(t=>t.goal)){t.open=true;assert.deepEqual(ports(t),[0,1,2,3])}}
// Reject all mismatching neighbors even when another edge connects to the start.
{let g=fresh();g.s.board['1,-1']=path('ew',1,-1);assert(!g.legal({kind:'path',shape:'cross'},1,0));assert(g.legal({kind:'path',shape:'ew'},1,0))}
// A single reconnect reveals every reachable goal, including goals after the treasure.
{let g=fresh();for(let y=-2;y<=2;y++)g.s.board[key(7,y)]=path('cross',7,y);for(let x=1;x<=6;x++)g.s.board[key(x,0)]=path('ew',x,0);g.s.board['8,-2'].content='gold';assert(g.revealGoals());assert(Object.values(g.s.board).filter(t=>t.goal).every(t=>t.open))}
console.log('PASS: prototype score reset, four-way goals, simultaneous reveals, neighbor matching.');
