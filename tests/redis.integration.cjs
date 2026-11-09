// Explicit opt-in test. Starts an ephemeral Redis container without ports or volumes.
const { before, after, test } = require('node:test')
const assert = require('node:assert/strict')
const { execFile, execFileSync } = require('node:child_process')
const { promisify } = require('node:util')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const exec = promisify(execFile)
let container
function load(file) {
  const output = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: output, require: name => { if (name === '@/lib/accounts/keys') return {}; if (name === 'server-only') return {}; if (name === 'node:crypto') return require('node:crypto'); if (name === '@/lib/security/read-body') return {}; if (name === './keys') return {}; if (name === './session') return {}; if (name === './attempts') return {}; if (name === './password') return {}; if (name === '@vercel/kv') return { kv: {} }; throw Error(name) } })
  return output
}
const { createAccountScript, upgradePasswordScript } = load('lib/accounts/store.ts')
const { issueResetScript, completeResetScript } = load('lib/accounts/reset.ts')
const { authAttemptScript } = load('lib/accounts/attempts.ts')
const { removeChatScript, shareChatScript } = load('lib/security/chat-mutations.ts')
const { recordDeliveryScript } = load('lib/email/events.ts')
const { quotaScript } = load('lib/security/quota.ts')
const { saveTradingDraftScript, saveTradingCycleScript } = load('lib/trading/storage.ts')
const { saveChatScript } = load('lib/security/save-chat.ts')
const { bindCustomerScript } = load('lib/billing/customer-store.ts')
const { commitBillingScript } = load('lib/billing/store.ts')
async function redis(...args) {
  const result = await exec('docker', ['exec', container, 'redis-cli', '--json', ...args.map(String)])
  const value = JSON.parse(result.stdout)
  if (value && value.error) throw Error(value.error)
  return value
}
async function evaluate(script, keys, args) { return redis('EVAL', script, keys.length, ...keys, ...args) }
before(async () => {
  container = `innoflex-security-test-${randomUUID()}`
  execFileSync('docker', ['run', '--detach', '--rm', '--name', container, '--network', 'none',
    'redis:7-alpine', 'redis-server', '--save', '', '--appendonly', 'no'], { stdio: 'pipe' })
  assert.equal(await redis('PING'), 'PONG')
})
after(() => { if (container) execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }) })
test('Redis enforces a daily cap under concurrent requests', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => evaluate(quotaScript, ['quota:alice'], [3])))
  assert.equal(results.filter(r => r[0] === 1).length, 3)
  assert.equal(await redis('HGET', 'quota:alice', 'used'), '3')
  assert.ok(await redis('TTL', 'quota:alice') > 0)
  assert.equal((await evaluate(quotaScript, ['quota:bob'], [3]))[0], 1)
})
test('a previous-day counter resets without carrying usage forward', async () => {
  await redis('HSET', 'quota:old', 'day', '-1', 'used', '100')
  assert.equal((await evaluate(quotaScript, ['quota:old'], [1]))[0], 1)
  assert.equal((await evaluate(quotaScript, ['quota:old'], [1]))[0], 0)
})
test('concurrent chat ownership claims have exactly one owner', async () => {
  const save = user => evaluate(saveChatScript, ['chat:race', `user:chat:${user}`],
    [user, 'race', 'title', '"2026-11-08"', '/chat/race', '[]', 1])
  const results = await Promise.all([save('alice'), save('bob')])
  assert.equal(results.filter(r => r === 1).length, 1)
  const owner = await redis('HGET', 'chat:race', 'userId')
  assert.equal(await save(owner === 'alice' ? 'bob' : 'alice'), 0)
  await redis('HSET', 'chat:race', 'sharePath', '/share/race')
  assert.equal(await save(owner), 1)
  assert.equal(await redis('HGET', 'chat:race', 'sharePath'), '/share/race')
})
test('customer mapping refuses a second user for the same Stripe customer', async () => {
  const bind = user => evaluate(bindCustomerScript, [`customer:${user}`, 'binding:cus_test'], ['cus_test', user, JSON.stringify({ userId: user })])
  const results = await Promise.all([bind('alice'), bind('bob')])
  assert.equal(results.filter(r => r === 1).length, 1)
})
test('expired reconciliation lease cannot write or mark an event processed', async () => {
  const snapshot = { userId: 'alice', subscriptionId: 'sub_test' }
  const keys = ['billing:lock', 'billing:snapshot', 'billing:event', 'billing:binding']
  await redis('SET', keys[0], 'new-worker')
  await redis('SET', keys[3], JSON.stringify({ userId: 'alice' }))
  assert.equal(await evaluate(commitBillingScript, keys, ['old-worker', JSON.stringify(snapshot)]), 0)
  assert.equal(await redis('EXISTS', keys[1], keys[2]), 0)
  assert.equal(await evaluate(commitBillingScript, keys, ['new-worker', JSON.stringify(snapshot)]), 1)
  assert.equal(JSON.parse(await redis('GET', keys[3])).subscriptionId, 'sub_test')
  assert.equal(await redis('GET', keys[2]), '1')
})

