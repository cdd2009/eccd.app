/**
 * eccd.app v2 — Enhanced AP Economics Study Platform
 */
const S = {
  subj: 'micro', tab: 'practice', mode: null, qtype: 'mcq',
  unit: 0, qs: [], idx: 0, ans: {}, rev: {}, review: false,
  timerI: null, timerS: 0, timerT: 0
};

// ─── Data ───────────────────────────────────────────────
function D(subj, type) {
  if (subj==='micro'&&type==='mcq') return MICRO_MCQ;
  if (subj==='macro'&&type==='mcq') return MACRO_MCQ;
  if (subj==='micro'&&type==='frq') return MICRO_FRQ;
  if (subj==='macro'&&type==='frq') return MACRO_FRQ;
  return [];
}
function unitQs(subj,type,u) { return D(subj,type).filter(q=>q.unit===u); }
function unitCounts(subj,type) {
  const c={}; for(const q of D(subj,type)) c[q.unit||0]=(c[q.unit||0]||0)+1; return c;
}
const NAMES = {
  micro:{1:"Basic Economic Concepts",2:"Supply and Demand",3:"Production, Cost & Perfect Competition",4:"Imperfect Competition",5:"Factor Markets",6:"Market Failure & Gov't Role"},
  macro:{1:"Basic Economic Concepts",2:"Economic Indicators & Business Cycle",3:"National Income & Price Determination",4:"Financial Sector",5:"Stabilization Policies",6:"Open Economy & Int'l Trade"}
};

// ─── Explanations ───────────────────────────────────────
// Generate a brief explanation based on correct answer and question context
function genExplanation(q) {
  if (!q.correctAnswer || q.type !== 'mcq') return '';
  const correct = q.choices.find(c => c.letter === q.correctAnswer);
  if (!correct) return '';
  return `<div class="expl-label">💡 Correct Answer</div>
<strong>${q.correctAnswer}. ${correct.text}</strong>`;
}

// ─── Image Handling ─────────────────────────────────────
// Convert img tags: try loading image, show alt-text description box as fallback
function processImages(html) {
  if (!html) return html;
  // Replace img tags with img + fallback alt description
  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    const altMatch = attrs.match(/alt="([^"]*)"/);
    const srcMatch = attrs.match(/src="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : '';
    const src = srcMatch ? srcMatch[1] : '';
    
    if (!alt && !src) return match;
    
    // Show image with onerror fallback to alt-text description
    let result = '';
    if (src) {
      result += `<img src="${src}" alt="${alt}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" style="max-width:100%">`;
    }
    if (alt && alt.length > 20) {
      result += `<div class="img-desc" style="${src ? 'display:none' : ''}">${alt}</div>`;
    }
    return result;
  });
}

// ─── Progress ───────────────────────────────────────────
function loadP() { try{return JSON.parse(localStorage.getItem('eccd_p')||'{}')}catch{return{}} }
function saveAns(id,letter,ok) {
  const p=loadP();
  if(!p.a) p.a={};
  if(!p.s) p.s={c:0,t:0,k:0,bk:0};
  const isNew = !p.a[id];
  p.a[id]={l:letter,ok,ts:Date.now()};
  if(isNew){p.s.t++;if(ok){p.s.c++;p.s.k++;if(p.s.k>p.s.bk)p.s.bk=p.s.k}else p.s.k=0;}
  localStorage.setItem('eccd_p',JSON.stringify(p));
  updStats();
}
function getStats(){const p=loadP();return p.s||{c:0,t:0,k:0,bk:0};}
function unitProg(subj,type,u){
  const p=loadP(),a=p.a||{},qs=unitQs(subj,type,u);
  let att=0,ok=0;
  for(const q of qs){if(a[q.id]){att++;if(a[q.id].ok)ok++;}}
  return {att,ok,tot:qs.length};
}
function missedQs(subj){const p=loadP(),a=p.a||{};return D(subj,'mcq').filter(q=>a[q.id]&&!a[q.id].ok);}

