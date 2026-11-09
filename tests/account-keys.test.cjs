const {test}=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/accounts/keys.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,process:{env:{}}});
test('local and preview accounts cannot address legacy production keys',()=>{
 const email='same@example.test';
 const production=api.accountStorageKey(email,{VERCEL_ENV:'production'});
 const local=api.accountStorageKey(email,{NODE_ENV:'development'});
 const preview=api.accountStorageKey(email,{VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'});
 assert.equal(production,'user:'+email);
 assert.equal(new Set([production,local,preview]).size,3);
 assert.throws(()=>api.accountStorageKey(email,{VERCEL_ENV:'preview'}));
 assert.throws(()=>api.accountStorageKey(email,{VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'production'}));
 assert.throws(()=>api.accountStorageKey(email,{VERCEL_ENV:'production',ACCOUNT_STORAGE_NAMESPACE:'preprod'}));
});
test('recovery tokens use the same isolated namespace as their accounts',()=>{
 const env={VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:'preprod'};
 assert.ok(api.resetStorageKey('digest',env).startsWith('account-env:preprod:'));
 assert.ok(api.accountStorageKey('a@example.test',env).startsWith('account-env:preprod:'));
 for(const namespace of ['../production','', 'Prod!'])assert.throws(()=>api.accountNamespace({VERCEL_ENV:'preview',ACCOUNT_STORAGE_NAMESPACE:namespace}));
});
