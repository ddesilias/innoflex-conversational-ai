const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function render(path,signedIn){
 const api={};const code=ts.transpileModule(fs.readFileSync('components/main-nav.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:api,require(name){
  if(name==='next/navigation')return {usePathname:()=>path};
  if(name==='next/link')return {__esModule:true,default:props=>React.createElement('a',props,props.children)};
  if(name==='./brand-lockup')return {BrandLockup:()=>React.createElement('span',null,'INNOFLEX SI')};
  if(name.endsWith('.css'))return {__esModule:true,default:{}};
  return require(name);
 }});
 return renderToStaticMarkup(React.createElement(api.default,{signedIn,account:React.createElement('button',null,'Compte'),chatControls:React.createElement('button',null,'Historique du chat')}));
}
test('product and journal share one header and one navigation without chat controls',()=>{
 for(const path of ['/presentation','/trading-journal']){
  const html=render(path,true);assert.equal((html.match(/<header/g)||[]).length,1);assert.equal((html.match(/<nav/g)||[]).length,1);assert.ok(!html.includes('Historique du chat'));assert.ok(html.includes(`href="${path}" aria-current="page"`));
 }
});
test('chat controls appear only inside an authenticated assistant',()=>{
 assert.ok(render('/',true).includes('Historique du chat'));
 assert.ok(render('/chat/test',true).includes('Historique du chat'));
 assert.ok(!render('/',false).includes('Historique du chat'));
});
