const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function page(session, actions={listTradingCycles:async()=>({ok:true,cycles:[]}),loadTradingDraft:async()=>({ok:true,draft:null,revision:0})}){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/trading-journal/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:api,require(name){if(name==='./actions')return actions;if(name==='@/auth')return {auth:async()=>session};if(name==='next/navigation')return {redirect:path=>{throw Error('REDIRECT:'+path)}};if(name==='@/components/trading-workbench')return {__esModule:true,default:()=>React.createElement('section',null,'Private workspace')};return require(name)}});return api.default}
test('journal page redirects anonymous and incomplete sessions before rendering the workspace',async()=>{for(const session of [null,{}, {user:{}},{user:{id:''}}])await assert.rejects(page(session)(),/REDIRECT:\/login\?next=\/trading-journal/)});
test('authenticated identity can render its workspace',async()=>{const element=await page({user:{id:'owner'}})();assert.ok(renderToStaticMarkup(element).includes('Private workspace'))});

test('journal opens the most recently listed account cycle with its saved revision',async()=>{
 const draft={version:1,cycle:'Saved cycle',mode:'Réel',currency:'CAD',plan:{method:'My method',limits:'',avoid:''},trades:[]};
 const cycles=[{id:'recent',name:'Saved cycle',updatedAt:'2026-11-09'}];
 const element=await page({user:{id:'owner'}},{listTradingCycles:async()=>({ok:true,cycles}),loadTradingDraft:async id=>{assert.equal(id,'recent');return {ok:true,draft,revision:7}}})();
 assert.equal(element.props.initial.id,'recent');assert.equal(element.props.initial.revision,7);assert.equal(element.props.initial.draft,draft);
});
test('unavailable cycle listing does not trigger a misleading empty-account read',async()=>{
 const element=await page({user:{id:'owner'}},{listTradingCycles:async()=>({ok:false,message:'Service indisponible'}),loadTradingDraft:async()=>{throw Error('Unexpected read')}})();
 assert.equal(element.props.initial.draft,null);assert.equal(element.props.initial.message,'Service indisponible');
});
