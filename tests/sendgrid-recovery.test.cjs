const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const ts=require('typescript')
const vm=require('node:vm')
function load(file,mocks={}) {
 const exports={}
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,URL,URLSearchParams,AbortSignal,process:{env:{}},require:name=>{if(name==='server-only')return {};if(Object.hasOwn(mocks,name))return mocks[name];throw Error(name)}})
 return exports
}
const keys=load('lib/accounts/keys.ts')
const mail=load('lib/accounts/sendgrid.ts',{'./keys':keys})
const service=load('lib/accounts/recovery-service.ts')
const env={PASSWORD_RESET_ENABLED:'true',SENDGRID_API_KEY:'SG.fake.test',SENDGRID_FROM_EMAIL:'account@example.test',PASSWORD_RESET_ORIGIN:'https://assistant.example.test'}
const config=mail.recoveryMailConfig(env)
test('recovery is disabled without complete server configuration and trusted origin',()=>{
 for(const values of [{},{...env,PASSWORD_RESET_ENABLED:'false'},{...env,SENDGRID_API_KEY:''},{...env,SENDGRID_FROM_EMAIL:'bad\n@example.test'},{...env,PASSWORD_RESET_ORIGIN:'https://user:pass@example.test'},{...env,PASSWORD_RESET_ORIGIN:'https://example.test/evil'},{...env,PASSWORD_RESET_ORIGIN:'http://localhost:3101'}])assert.throws(()=>mail.recoveryMailConfig(values))
 assert.equal(mail.recoveryMailConfig({...env,NODE_ENV:'development',PASSWORD_RESET_ORIGIN:'http://localhost:3101'}).origin,'http://localhost:3101')
})
test('SendGrid uses only its fixed API, disabled tracking and a fragment reset token',async()=>{
 let call
 const token='a'.repeat(64)
 await mail.sendRecoveryLink(config,'user@example.test',token,async(...args)=>{call=args;return new Response(null,{status:202})})
 assert.equal(call[0],'https://api.sendgrid.com/v3/mail/send')
 assert.equal(call[1].redirect,'error')
 assert.equal(call[1].headers.Authorization,'Bearer SG.fake.test')
 const body=JSON.parse(call[1].body)
 assert.equal(body.personalizations[0].to[0].email,'user@example.test')
 assert.equal(body.tracking_settings.click_tracking.enable,false)
 assert.equal(body.tracking_settings.open_tracking.enable,false)
 assert.ok(body.content[0].value.includes('/reset-password#token='+token))
 assert.ok(!body.content[0].value.includes('?token='))
})
test('SendGrid errors are sanitized and notifications never contain credentials',async()=>{
 await assert.rejects(mail.sendRecoveryLink(config,'user@example.test','a'.repeat(64),async()=>{throw Error('secret bearer and token')}),error=>error.message==='Recovery email unavailable')
 await assert.rejects(mail.sendRecoveryLink(config,'user@example.test','a'.repeat(64),async()=>new Response(null,{status:403})),/unavailable/)
 let payload
 await mail.sendPasswordChanged(config,'user@example.test',async(_,options)=>{payload=JSON.parse(options.body);return new Response(null,{status:202})})
 assert.ok(!payload.content[0].value.includes('SG.fake'))
 assert.ok(!payload.content[0].value.includes('#token='))
})
function fixture(overrides={}) {
 const tasks=[],events=[]
 return {tasks,events,deps:{config:()=>config,schedule:work=>tasks.push(work),issue:async()=>({email:'user@example.test',token:'a'.repeat(64)}),reset:async()=>({changed:true,email:'user@example.test'}),sendLink:async()=>events.push('sent'),sendChanged:async()=>events.push('notified'),record:code=>events.push(code),...overrides}}
}
test('existing, unknown and failed requests have the same public response before lookup',async()=>{
 for(const issue of [async()=>null,async()=>({email:'user@example.test',token:'a'.repeat(64)}),async()=>{throw Error('internal')}]){
  let lookedUp=false
  const f=fixture({issue:async()=>{lookedUp=true;return issue()}})
  const result=await service.requestRecovery(f.deps,'user@example.test')
  assert.equal(result.code,'accepted')
  assert.equal(lookedUp,false)
  assert.ok(!JSON.stringify(result).includes('token'))
  await f.tasks[0]()
  assert.equal(lookedUp,true)
 }
})
test('disabled configuration never queries accounts or sends mail',async()=>{
 let work=0
 const f=fixture({config:()=>{throw Error('disabled')},issue:async()=>{work++},reset:async()=>{work++}})
 assert.equal((await service.requestRecovery(f.deps,'user@example.test')).code,'unavailable')
 assert.equal((await service.finishRecovery(f.deps,'a'.repeat(64),'a long new password','a long new password')).code,'unavailable')
 assert.equal(f.tasks.length,0)
 assert.equal(work,0)
})
test('committed resets stay successful even if notification or scheduling fails',async()=>{
 const f=fixture({sendChanged:async()=>{throw Error('provider')}})
 assert.equal((await service.finishRecovery(f.deps,'a'.repeat(64),'a long new password','a long new password')).code,'changed')
 await f.tasks[0]()
 assert.ok(f.events.includes('notification_failed'))
 const unavailable=fixture({schedule:()=>{throw Error('schedule')}})
 assert.equal((await service.finishRecovery(unavailable.deps,'a'.repeat(64),'a long new password','a long new password')).code,'changed')
})
test('invalid reset submissions and failed atomic commits never notify',async()=>{
 const f=fixture({reset:async()=>({changed:false,email:null})})
 assert.equal((await service.finishRecovery(f.deps,'bad','a long new password','different')).code,'invalid')
 assert.equal((await service.finishRecovery(f.deps,'a'.repeat(64),'a long new password','a long new password')).code,'invalid')
 assert.equal(f.tasks.length,0)
})