// ─── UI ─────────────────────────────────────────────────
function updStats(){
  const s=getStats(), acc=s.t>0?Math.round(s.c/s.t*100):0;
  $('sv-att').textContent=s.t;
  $('sv-acc').textContent=s.t>0?acc+'%':'—';
  $('sv-str').textContent=s.k+' 🔥';
  $('nav-acc').textContent=s.t>0?acc+'%':'';
  $('nav-fire').textContent=s.k>0?s.k+' 🔥':'';
}
function $(id){return document.getElementById(id);}
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));$(id).classList.add('on');}

function setSubj(subj){
  S.subj=subj;
  document.querySelectorAll('.pill:not(.ts)').forEach(p=>p.classList.toggle('on',p.dataset.s===subj));
  document.querySelectorAll('.pill.ts').forEach(p=>p.classList.toggle('on',p.dataset.s===subj));
  renderGrids();
}

function renderGrids(){
  renderGrid('mcq-grid',S.subj,'mcq');
  renderGrid('frq-grid',S.subj,'frq');
  renderGrid('ut-grid',S.subj,'mcq');
}

function renderGrid(id,subj,type){
  const el=$(id); if(!el) return;
  const counts=unitCounts(subj,type), names=NAMES[subj], cls=subj==='micro'?'mi':'ma';
  let h='';
  for(let u=1;u<=6;u++){
    const c=counts[u]||0; if(!c) continue;
    const pr=unitProg(subj,type,u), pct=pr.tot>0?Math.round(pr.att/pr.tot*100):0;
    h+=`<div class="card" data-u="${u}" data-tp="${type}" data-cid="${id}">
      <div class="card-num">Unit ${u}</div>
      <div class="card-title">${names[u]||'General'}</div>
      <div class="card-meta"><span class="card-count">${c} questions</span>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div></div></div>`;
  }
  const mx=counts[0]||0;
  if(mx>0){
    const pr=unitProg(subj,type,0),pct=pr.tot>0?Math.round(pr.att/pr.tot*100):0;
    h+=`<div class="card" data-u="0" data-tp="${type}" data-cid="${id}">
      <div class="card-num">Mixed</div><div class="card-title">General / Unclassified</div>
      <div class="card-meta"><span class="card-count">${mx} questions</span>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div></div></div>`;
  }
  el.innerHTML=h; el.className=`grid ${cls}`;
}

// ─── Practice / Test ────────────────────────────────────
function startPractice(subj,type,unit){
  const qs=unitQs(subj,type,unit); if(!qs.length)return;
  S.mode='practice';S.qtype=type;S.unit=unit;S.qs=[...qs];S.idx=0;S.ans={};S.rev={};S.review=false;
  stopTimer();$('timer').style.display='none';
  show('s-q');renderQ();
}
function startTest(tt){
  const mcq=D(S.subj,'mcq');let qs,mins;
  if(tt==='full'){qs=shuf([...mcq]).slice(0,60);mins=70;}
  else if(tt==='quick'){qs=shuf([...mcq]).slice(0,20);mins=25;}
  else if(tt==='missed'){qs=shuf(missedQs(S.subj));if(!qs.length){alert('No missed questions!');return;}mins=0;}
  else return;
  S.mode='test-'+tt;S.qtype='mcq';S.qs=qs;S.idx=0;S.ans={};S.rev={};S.review=false;
  if(mins>0){startTimer(mins*60);$('timer').style.display='flex';}else $('timer').style.display='none';
  show('s-q');renderQ();
}
function startUnitTest(u){
  const qs=shuf([...unitQs(S.subj,'mcq',u)]);if(!qs.length)return;
  S.mode='test-unit';S.qtype='mcq';S.unit=u;S.qs=qs;S.idx=0;S.ans={};S.rev={};S.review=false;
  $('timer').style.display='none';show('s-q');renderQ();
}