test('concurrent account creation never overwrites the winning identity', async () => {
  const create = id => evaluate(createAccountScript, ['user:race@example.test'], [id, 'race@example.test', `hash-${id}`, `salt-${id}`])
  const results = await Promise.all([create('alice'), create('bob')])
  assert.equal(results.filter(result => result === 1).length, 1)
  const owner = await redis('HGET', 'user:race@example.test', 'id')
  assert.equal(await redis('HGET', 'user:race@example.test', 'password'), `hash-${owner}`)
})
test('password upgrades compare identity and old credentials atomically', async () => {
  const key = 'user:upgrade@example.test'
  await redis('HSET', key, 'id', 'alice', 'password', 'old', 'salt', 'old-salt')
  assert.equal(await evaluate(upgradePasswordScript, [key], ['bob', 'old', 'old-salt', 'new', 'new-salt']), 0)
  assert.equal(await evaluate(upgradePasswordScript, [key], ['alice', 'wrong', 'old-salt', 'new', 'new-salt']), 0)
  assert.equal(await redis('HGET', key, 'password'), 'old')
  assert.equal(await evaluate(upgradePasswordScript, [key], ['alice', 'old', 'old-salt', 'new', 'new-salt']), 1)
  assert.equal(await evaluate(upgradePasswordScript, [key], ['alice', 'old', 'old-salt', 'stale', 'stale-salt']), 0)
  assert.equal(await redis('HGET', key, 'password'), 'new')
})

test('authentication counters enforce limits concurrently without extending lockouts', async () => {
  const keys = ['auth-attempt:login:alice', 'auth-attempt:login:global'];
  const results = await Promise.all(Array.from({length:8},()=>evaluate(authAttemptScript, keys, [3,900,100,60])));
  assert.equal(results.filter(result=>result[0]===1).length, 3);
  assert.equal(await redis('GET', keys[0]), '3');
  const ttl = await redis('TTL', keys[0]);
  assert.equal((await evaluate(authAttemptScript, keys, [3,900,100,60]))[0], 0);
  assert.ok(await redis('TTL', keys[0]) <= ttl);
  assert.equal(await redis('GET', keys[1]), '3');
});
test('global authentication budget blocks rotating identities and expires', async () => {
  const global = 'auth-attempt:signup:global';
  const consume = email => evaluate(authAttemptScript, [`auth-attempt:signup:${email}`, global], [3,3600,2,60]);
  assert.equal((await consume('alice'))[0], 1);
  assert.equal((await consume('bob'))[0], 1);
  assert.equal((await consume('charlie'))[0], 0);
  assert.equal(await redis('EXISTS', 'auth-attempt:signup:charlie'), 0);
  await redis('EXPIRE', global, -1);
  assert.equal((await consume('charlie'))[0], 1);
  assert.ok(await redis('TTL', global) > 0);
});

test('reset links expire and exactly one concurrent use changes the password and session version', async () => {
  const user = 'user:reset@example.test', token = 'password-reset:example', other = 'password-reset:other';
  await redis('HSET', user, 'id', 'alice', 'email', 'reset@example.test', 'password', 'old', 'salt', 'old-salt');
  assert.equal(await evaluate(issueResetScript, [user, token], ['alice','reset@example.test','0']),1);
  assert.equal(await evaluate(issueResetScript, [user, other], ['alice','reset@example.test','0']),1);
  assert.ok(await redis('TTL', token) > 0);
  assert.ok(await redis('TTL', token) <= 900);
  const reset = key => evaluate(completeResetScript, [key,user], ['alice','reset@example.test','0','new','new-salt']);
  const results = await Promise.all([reset(token),reset(token)]);
  assert.equal(results.filter(result=>result===1).length,1);
  assert.equal(await redis('GET', token),null);
  assert.equal(await redis('HGET', user,'credentialVersion'),'1');
  assert.equal(await redis('HGET', user,'password'),'new');
  assert.equal(await reset(other),0);
});
test('expired or foreign reset links cannot modify an account', async () => {
  const user='user:expired@example.test', token='password-reset:expired';
  await redis('HSET',user,'id','alice','email','expired@example.test','password','old','salt','old');
  assert.equal(await evaluate(issueResetScript,[user,token],['bob','expired@example.test','0']),0);
  assert.equal(await evaluate(issueResetScript,[user,token],['alice','expired@example.test','0']),1);
  assert.equal(await evaluate(completeResetScript,[token,user],['bob','expired@example.test','0','new','new']),0);
  await redis('EXPIRE',token,-1);
  assert.equal(await evaluate(completeResetScript,[token,user],['alice','expired@example.test','0','new','new']),0);
  assert.equal(await redis('HGET',user,'password'),'old');
});

