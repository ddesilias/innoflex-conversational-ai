const { test } = require('node:test')
const assert = require('node:assert/strict')
const {readFileSync}=require('node:fs')
const crypto=require('node:crypto')
const ts=require('typescript')
const vm=require('node:vm')
function load(file,mocks={}) {
 const exports={}
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require:name=>{if(name==='node:crypto')return crypto;if(Object.hasOwn(mocks,name))return mocks[name];throw Error(name)}})
 return exports
}
const session=load('lib/accounts/session.ts')
const reset=load('lib/accounts/reset.ts',{'server-only':{},'./session':session,'./password':{validPassword:(value,min)=>typeof value==='string'&&value.length>=min&&value.length<=256}})
const account={id:'alice',email:'alice@example.test'}
function fixture(overrides={}) {
 const calls=[]
 return {calls,deps:{limit:async(...args)=>calls.push(['limit',...args]),readAccount:async()=>account,readReset:async()=>({userId:account.id,email:account.email,credentialVersion:0}),hash:async()=>({password:'scrypt-v1$test',salt:'random'}),evaluate:async(...args)=>{calls.push(['evaluate',...args]);return 1},...overrides}}
}
test('reset preparation uses a random token and stores only its digest with an expiring record',async()=>{
 const a=fixture(), b=fixture()
 const first=await reset.preparePasswordReset(a.deps,account.email),second=await reset.preparePasswordReset(b.deps,account.email)
 assert.match(first.token,/^[a-f0-9]{64}$/)
 assert.notEqual(first.token,second.token)
 const write=a.calls.find(call=>call[0]==='evaluate')
 assert.equal(write[2][1],'password-reset:'+crypto.createHash('sha256').update(first.token).digest('hex'))
 assert.ok(!JSON.stringify(write).includes(first.token))
 assert.equal(a.calls[0][0],'limit')
})
test('unknown accounts and failed storage do not return a usable reset token',async()=>{
 const unknown=fixture({readAccount:async()=>null})
 assert.equal(await reset.preparePasswordReset(unknown.deps,account.email),null)
 assert.equal(unknown.calls.length,1)
 const unavailable=fixture({evaluate:async()=>0})
 await assert.rejects(reset.preparePasswordReset(unavailable.deps,account.email),/unavailable/)
})
test('invalid or expired reset tokens and inconsistent passwords never hash or write',async()=>{
 let work=0
 const f=fixture({readReset:async()=>null,hash:async()=>{work++},evaluate:async()=>{work++}})
 for(const [token,password,confirmation] of [['bad','a long password','a long password'],['a'.repeat(64),'short','short'],['a'.repeat(64),'a long password','different'],['a'.repeat(64),'a long password','a long password']]) {
  assert.equal(await reset.completePasswordReset(f.deps,token,password,confirmation),false)
 }
 assert.equal(work,0)
})
test('reset completion is bound to record identity and version; atomic rejection reports failure',async()=>{
 const f=fixture()
 assert.equal(await reset.completePasswordReset(f.deps,'a'.repeat(64),'a new long password','a new long password'),true)
 assert.equal(f.calls[0][2],'reset-confirm')
 const write=f.calls.find(call=>call[0]==='evaluate')
 assert.deepEqual(Array.from(write[3]),[account.id,account.email,'0','scrypt-v1$test','random'])
 const race=fixture({evaluate:async()=>0})
 assert.equal(await reset.completePasswordReset(race.deps,'a'.repeat(64),'a new long password','a new long password'),false)
})
test('legacy sessions remain valid until the credential version changes',async()=>{
 const token={id:account.id,email:account.email}
 assert.equal(await session.sessionIsCurrent(async()=>account,token),true)
 assert.equal(await session.sessionIsCurrent(async()=>({...account,credentialVersion:1}),token),false)
 assert.equal(await session.sessionIsCurrent(async()=>({...account,credentialVersion:'1'}),{...token,credentialVersion:1}),true)
 assert.equal(await session.sessionIsCurrent(async()=>({...account,id:'bob'}),token),false)
 assert.equal(await session.sessionIsCurrent(async()=>null,token),false)
 assert.equal(await session.sessionIsCurrent(async()=>{throw Error('redis')},token),false)
 assert.equal(await session.sessionIsCurrent(async()=>account,{...token,credentialVersion:'bad'}),false)
})
