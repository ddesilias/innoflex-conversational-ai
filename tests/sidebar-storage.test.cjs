const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function harness(storage) {
 const state=[],effects=[];let cursor=0;
 const react={__esModule:true,createContext:()=>({Provider:'provider'}),useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value}]},useEffect(fn){effects.push(fn)},createElement:(type,props,...children)=>({type,props,children})};
 const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/hooks/use-sidebar.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{exports:api,require:()=>react,localStorage:storage});
 return {render(){cursor=0;return api.SidebarProvider({children:'journal'})},mount(){effects.splice(0).forEach(fn=>fn())}};
}
test('journal content is rendered before browser preferences are loaded',()=>{const h=harness({getItem:()=>null,setItem(){}});const view=h.render();assert.equal(view.children[0],'journal');assert.equal(view.props.value.isLoading,true)});
test('invalid saved preferences never block rendering',()=>{for(const value of ['broken-json','null','{}']){const h=harness({getItem:()=>value,setItem(){}});h.render();h.mount();const view=h.render();assert.equal(view.props.value.isLoading,false);assert.equal(view.props.value.isSidebarOpen,true);assert.equal(view.children[0],'journal')}});
test('unavailable storage still permits opening and closing the menu',()=>{const h=harness({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});h.render();h.mount();h.render().props.value.toggleSidebar();assert.equal(h.render().props.value.isSidebarOpen,false)});
