const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,dependencies={},env={}){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,require:name=>{if(name in dependencies)return dependencies[name];return require(name)},process:{env}});return api}
const account=load('lib/accounts/keys.ts');
const store=load('lib/messaging/store.ts',{'@/lib/accounts/keys':account},{NODE_ENV:'development'});
test('private messages use separate namespaces and validated identities',()=>{
 const prefixes=[{NODE_ENV:'development'},{VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'},{VERCEL_ENV:'production'}].map(env=>store.messagingPrefix(env));assert.equal(new Set(prefixes).size,3);assert.throws(()=>store.messagingPrefix({VERCEL_ENV:'preview'}));assert.throws(()=>store.memberIndex('other:user'));assert.throws(()=>store.roomKey('../other'));assert.equal(store.validRoomId('------------------------------------'),false);
});
test('anonymous messaging cannot reach storage or create invitations',async()=>{
 const actions=load('app/messages/actions.ts',{'@/auth':{auth:async()=>null},'@vercel/kv':{kv:new Proxy({},{get(){throw Error('Storage reached')}})},'@/lib/messaging/store':store});
 for(const result of [await actions.listPrivateRooms(),await actions.loadPrivateRoom('id'),await actions.createPrivateRoom('Topic'),await actions.joinPrivateRoom('token'),await actions.renewPrivateInvitation('id'),await actions.revokePrivateInvitation('id'),await actions.sendPrivateMessage('id','body','id')])assert.equal(result.ok,false);
});
