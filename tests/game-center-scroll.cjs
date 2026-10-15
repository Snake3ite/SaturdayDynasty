const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const bundle=fs.readFileSync(path.join(__dirname,'../dist/app-bundle.js'),'utf8');
const line=bundle.split('\n').find(s=>s.includes("const feed=$12('gcFeed'),feedOwner="));
assert(line,'Game Center scroll listener found');
test('Game Center scroll callback detaches safely after its modal is replaced',()=>{
 const button={hidden:true},owner={onscroll:null,getBoundingClientRect:()=>({top:0})},feed={isConnected:true,scrollTop:30,getBoundingClientRect:()=>({top:100})};let present=true;
 const c={$12:id=>id==='gcFeed'?feed:present?button:null,feedScrollOwner296:()=>owner};
 vm.runInNewContext(line+';feedOwner.onscroll=latest;latest();',c);assert.equal(button.hidden,true);
 present=false;feed.isConnected=false;assert.doesNotThrow(()=>owner.onscroll());assert.equal(owner.onscroll,null);
});
test('Phone landscape hides floating feedback/shop controls without removing menu access',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../browser-shell.css'),'utf8');assert.match(css,/@media\s*\(max-width:\s*760px\),\s*\(max-height:\s*520px\)/);
});
test('Intentional dynasty sharing uses recorded matchup ranks and omits private details',()=>{
 const growth=fs.readFileSync(path.join(__dirname,'../browser-growth.js'),'utf8'),start=growth.indexOf('function dynastySummary('),end=growth.indexOf('function dynastyShareButton(',start);
 const s={school:{name:'QA Foundry'},year:2,record:{w:7,l:3},email:'private@example.com',token:'private',commits:[{stars:4,pos:'QB',name:'Private Player'}],schedule:[{result:'W',opponentRank277:4,opponent:'QA Rivals',score:'28-21'},{result:'L',opponentRank277:1,opponent:'Not a win'},{result:'W',opponent:'No historical rank',rank:1}]};
 const text=vm.runInNewContext(growth.slice(start,end)+'dynastySummary(s)',{s});assert.match(text,/7–3/);assert.match(text,/4-star QB/);assert.match(text,/#4 QA Rivals/);assert(!/private|Private Player|Not a win|No historical/.test(text));
});