function renderQ(){
  const q=S.qs[S.idx]; if(!q)return;
  const names=NAMES[S.subj], ul=q.unit>0?`Unit ${q.unit}`:'Mixed';
  const sl=S.subj==='micro'?'Micro':'Macro';
  const isTest=S.mode&&S.mode.startsWith('test');

  $('qcrumb').innerHTML=`<span>${sl}</span><span class="sep">›</span><span>${ul}</span><span class="sep">›</span><span>${q.type.toUpperCase()}</span>`;
  $('qcnt').textContent=`${S.idx+1} / ${S.qs.length}`;
  const tqc=$('tqc');if(tqc)tqc.textContent=`Q${S.idx+1}/${S.qs.length}`;

  // Question text with processed images
  $('qtxt').innerHTML = processImages(q.questionHtml || escHtml(q.question));

  // Handle broken images after render
  setTimeout(()=>{
    $('qtxt').querySelectorAll('img').forEach(img=>{
      img.onerror=function(){
        this.style.display='none';
        const next=this.nextElementSibling;
        if(next&&next.classList.contains('img-desc'))next.style.display='block';
      };
    });
  },0);

  // Next button style
  const nb=$('next-btn');
  nb.className=`btn btn-p${S.subj==='macro'?' ma-mode':''}`;

  const chEl=$('qch'), frqZ=$('frq-zone'), fbEl=$('qfb'), explEl=$('qexpl');
  fbEl.style.display='none'; explEl.style.display='none';

  if(q.type==='mcq'){
    frqZ.style.display='none'; chEl.style.display='flex';
    const ua=S.ans[q.id], done=!!ua;
    let ch='';
    for(const c of q.choices){
      let cls='ch';
      if(done){
        cls+=' dis';
        if(c.letter===q.correctAnswer) cls+=' ok';
        if(c.letter===ua&&ua!==q.correctAnswer) cls+=' no';
      }
      // Use choice HTML if available for rich content
      const choiceContent = c.html ? processImages(c.html) : escHtml(c.text);
      ch+=`<button class="${cls}" data-l="${c.letter}" ${done?'disabled':''}>
        <span class="ch-let">${c.letter}</span><span>${choiceContent}</span></button>`;
    }
    chEl.innerHTML=ch;

    if(done){
      const ok=ua===q.correctAnswer;
      fbEl.style.display='block';
      fbEl.innerHTML=`<div class="fb ${ok?'ok':'no'}">${ok?'✓ Correct!':'✗ Incorrect — Answer: '+q.correctAnswer}</div>`;
      // Show explanation
      const expl=genExplanation(q);
      if(expl){explEl.style.display='block';explEl.innerHTML=`<div class="expl">${expl}</div>`;}
    }
  } else {
    chEl.style.display='none'; frqZ.style.display='block';
    const rb=$('frq-btn'),ad=$('frq-ans');
    if(S.rev[q.id]){rb.style.display='none';ad.style.display='block';ad.innerHTML=q.answer||'<em>No answer available</em>';}
    else{rb.style.display='block';ad.style.display='none';}
  }

  $('prev-btn').style.visibility=S.idx>0?'visible':'hidden';
  nb.textContent=S.idx===S.qs.length-1?(isTest?'Finish Test →':'Finish →'):'Next →';
}

function clickChoice(letter){
  const q=S.qs[S.idx]; if(!q||S.ans[q.id])return;
  const ok=letter===q.correctAnswer;
  S.ans[q.id]=letter;
  if(!S.review)saveAns(q.id,letter,ok);
  renderQ();
}

function nextQ(){
  const q=S.qs[S.idx], isTest=S.mode&&S.mode.startsWith('test');
  if(!isTest&&q&&q.type==='mcq'&&!S.ans[q.id])return;
  if(S.idx<S.qs.length-1){S.idx++;renderQ();window.scrollTo({top:0,behavior:'smooth'});}
  else finish();
}
function prevQ(){if(S.idx>0){S.idx--;renderQ();}}

