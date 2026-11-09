const {test}=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(path,require){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,require,process:{env:{}}});return api}
const keys=load('lib/accounts/keys.ts');
const api=load('lib/trading/storage.ts',()=>keys);
test('trading data is scoped to authenticated identity and environment',()=>{
 const envs=[{VERCEL_ENV:'production'},{NODE_ENV:'development'},{VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'}];
 const values=envs.flatMap(env=>['owner-a','owner-b'].map(id=>api.tradingDraftKey(id,env)));
 assert.equal(new Set(values).size,6);
 assert.throws(()=>api.tradingDraftKey('owner',{VERCEL_ENV:'preview'}));
 assert.throws(()=>api.tradingDraftKey('a:b',{NODE_ENV:'development'}));
});

test('server actions refuse anonymous access before any storage call',async()=>{
 const actions=load('app/trading-journal/actions.ts',name=>{
 if(name==='@/auth')return {auth:async()=>null};
 if(name==='@vercel/kv')return {kv:new Proxy({},{get(){throw Error('Unexpected storage access')}})};
 if(name==='@/lib/trading/review')return {};
 if(name==='@/lib/trading/storage')return api;
 throw Error(name);
 });
 assert.equal((await actions.loadTradingDraft()).ok,false);
 assert.equal((await actions.saveTradingDraft('{}',0)).ok,false);
});
