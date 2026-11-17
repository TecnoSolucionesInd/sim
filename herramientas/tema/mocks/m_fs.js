const SENT={ts:'__ts',inc:'__inc',au:'__au'};
const DB=window.__DB={/*SEED*/'usuarios/u1':{email:'emiranda@santamonicafishing.com',nombre:'Elvis Miranda',activo:true,apps:{}}};
let seq=0; const subs=[];
const P=(...p)=>p.join('/');
const clone=(x)=>JSON.parse(JSON.stringify(x));
function apply(base,d){const o=base?clone(base):{};for(const [k,v] of Object.entries(d)){
  if(v&&typeof v==='object'&&v[SENT.ts])o[k]=new Date().toISOString();
  else if(v&&typeof v==='object'&&v[SENT.inc]!==undefined)o[k]=(o[k]||0)+v[SENT.inc];
  else if(v&&typeof v==='object'&&v[SENT.au])o[k]=(o[k]||[]).concat(v[SENT.au]);
  else o[k]=v&&typeof v==='object'?clone(v):v;}return o;}
function nestedArr(x,inArr){ if(Array.isArray(x)){ if(inArr) return true; return x.some(y=>nestedArr(y,true)); } if(x&&typeof x==='object') return Object.values(x).some(y=>nestedArr(y,false)); return false; }
function chk(d){ if(nestedArr(d,false)){ const e=new Error('invalid-argument'); e.code='invalid-argument'; throw e; } }
export function getFirestore(){return{}}
export const Bytes={fromUint8Array:(u)=>({u8:new Uint8Array(u)})};
export function collection(db,...p){return {type:'col',path:P(...p)}}
export function doc(a,...p){ if(a&&a.type==='col'){ const id=p[0]||('id'+(++seq)+Date.now()%1000); return {type:'doc',path:a.path+'/'+id,id}; } const path=P(...p); return {type:'doc',path,id:path.split('/').pop()}; }
export function query(c,...w){return {...c,where:w}}
export function where(f,op,v){return {f,op,v}}
export const serverTimestamp=()=>({[SENT.ts]:1});
export const increment=(n)=>({[SENT.inc]:n});
export const arrayUnion=(...v)=>({[SENT.au]:v});
const tsWrap=(o)=>o;
function snapDoc(path){const d=DB[path];return {id:path.split('/').pop(),exists:()=>d!==undefined,data:()=>d===undefined?undefined:clone(d),ref:{path}}}
function match(v,w){const x=v[w.f];switch(w.op){case '==':return x===w.v;case '>=':return x>=w.v;case '<=':return x<=w.v;case 'in':return w.v.includes(x);case 'array-contains':return (x||[]).includes(w.v);default:return true}}
function colDocs(q){const pre=q.path+'/';return Object.keys(DB).filter(k=>k.startsWith(pre)&&!k.slice(pre.length).includes('/')).filter(k=>(q.where||[]).every(w=>match(DB[k],w))).map(snapDoc)}
export async function getDoc(r){return snapDoc(r.path)}
export async function getDocs(q){const docs=colDocs(q);return {docs,empty:!docs.length,size:docs.length,forEach:(f)=>docs.forEach(f)}}
function notify(){subs.forEach(f=>f())}
export async function setDoc(r,d,opt){chk(d);DB[r.path]=apply(opt&&opt.merge?DB[r.path]:{},d);notify()}
export async function updateDoc(r,d){chk(d);DB[r.path]=apply(DB[r.path],d);notify()}
export async function deleteDoc(r){delete DB[r.path];notify()}
export function writeBatch(){const ops=[];return{set:(r,d,o)=>ops.push(()=>setDoc(r,d,o)),update:(r,d)=>ops.push(()=>updateDoc(r,d)),delete:(r)=>ops.push(()=>deleteDoc(r)),commit:async()=>{for(const o of ops)await o()}}}
export async function runTransaction(db,fn){return fn({get:getDoc,set:(r,d,o)=>{DB[r.path]=apply(o&&o.merge?DB[r.path]:{},d)},update:(r,d)=>{DB[r.path]=apply(DB[r.path],d)}})}
export function onSnapshot(q,cb){const f=()=>{ if(q.type==='doc') cb(snapDoc(q.path)); else cb({docs:colDocs(q)}); }; subs.push(f); setTimeout(f,5); return ()=>{}}
export async function addDoc(c,d){const r=doc(c);await setDoc(r,d);return r}