function finish(){
  stopTimer();
  if(S.qtype==='frq'&&!(S.mode&&S.mode.startsWith('test'))){goHome();return;}
  let ok=0,tot=0;
  for(const q of S.qs){if(q.type==='mcq'){tot++;if(S.ans[q.id]===q.correctAnswer)ok++;}}
  const pct=tot>0?Math.round(ok/tot*100):0;
  $('rs-score').textContent=pct+'%';
  $('rs-label').textContent=S.mode&&S.mode.startsWith('test')?'Test Complete':'Practice Complete';
  $('rs-ok').textContent=ok;$('rs-no').textContent=tot-ok;$('rs-tot').textContent=tot;
  show('s-res');
}

function goHome(){
  stopTimer();S.mode=null;S.qs=[];S.review=false;
  renderGrids();updStats();show('s-home');
}

// ─── Timer ──────────────────────────────────────────────
function startTimer(t){S.timerS=t;S.timerT=t;updTimer();S.timerI=setInterval(()=>{S.timerS--;updTimer();if(S.timerS<=0){stopTimer();finish();}},1000);}
function stopTimer(){if(S.timerI){clearInterval(S.timerI);S.timerI=null;}}
function updTimer(){
  const m=Math.floor(S.timerS/60),s=S.timerS%60,d=$('tdisp');
  d.textContent=`${m}:${s.toString().padStart(2,'0')}`;
  d.className='tdisp'+(S.timerS<300?' crit':S.timerS<600?' warn':'');
  const pct=S.timerS/S.timerT*100,f=$('tfill');
  f.style.width=pct+'%';f.style.background=pct<15?'var(--wrong)':pct<30?'var(--gold)':'var(--micro)';
}

// ─── Util ───────────────────────────────────────────────
function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}

// ─── Events ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  $('logo').onclick=goHome;

  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
    S.tab=t.dataset.t;
    if(t.dataset.t==='practice')goHome();
    else if(t.dataset.t==='test'){show('s-test');$('ut-pick').style.display='none';renderGrids();}
    else if(t.dataset.t==='notes')show('s-notes');
  });

  document.querySelectorAll('.pill:not(.ts)').forEach(p=>p.onclick=()=>setSubj(p.dataset.s));
  document.querySelectorAll('.pill.ts').forEach(p=>p.onclick=()=>{
    S.subj=p.dataset.s;document.querySelectorAll('.pill.ts').forEach(x=>x.classList.remove('on'));p.classList.add('on');renderGrids();
  });

  document.addEventListener('click',e=>{
    const c=e.target.closest('.card');
    if(c){const u=parseInt(c.dataset.u),tp=c.dataset.tp||'mcq',cid=c.dataset.cid;
      if(cid==='ut-grid')startUnitTest(u);else startPractice(S.subj,tp,u);}
  });

  document.querySelectorAll('.tcard').forEach(c=>c.onclick=()=>{
    const tt=c.dataset.tt;
    if(tt==='unit'){const pk=$('ut-pick');pk.style.display=pk.style.display==='none'?'block':'none';renderGrids();}
    else startTest(tt);
  });

  $('qch').addEventListener('click',e=>{const b=e.target.closest('.ch');if(b&&!b.disabled)clickChoice(b.dataset.l);});
  $('frq-btn').onclick=()=>{const q=S.qs[S.idx];if(q){S.rev[q.id]=true;renderQ();}};
  $('next-btn').onclick=nextQ;
  $('prev-btn').onclick=prevQ;
  $('go-back').onclick=goHome;
  $('rs-home').onclick=goHome;
  $('rs-rev').onclick=()=>{S.review=true;S.idx=0;show('s-q');renderQ();};

  document.addEventListener('keydown',e=>{
    if(!$('s-q').classList.contains('on'))return;
    if(e.key>='a'&&e.key<='e')clickChoice(e.key.toUpperCase());
    else if(e.key>='A'&&e.key<='E')clickChoice(e.key);
    else if(e.key==='ArrowRight'||e.key==='Enter'||e.key===' '){e.preventDefault();nextQ();}
    else if(e.key==='ArrowLeft')prevQ();
    else if(e.key==='Escape')goHome();
  });

  renderGrids();updStats();
});
