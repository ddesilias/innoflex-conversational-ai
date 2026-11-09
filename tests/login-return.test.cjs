const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/accounts/return-path.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('login returns to the journal only for its exact allowed path',()=>{
 assert.equal(api.loginReturnPath('/trading-journal'),'/trading-journal');
 for(const value of [undefined,null,{},['/trading-journal'],'https://evil.test','//evil.test','javascript:alert(1)','/trading-journal?next=https://evil.test','/%2f%2fevil.test','/trading-journal/']) assert.equal(api.loginReturnPath(value),'/');
});