test('preview recovery cannot change a production account with the same email', async () => {
  const production='user:shared@example.test', preview='account-env:preprod:user:shared@example.test', token='account-env:preprod:password-reset:cross-env';
  assert.equal(await evaluate(createAccountScript,[production],['production-user','shared@example.test','prod-password','prod-salt']),1);
  assert.equal(await evaluate(createAccountScript,[preview],['preview-user','shared@example.test','preview-password','preview-salt']),1);
  assert.equal(await evaluate(issueResetScript,[preview,token],['preview-user','shared@example.test','0']),1);
  assert.equal(await evaluate(completeResetScript,[token,production],['preview-user','shared@example.test','0','new-password','new-salt']),0);
  assert.equal(await redis('HGET',production,'password'),'prod-password');
  assert.equal(await evaluate(completeResetScript,[token,preview],['preview-user','shared@example.test','0','new-password','new-salt']),1);
  assert.equal(await redis('HGET',preview,'password'),'new-password');
  assert.equal(await redis('HGET',production,'password'),'prod-password');
});

test('delivery events increment once under retries and preserve the newest timestamp',async()=>{
 const keys=['mail:seen:one','mail:day:preview','mail:last:preview'];
 const results=await Promise.all(Array.from({length:6},()=>evaluate(recordDeliveryScript,keys,['delivered',100])));
 assert.equal(results.filter(r=>r===1).length,1);
 assert.equal(await redis('HGET',keys[1],'delivered'),'1');
 await evaluate(recordDeliveryScript,['mail:seen:two',keys[1],keys[2]],['bounce',90]);
 assert.equal(await redis('GET',keys[2]),'100');
 assert.ok(await redis('TTL',keys[0])>0);
});
test('corrupt delivery counters never consume an event before a retry can succeed',async()=>{
 const keys=['mail:seen:corrupt','mail:day:corrupt','mail:last:corrupt'];
 await redis('SET',keys[1],'wrong-type');
 await assert.rejects(evaluate(recordDeliveryScript,keys,['delivered',100]));
 assert.equal(await redis('EXISTS',keys[0]),0);
 await redis('DEL',keys[1]);
 assert.equal(await evaluate(recordDeliveryScript,keys,['delivered',100]),1);
});

test('isolated histories with identical IDs survive a Preview clear and sharing cannot overwrite messages', async()=>{
 const production='chat:shared-id',preview='chat-env:preview:preprod:chat:shared-id',local='chat-env:local:local:chat:shared-id';
 for(const key of [production,preview,local])await redis('HSET',key,'userId','alice','id','shared-id','messages','latest');
 const index='chat-env:preview:preprod:user:chat:alice';await redis('ZADD',index,1,preview,2,production);
 assert.equal(await evaluate(shareChatScript,[preview],['bob','/share/shared-id']),0);
 assert.equal(await evaluate(shareChatScript,[preview],['alice','/share/shared-id']),1);
 assert.equal(await redis('HGET',preview,'messages'),'latest');
 assert.equal(await evaluate(removeChatScript,[preview,index],['bob']),0);
 assert.equal(await evaluate(removeChatScript,[preview,index],['alice']),1);
 assert.equal(await redis('EXISTS',preview),0);
 assert.equal(await redis('EXISTS',production,local),2);
 assert.equal(await redis('ZSCORE',index,preview),null);
});
test('removing a conversation cannot delete it when its index has an invalid type',async()=>{
 await redis('HSET','chat:invalid-index','userId','alice');await redis('SET','chat:index-wrong-type','corrupt');
 await assert.rejects(evaluate(removeChatScript,['chat:invalid-index','chat:index-wrong-type'],['alice']));
 assert.equal(await redis('HGET','chat:invalid-index','userId'),'alice');
});

 test('trading draft updates are atomic and stale tabs cannot overwrite a newer cycle', async () => {
 const key='test:trading:owner-a';
 assert.equal(await evaluate(saveTradingDraftScript,[key],[0,'g20:first']),1);
 assert.equal(await evaluate(saveTradingDraftScript,[key],[0,'g20:stale']),0);
 assert.equal(await redis('HGET',key,'draft'),'g20:first');
 assert.equal(await evaluate(saveTradingDraftScript,[key],[1,'g20:second']),2);
 assert.equal(await redis('HGET',key,'draft'),'g20:second');
 assert.equal(await redis('EXISTS','test:trading:owner-b'),0);
 });

