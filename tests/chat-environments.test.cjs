const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,mocks={},env={}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},process:{env}});return out;}
const account=load('lib/accounts/keys.ts');
const keys=load('lib/chat/keys.ts',{'@/lib/accounts/keys':account});
test('conversation and history keys isolate all environments and retain production history',()=>{
 const envs=[{VERCEL_ENV:'production'},{NODE_ENV:'development'},{VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'}];
 assert.equal(keys.chatKey('same',envs[0]),'chat:same');assert.equal(keys.chatIndexKey('alice',envs[0]),'user:chat:alice');
 assert.equal(new Set(envs.map(e=>keys.chatKey('same',e))).size,3);
 assert.equal(new Set(envs.map(e=>keys.chatIndexKey('alice',e))).size,3);
 for(const env of envs){for(const other of envs)assert.equal(keys.indexedChatId(keys.chatKey('same',other),env),env===other?'same':null);}
 assert.throws(()=>keys.chatKey('same',{VERCEL_ENV:'preview'}));
 for(const id of ['../other','a:b','',null,'x'.repeat(129)])assert.throws(()=>keys.chatKey(id,envs[0]));
});
test('a poisoned history index cannot expose or delete foreign conversations',async()=>{
 const env={VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'};
 const scoped=load('lib/chat/keys.ts',{'@/lib/accounts/keys':account},env),reads=[],deletes=[];
 const rows={};rows[scoped.chatKey('mine')]={id:'mine',userId:'alice'};rows[scoped.chatKey('foreign')]={id:'foreign',userId:'bob'};
 const index=[scoped.chatKey('mine'),scoped.chatKey('foreign'),'chat:production','chat-env:local:local:chat:local'];
 const pending=[];const kv={zrange:async()=>index,pipeline:()=>({hgetall:key=>pending.push(key),exec:async()=>pending.map(key=>{reads.push(key);return rows[key];})}),eval:async(script,k,args)=>{if(rows[k[0]]?.userId!==args[0])return 0;deletes.push(k[0]);return 1;}};
 const api=load('app/actions.ts',{'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{}},'@vercel/kv':{kv},'@/auth':{auth:async()=>({user:{id:'alice'}})},'@/lib/chat/keys':scoped,'@/lib/security/save-chat':{},'@/lib/security/chat-mutations':load('lib/security/chat-mutations.ts')},env);
 const result=await api.getChats('alice');assert.equal(result.length,1);assert.equal(result[0].id,'mine');assert.ok(reads.every(key=>key.startsWith('chat-env:preview:preprod:')));
 await api.clearChats();assert.deepEqual(deletes,[scoped.chatKey('mine')]);
});