test('G20 server actions round-trip a saved cycle across sessions and reject other identities, stale saves and invalid input', async () => {
 function moduleFrom(file, requireModule) {
  const output={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,require:requireModule,Buffer,process:{env:{NODE_ENV:'development'}}});
  return output;
 }
 const accountKeys=moduleFrom('lib/accounts/keys.ts');
 const storage=moduleFrom('lib/trading/storage.ts',()=>accountKeys);
 const review=moduleFrom('lib/trading/review.ts');
 const key=id=>storage.tradingDraftKey(id,{NODE_ENV:'development',ACCOUNT_STORAGE_NAMESPACE:'test-g20'});
 function session(userId) {
  return moduleFrom('app/trading-journal/actions.ts',name=>{
   if(name==='@/auth')return {auth:async()=>userId?{user:{id:userId}}:null};
   if(name==='@/lib/trading/review')return review;
   if(name==='@/lib/trading/storage')return {...storage,tradingDraftKey:key};
   if(name==='@vercel/kv')return {kv:{eval:evaluate,hgetall:async key=>{const value=await redis('HGETALL',key);return Object.keys(value).length?value:null}}};
   throw Error(name);
  });
 }
 const draft={version:1,cycle:'Synthetic cycle',mode:'Backtest',currency:'CAD',plan:{method:'Test',limits:'Test',avoid:''},trades:[{id:'test-1',date:'2026-11-08',asset:'TEST',mode:'Backtest',status:'Clôturée',pnl:2550,lesson:'Synthetic observation'}]};
 const alice=session('g20-alice');
 assert.equal((await alice.saveTradingDraft(JSON.stringify(draft),0)).revision,1);
 const reconnected=session('g20-alice');
 const restored=await reconnected.loadTradingDraft();
 assert.equal(restored.ok,true); assert.equal(restored.revision,1);
 assert.equal(JSON.stringify(restored.draft),JSON.stringify(draft));
 assert.equal((await session('g20-bob').loadTradingDraft()).draft,null);
 assert.equal((await session(null).loadTradingDraft()).ok,false);
 assert.equal((await reconnected.saveTradingDraft('{}',1)).ok,false);
 assert.equal((await reconnected.saveTradingDraft(JSON.stringify({...draft,cycle:'Stale'}),0)).ok,false);
 assert.equal((await reconnected.loadTradingDraft()).draft.cycle,'Synthetic cycle');
 assert.equal((await reconnected.saveTradingDraft(JSON.stringify({...draft,cycle:'Updated'}),1)).revision,2);
 assert.equal((await session('g20-alice').loadTradingDraft()).draft.cycle,'Updated');
 const otherCycle='11111111-1111-4111-8111-111111111111';
 assert.equal((await reconnected.saveTradingDraft(JSON.stringify({...draft,cycle:'Second cycle'}),0,otherCycle)).revision,1);
 assert.equal((await reconnected.loadTradingDraft()).draft.cycle,'Updated');
 assert.equal((await reconnected.loadTradingDraft(otherCycle)).draft.cycle,'Second cycle');
 assert.equal((await reconnected.listTradingCycles()).cycles.length,2);
 assert.equal((await session('g20-bob').listTradingCycles()).cycles.length,0);
 assert.equal((await session('g20-bob').loadTradingDraft(otherCycle)).draft,null);
 assert.equal((await reconnected.loadTradingDraft('../g20-bob')).ok,false);
 // Simulate the first release: a saved legacy cycle with no index entry.
 await redis('HDEL',storage.tradingCycleIndexKey('g20-alice',{NODE_ENV:'development'}),'default');
 assert.equal((await reconnected.listTradingCycles()).cycles.length,2);

});


test('cycle collection limits and malformed indexes cannot leave partial writes',async()=>{
 const index='test:g20:bounded-index';
 for(let i=0;i<50;i++)await redis('HSET',index,'cycle-'+i,'meta:{}');
 assert.equal(await evaluate(saveTradingCycleScript,['test:g20:new',index],[0,'g20:{}','new','meta:{}']),-1);
 assert.equal(await redis('EXISTS','test:g20:new'),0);
 assert.equal(await evaluate(saveTradingCycleScript,['test:g20:existing',index],[0,'g20:{}','cycle-0','meta:{}']),1);
 await redis('SET','test:g20:corrupt-index','wrong');
 await assert.rejects(evaluate(saveTradingCycleScript,['test:g20:no-partial-write','test:g20:corrupt-index'],[0,'g20:{}','id','meta:{}']));
 assert.equal(await redis('EXISTS','test:g20:no-partial-write'),0);
});

test('private messages require invitation membership and keep AI and other accounts separate',async()=>{
 function moduleFrom(file, dependencies={}){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,require:name=>name in dependencies?dependencies[name]:require(name),process:{env:{NODE_ENV:'development'}}});return output}
 const accounts=moduleFrom('lib/accounts/keys.ts');
 const store=moduleFrom('lib/messaging/store.ts',{'@/lib/accounts/keys':accounts});
 function session(id){return moduleFrom('app/messages/actions.ts',{'@/auth':{auth:async()=>id?{user:{id}}:null},'@/lib/messaging/store':store,'@vercel/kv':{kv:{eval:evaluate,smembers:key=>redis('SMEMBERS',key)}}})}
 const alice=session('message-alice'),bob=session('message-bob'),eve=session('message-eve');
 const created=await alice.createPrivateRoom('Synthetic private discussion');assert.equal(created.ok,true);assert.equal(created.invitation.length,101);
 const empty=await alice.loadPrivateRoom(created.id);assert.equal(empty.ok,true);assert.equal(empty.room.messages.length,0);
 assert.equal((await eve.loadPrivateRoom(created.id)).ok,false);
 assert.equal((await eve.sendPrivateMessage(created.id,'foreign',randomUUID())).ok,false);
 assert.equal((await alice.joinPrivateRoom(created.invitation)).ok,false);
 assert.equal((await bob.joinPrivateRoom(created.invitation)).ok,true);
 assert.equal((await eve.joinPrivateRoom(created.invitation)).ok,false);
 const nonce=randomUUID();assert.equal((await alice.sendPrivateMessage(created.id,'Synthetic message',nonce)).ok,true);assert.equal((await alice.sendPrivateMessage(created.id,'Synthetic message',nonce)).ok,true);
 const read=await bob.loadPrivateRoom(created.id);assert.equal(read.room.messages.length,1);assert.equal(read.room.messages[0].text,'Synthetic message');assert.equal(read.room.messages[0].mine,false);assert.ok(!('author' in read.room.messages[0]));
 assert.equal((await bob.sendPrivateMessage(created.id,'Synthetic reply',randomUUID())).ok,true);
 assert.equal((await alice.loadPrivateRoom(created.id)).room.messages[1].mine,false);
 assert.equal((await eve.listPrivateRooms()).rooms.length,0);
 assert.equal((await bob.listPrivateRooms()).rooms.length,1);
 await redis('SADD',store.memberIndex('message-eve'),created.id);assert.equal((await eve.listPrivateRooms()).rooms.length,0);
 for(let i=0;i<205;i++)await redis('RPUSH',store.roomKey(created.id)+':messages',JSON.stringify({id:randomUUID(),author:'message-alice',text:'bounded-history-fixture',at:new Date().toISOString()}));
 assert.equal((await bob.sendPrivateMessage(created.id,'After history fixture',randomUUID())).ok,true);assert.equal(await redis('LLEN',store.roomKey(created.id)+':messages'),200);
 const expired=await alice.createPrivateRoom('Expiring invitation');const token=expired.invitation.split('.')[1];const digest=require('node:crypto').createHash('sha256').update(token).digest('hex');await redis('DEL',store.messagingPrefix()+'invite:'+digest);assert.equal((await eve.joinPrivateRoom(expired.invitation)).ok,false);
 for(let i=0;i<9;i++)assert.equal((await alice.sendPrivateMessage(created.id,'rate test',randomUUID())).ok,true);
 assert.equal((await alice.sendPrivateMessage(created.id,'blocked',randomUUID())).ok,false);
 assert.equal((await session(null).listPrivateRooms()).ok,false);
});
