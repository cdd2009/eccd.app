/**
 * eccd.app v4 — Bluebook AP Exam Interface
 */
const S={subj:'micro',tab:'practice',mode:null,qtype:'mcq',unit:0,qs:[],idx:0,
  ans:{},sel:{},checked:{},rev:{},review:false,timerI:null,timerS:0,timerT:0,
  flags:{},crossouts:{},timerHidden:false,frqText:{},navOpen:false};

function D(s,t){if(s==='micro'&&t==='mcq')return MICRO_MCQ;if(s==='macro'&&t==='mcq')return MACRO_MCQ;if(s==='micro'&&t==='frq')return MICRO_FRQ;if(s==='macro'&&t==='frq')return MACRO_FRQ;return[];}
function unitQs(s,t,u){return D(s,t).filter(q=>q.unit===u);}
function unitCounts(s,t){const c={};for(const q of D(s,t))c[q.unit||0]=(c[q.unit||0]||0)+1;return c;}
const NAMES={micro:{1:"Basic Economic Concepts",2:"Supply and Demand",3:"Production, Cost & Perfect Competition",4:"Imperfect Competition",5:"Factor Markets",6:"Market Failure & Gov't Role"},macro:{1:"Basic Economic Concepts",2:"Economic Indicators & Business Cycle",3:"National Income & Price Determination",4:"Financial Sector",5:"Stabilization Policies",6:"Open Economy & Int'l Trade"}};

function genExplanation(q){if(!q.correctAnswer||q.type!=='mcq')return'';const c=q.choices.find(x=>x.letter===q.correctAnswer);return c?`<div class="expl-label">Correct Answer</div><strong>${q.correctAnswer}. ${c.text}</strong>`:'';}

function splitFrqContent(q){
  const markers=['The response accurately','The response states','The response calculates','The response explains','The response identifies','The response draws','The response includes','The response shows','The response indicates','The response correctly','The response uses','Student receives','1 point:','1 point is','One point is','Scoring guidelines'];
  let qt=q.questionHtml||q.question||'',rb=q.answerHtml||q.answer||'';
  for(const k of markers){
    const i=qt.indexOf(k);
    if(i>80){
      let splitAt=i;
      const before=qt.substring(Math.max(0,i-80),i);
      for(const tag of ['</p>','</li>','</ol>','</div>']){
        const ti=before.lastIndexOf(tag);
        if(ti>-1){splitAt=Math.max(0,i-80)+ti+tag.length;break;}
      }
      const extracted=qt.substring(splitAt);
      qt=qt.substring(0,splitAt);
      if(!rb||rb==='Rubric:'||rb.trim().length<20)rb=extracted;
      break;
    }
  }
  for(const k of markers){if(qt.trimStart().startsWith(k)){rb=qt;qt='';break;}}
  return{question:qt,rubric:rb};
}

function processImages(html){
  if(!html)return html;
  return html.replace(/<img([^>]*)>/gi,(match,attrs)=>{
    const altM=attrs.match(/alt="([^"]*)"/),srcM=attrs.match(/src="([^"]*)"/);
    const alt=altM?altM[1]:'',src=srcM?srcM[1]:'';
    if(!alt&&!src)return match;
    let r='';
    if(src){r+=`<img src="${src}" alt="${alt||'Question image'}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" style="max-width:100%;display:block;margin:12px 0;border-radius:4px;">`;if(alt&&alt.length>20)r+=`<div class="img-desc" style="display:none">${alt}</div>`;}
    else if(alt&&alt.length>20)r+=`<div class="img-desc">${alt}</div>`;
    return r;
  });
}

// Progress
function loadP(){try{return JSON.parse(localStorage.getItem('eccd_p')||'{}')}catch{return{}}}
function saveAns(id,letter,ok){const p=loadP();if(!p.a)p.a={};if(!p.s)p.s={c:0,t:0,k:0,bk:0};const n=!p.a[id];p.a[id]={l:letter,ok,ts:Date.now()};if(n){p.s.t++;if(ok){p.s.c++;p.s.k++;if(p.s.k>p.s.bk)p.s.bk=p.s.k;}else p.s.k=0;}localStorage.setItem('eccd_p',JSON.stringify(p));updStats();}
function getStats(){const p=loadP();return p.s||{c:0,t:0,k:0,bk:0};}
function unitProg(s,t,u){const p=loadP(),a=p.a||{},qs=unitQs(s,t,u);let att=0,ok=0;for(const q of qs){if(a[q.id]){att++;if(a[q.id].ok)ok++;}}return{att,ok,tot:qs.length};}
function missedQs(s){const p=loadP(),a=p.a||{};return D(s,'mcq').filter(q=>a[q.id]&&!a[q.id].ok);}

// UI
function $(id){return document.getElementById(id);}
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));$(id).classList.add('on');}
function updStats(){const s=getStats(),acc=s.t>0?Math.round(s.c/s.t*100):0;$('sv-att').textContent=s.t;$('sv-acc').textContent=s.t>0?acc+'%':'—';const sn=$('sv-str');if(sn){const n=sn.querySelector('.streak-num');if(n)n.textContent=s.k;}$('nav-acc').textContent=s.t>0?acc+'%':'';$('nav-fire').textContent=s.k>0?s.k+'':'';}
function setSubj(s){S.subj=s;document.querySelectorAll('.pill:not(.ts)').forEach(p=>p.classList.toggle('on',p.dataset.s===s));document.querySelectorAll('.pill.ts').forEach(p=>p.classList.toggle('on',p.dataset.s===s));renderGrids();}
function renderGrids(){renderGrid('mcq-grid',S.subj,'mcq');renderGrid('frq-grid',S.subj,'frq');renderGrid('ut-grid',S.subj,'mcq');}
function renderGrid(id,subj,type){const el=$(id);if(!el)return;const counts=unitCounts(subj,type),names=NAMES[subj],cls=subj==='micro'?'mi':'ma';let h='';for(let u=1;u<=6;u++){const c=counts[u]||0;if(!c)continue;const pr=unitProg(subj,type,u),pct=pr.tot>0?Math.round(pr.att/pr.tot*100):0;h+=`<div class="card" data-u="${u}" data-tp="${type}" data-cid="${id}"><div class="card-num">Unit ${u}</div><div class="card-title">${names[u]||'General'}</div><div class="card-meta"><span class="card-count">${c} questions</span><div class="pbar"><div class="pfill" style="width:${pct}%"></div></div></div></div>`;}const mx=counts[0]||0;if(mx>0){const pr=unitProg(subj,type,0),pct=pr.tot>0?Math.round(pr.att/pr.tot*100):0;h+=`<div class="card" data-u="0" data-tp="${type}" data-cid="${id}"><div class="card-num">Mixed</div><div class="card-title">General / Unclassified</div><div class="card-meta"><span class="card-count">${mx} questions</span><div class="pbar"><div class="pfill" style="width:${pct}%"></div></div></div></div>`;}el.innerHTML=h;el.className=`grid ${cls}`;}

// Exam mode
function enterExam(){document.body.classList.add('exam-mode');document.documentElement.style.colorScheme='light';$('cb-exam-name').textContent=S.subj==='micro'?'AP Microeconomics':'AP Macroeconomics';}
function exitExam(){document.body.classList.remove('exam-mode');document.documentElement.style.colorScheme='dark';S.flags={};S.crossouts={};S.frqText={};S.navOpen=false;$('cb-nav-popup').style.display='none';}

// Save/Resume session
function saveSession(){
  const sess={subj:S.subj,mode:S.mode,qtype:S.qtype,unit:S.unit,idx:S.idx,
    qIds:S.qs.map(q=>q.id),ans:S.ans,sel:S.sel,checked:S.checked,
    flags:S.flags,crossouts:S.crossouts,frqText:S.frqText,
    timerS:S.timerS,timerT:S.timerT,ts:Date.now()};
  localStorage.setItem('eccd_session',JSON.stringify(sess));
}
function clearSession(){localStorage.removeItem('eccd_session');}
function loadSession(){
  try{const raw=localStorage.getItem('eccd_session');if(!raw)return null;return JSON.parse(raw);}catch{return null;}
}
function resumeSession(sess){
  S.subj=sess.subj;S.mode=sess.mode;S.qtype=sess.qtype;S.unit=sess.unit;S.idx=sess.idx;
  const allQs=D(sess.subj,sess.qtype);
  S.qs=sess.qIds.map(id=>allQs.find(q=>q.id===id)).filter(Boolean);
  if(!S.qs.length){clearSession();return false;}
  S.ans=sess.ans||{};S.sel=sess.sel||{};S.checked=sess.checked||{};
  S.flags=sess.flags||{};S.crossouts=sess.crossouts||{};S.frqText=sess.frqText||{};
  S.review=false;S.rev={};
  enterExam();
  if(sess.timerT>0&&sess.timerS>0){startTimer(sess.timerS);$('cb-timer').style.display='flex';}
  else $('cb-timer').style.display='none';
  show('s-q');renderQ();return true;
}
function saveAndExit(){
  const q=S.qs[S.idx];
  if(q&&q.type==='frq'){const ta=$('cb-frq-ta');if(ta)S.frqText[q.id]=ta.value;}
  saveSession();stopTimer();exitExam();S.mode=null;S.qs=[];S.review=false;
  renderGrids();updStats();show('s-home');
}

// Navigator popup
function renderNav(){
  const g=$('cb-popup-grid');if(!g)return;let h='';
  for(let i=0;i<S.qs.length;i++){let c='cb-qn';if(i===S.idx)c+=' cur';if(S.sel[S.qs[i].id]||S.ans[S.qs[i].id])c+=' ans';if(S.flags[S.qs[i].id])c+=' flag';h+=`<button class="${c}" data-qi="${i}">${i+1}</button>`;}
  g.innerHTML=h;
}
function toggleNav(){S.navOpen=!S.navOpen;$('cb-nav-popup').style.display=S.navOpen?'block':'none';if(S.navOpen)renderNav();}

// Start
function startPractice(subj,type,unit){const qs=unitQs(subj,type,unit);if(!qs.length)return;S.mode='practice';S.qtype=type;S.unit=unit;S.qs=[...qs];S.idx=0;S.ans={};S.sel={};S.checked={};S.rev={};S.review=false;S.flags={};S.crossouts={};S.frqText={};stopTimer();$('cb-timer').style.display='none';enterExam();show('s-q');renderQ();}
function startTest(tt){const mcq=D(S.subj,'mcq');let qs,mins;if(tt==='full'){qs=shuf([...mcq]).slice(0,60);mins=70;}else if(tt==='quick'){qs=shuf([...mcq]).slice(0,20);mins=25;}else if(tt==='missed'){qs=shuf(missedQs(S.subj));if(!qs.length){alert('No missed questions!');return;}mins=0;}else return;S.mode='test-'+tt;S.qtype='mcq';S.qs=qs;S.idx=0;S.ans={};S.sel={};S.checked={};S.rev={};S.review=false;S.flags={};S.crossouts={};S.frqText={};enterExam();if(mins>0){startTimer(mins*60);$('cb-timer').style.display='flex';}else $('cb-timer').style.display='none';show('s-q');renderQ();}
function startUnitTest(u){const qs=shuf([...unitQs(S.subj,'mcq',u)]);if(!qs.length)return;S.mode='test-unit';S.qtype='mcq';S.unit=u;S.qs=qs;S.idx=0;S.ans={};S.sel={};S.checked={};S.rev={};S.review=false;S.flags={};S.crossouts={};S.frqText={};enterExam();$('cb-timer').style.display='none';show('s-q');renderQ();}

// Render
function renderQ(){
  const q=S.qs[S.idx];if(!q)return;
  const isTest=S.mode&&S.mode.startsWith('test');
  $('cb-q-number').textContent=`Question ${S.idx+1}`;
  $('cb-q-indicator').textContent=`Question ${S.idx+1} of ${S.qs.length} ▲`;

  // Flag
  const fb=$('cb-flag-btn');fb.classList.toggle('flagged',!!S.flags[q.id]);fb.classList.remove('active');

  const chEl=$('cb-choices'),frqZ=$('cb-frq-zone'),fbEl=$('cb-feedback'),exEl=$('cb-explanation'),ckBtn=$('cb-check-btn');
  fbEl.style.display='none';exEl.style.display='none';ckBtn.style.display='none';

  if(q.type==='mcq'){
    // Question text
    $('cb-q-stem').innerHTML=processImages(q.questionHtml||escHtml(q.question));
    frqZ.style.display='none';chEl.style.display='flex';
    const checked=S.checked[q.id],selected=S.sel[q.id],ua=S.ans[q.id],done=!!checked;
    const xo=S.crossouts[q.id]||{};
    let ch='';
    for(const c of q.choices){
      let cls='cb-ch';
      if(done){cls+=' dis';if(c.letter===q.correctAnswer)cls+=' ok';if(c.letter===ua&&ua!==q.correctAnswer)cls+=' no';}
      else if(selected===c.letter)cls+=' sel';
      if(xo[c.letter])cls+=' crossed';
      const txt=c.html?processImages(c.html):escHtml(c.text);
      const xBtn=done?'':`<button class="cb-ch-x" data-xl="${c.letter}" title="Cross out">✕</button>`;
      ch+=`<button class="${cls}" data-l="${c.letter}" ${done?'disabled':''}><span class="cb-radio"></span><span class="cb-letter">${c.letter}.</span><span class="cb-ch-text">${txt}</span>${xBtn}</button>`;
    }
    chEl.innerHTML=ch;
    if(done){ckBtn.style.display='none';}else{ckBtn.style.display=selected?'block':'none';}
    if(done){
      const ok=ua===q.correctAnswer;
      fbEl.style.display='block';fbEl.innerHTML=`<div class="fb ${ok?'ok':'no'}">${ok?'✓ Correct':'✗ Incorrect — Answer: '+q.correctAnswer}</div>`;
      const ex=genExplanation(q);if(ex){exEl.style.display='block';exEl.innerHTML=`<div class="expl">${ex}</div>`;}
    }
  } else {
    chEl.style.display='none';frqZ.style.display='block';
    const parts=splitFrqContent(q);
    $('cb-q-stem').innerHTML=processImages(parts.question);
    $('cb-frq-ta').value=S.frqText[q.id]||'';
    ckBtn.style.display='none';
    const rb=$('cb-reveal-btn'),ad=$('cb-rubric');
    if(S.rev[q.id]){rb.style.display='none';ad.style.display='block';ad.innerHTML=`<h4>Scoring Guidelines</h4>${processImages(parts.rubric)||'<em>No rubric available</em>'}`;}
    else{rb.style.display='flex';ad.style.display='none';}
  }

  $('cb-back-btn').style.visibility=S.idx>0?'visible':'hidden';
  const nb=$('cb-next-btn');nb.innerHTML=S.idx===S.qs.length-1?(isTest?'Finish <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>':'Finish <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'):'Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';
  if(S.navOpen)renderNav();
}

// Interaction
function clickChoice(l){const q=S.qs[S.idx];if(!q||S.checked[q.id])return;S.sel[q.id]=l;renderQ();}
function crossOut(l){const q=S.qs[S.idx];if(!q||S.checked[q.id])return;if(!S.crossouts[q.id])S.crossouts[q.id]={};S.crossouts[q.id][l]=!S.crossouts[q.id][l];if(S.sel[q.id]===l)delete S.sel[q.id];renderQ();}
function checkAnswer(){const q=S.qs[S.idx];if(!q||S.checked[q.id])return;const l=S.sel[q.id];if(!l)return;S.ans[q.id]=l;S.checked[q.id]=true;if(!S.review)saveAns(q.id,l,l===q.correctAnswer);renderQ();}
function toggleFlag(){const q=S.qs[S.idx];if(!q)return;S.flags[q.id]=!S.flags[q.id];renderQ();}
function nextQ(){const q=S.qs[S.idx],isTest=S.mode&&S.mode.startsWith('test');if(q&&q.type==='frq'){const ta=$('cb-frq-ta');if(ta)S.frqText[q.id]=ta.value;}if(S.idx<S.qs.length-1){S.idx++;renderQ();document.querySelector('.cb-main').scrollTop=0;}else{if(isTest)showSubmitModal();else finish();}}
function prevQ(){const q=S.qs[S.idx];if(q&&q.type==='frq'){const ta=$('cb-frq-ta');if(ta)S.frqText[q.id]=ta.value;}if(S.idx>0){S.idx--;renderQ();}}

// Submit
function showSubmitModal(){let a=0,u=0,f=0;for(const q of S.qs){if(S.sel[q.id]||S.ans[q.id])a++;else u++;if(S.flags[q.id])f++;}$('cb-modal-body').innerHTML=`<div class="ms"><span>Total Questions</span><span class="mv">${S.qs.length}</span></div><div class="ms"><span>Answered</span><span class="mv g">${a}</span></div><div class="ms"><span>Unanswered</span><span class="mv ${u>0?'r':''}">${u}</span></div><div class="ms"><span>Flagged for Review</span><span class="mv ${f>0?'o':''}">${f}</span></div>`;$('cb-submit-modal').style.display='flex';}
function hideModal(){$('cb-submit-modal').style.display='none';}
function reviewUnanswered(){hideModal();for(let i=0;i<S.qs.length;i++){if(!S.sel[S.qs[i].id]&&!S.ans[S.qs[i].id]){S.idx=i;renderQ();return;}}}

// Results
function finish(){stopTimer();hideModal();clearSession();if(S.qtype==='frq'&&!(S.mode&&S.mode.startsWith('test'))){goHome();return;}let ok=0,tot=0;const uStats={};for(const q of S.qs){if(q.type==='mcq'){tot++;const sel=S.ans[q.id]||S.sel[q.id];const c=sel===q.correctAnswer;if(c)ok++;const u=q.unit||0;if(!uStats[u])uStats[u]={ok:0,tot:0};uStats[u].tot++;if(c)uStats[u].ok++;}}const pct=tot>0?Math.round(ok/tot*100):0;exitExam();$('rs-score').textContent=pct+'%';$('rs-label').textContent=S.mode&&S.mode.startsWith('test')?'Test Complete':'Practice Complete';$('rs-ok').textContent=ok;$('rs-no').textContent=tot-ok;$('rs-tot').textContent=tot;const apEl=$('rs-ap');if(S.mode&&S.mode.startsWith('test')&&tot>=20){let ap=1;if(pct>=78)ap=5;else if(pct>=63)ap=4;else if(pct>=47)ap=3;else if(pct>=33)ap=2;$('rs-ap-val').textContent=ap;apEl.style.display='block';}else apEl.style.display='none';const ubEl=$('rs-units'),names=NAMES[S.subj],units=Object.keys(uStats).sort((a,b)=>a-b);if(units.length>1){let uh='';for(const u of units){const us=uStats[u],upct=us.tot>0?Math.round(us.ok/us.tot*100):0;const cls=upct>=70?'good':upct>=40?'mid':'bad';const name=u>0?(names[u]||`Unit ${u}`):'Mixed';uh+=`<div class="res-unit-row"><span class="res-unit-name">${u>0?'U'+u+': ':''}${name}</span><div class="res-unit-bar-wrap"><div class="res-unit-bar ${cls}" style="width:${upct}%"></div></div><span class="res-unit-score">${us.ok}/${us.tot}</span></div>`;}ubEl.innerHTML=uh;ubEl.style.display='block';}else ubEl.style.display='none';show('s-res');}
function goHome(){stopTimer();exitExam();clearSession();S.mode=null;S.qs=[];S.review=false;renderGrids();updStats();show('s-home');}

// Timer
function startTimer(t){S.timerS=t;S.timerT=t;S.timerHidden=false;updTimer();S.timerI=setInterval(()=>{S.timerS--;updTimer();if(S.timerS<=0){stopTimer();finish();}},1000);}
function stopTimer(){if(S.timerI){clearInterval(S.timerI);S.timerI=null;}}
function updTimer(){const m=Math.floor(S.timerS/60),s=S.timerS%60;$('cb-time-val').textContent=S.timerHidden?'--:--':`${m}:${s.toString().padStart(2,'0')}`;const td=$('cb-timer');td.classList.remove('warn','crit');if(S.timerS<120)td.classList.add('crit');else if(S.timerS<300)td.classList.add('warn');}

function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
// Papers
function getPapers(subj){return subj==='micro'?(typeof MICRO_PAPERS!=='undefined'?MICRO_PAPERS:[]):(typeof MACRO_PAPERS!=='undefined'?MACRO_PAPERS:[]);}
function renderPapers(){
  const el=$('papers-grid');if(!el)return;
  const papers=getPapers(S.subj),cls=S.subj==='micro'?'mi':'ma';
  if(!papers.length){el.innerHTML='<div class="empty"><div class="empty-title">No papers available</div></div>';return;}
  let h='';for(const p of papers.sort((a,b)=>b.year-a.year)){
    h+=`<div class="paper-card ${cls}" data-yr="${p.year}" data-ps="${p.subject}" tabindex="0" role="button">`
      +`<div class="paper-year">${p.year}</div>`
      +`<div class="paper-title">AP ${S.subj==='micro'?'Microeconomics':'Macroeconomics'}</div>`
      +`<div class="paper-meta">${p.questionCount} MCQs · 70 min</div>`
      +`<div class="paper-badge">Released Exam</div></div>`;}
  el.innerHTML=h;
  el.querySelectorAll('.paper-card').forEach(c=>c.onclick=()=>startPaper(c.dataset.ps,parseInt(c.dataset.yr)));
}
function startPaper(subj,year){
  const papers=getPapers(subj),paper=papers.find(p=>p.year===year);
  if(!paper||!paper.questions.length)return;
  S.subj=subj;S.mode='paper-'+year;S.qtype='mcq';S.unit=0;
  S.qs=[...paper.questions];S.idx=0;
  S.ans={};S.sel={};S.checked={};S.rev={};S.review=false;
  S.flags={};S.crossouts={};S.frqText={};
  enterExam();startTimer(70*60);$('cb-timer').style.display='flex';
  show('s-q');renderQ();
}

// Events
document.addEventListener('DOMContentLoaded',()=>{
  $('logo').onclick=goHome;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');S.tab=t.dataset.t;if(t.dataset.t==='practice')goHome();else if(t.dataset.t==='test'){show('s-test');$('ut-pick').style.display='none';renderGrids();}else if(t.dataset.t==='papers'){show('s-papers');renderPapers();}else if(t.dataset.t==='notes')show('s-notes');});
  document.querySelectorAll('.pill:not(.ts):not(.pp)').forEach(p=>p.onclick=()=>setSubj(p.dataset.s));
  document.querySelectorAll('.pill.ts').forEach(p=>p.onclick=()=>{S.subj=p.dataset.s;document.querySelectorAll('.pill.ts').forEach(x=>x.classList.remove('on'));p.classList.add('on');renderGrids();});
  document.querySelectorAll('.pill.pp').forEach(p=>p.onclick=()=>{S.subj=p.dataset.s;document.querySelectorAll('.pill.pp').forEach(x=>x.classList.remove('on'));p.classList.add('on');renderPapers();});
  document.addEventListener('click',e=>{const c=e.target.closest('.card');if(c){const u=parseInt(c.dataset.u),tp=c.dataset.tp||'mcq',cid=c.dataset.cid;if(cid==='ut-grid')startUnitTest(u);else startPractice(S.subj,tp,u);}});
  document.querySelectorAll('.tcard').forEach(c=>c.onclick=()=>{const tt=c.dataset.tt;if(tt==='unit'){const pk=$('ut-pick');pk.style.display=pk.style.display==='none'?'block':'none';renderGrids();}else startTest(tt);});

  // Exam events
  $('cb-choices').addEventListener('click',e=>{const xb=e.target.closest('.cb-ch-x');if(xb){e.stopPropagation();crossOut(xb.dataset.xl);return;}const b=e.target.closest('.cb-ch');if(b&&!b.disabled)clickChoice(b.dataset.l);});
  $('cb-check-btn').onclick=checkAnswer;
  $('cb-reveal-btn').onclick=()=>{const q=S.qs[S.idx];if(q){S.rev[q.id]=true;renderQ();}};
  $('cb-next-btn').onclick=nextQ;
  $('cb-back-btn').onclick=prevQ;
  $('cb-flag-btn').onclick=toggleFlag;
  $('cb-q-indicator').onclick=toggleNav;
  $('cb-popup-close').onclick=()=>{S.navOpen=false;$('cb-nav-popup').style.display='none';};
  $('cb-popup-grid').addEventListener('click',e=>{const b=e.target.closest('.cb-qn');if(b){S.idx=parseInt(b.dataset.qi);S.navOpen=false;$('cb-nav-popup').style.display='none';renderQ();}});
  $('cb-popup-review').onclick=reviewUnanswered;
  $('cb-finish-btn').onclick=saveAndExit;
  $('cb-timer-hide').onclick=()=>{S.timerHidden=!S.timerHidden;updTimer();};
  $('cb-modal-x').onclick=hideModal;
  $('cb-modal-review').onclick=reviewUnanswered;
  $('cb-modal-submit').onclick=finish;
  $('rs-home').onclick=goHome;
  $('rs-rev').onclick=()=>{S.review=true;S.idx=0;enterExam();show('s-q');renderQ();};

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(!$('s-q').classList.contains('on'))return;
    if($('cb-submit-modal').style.display==='flex')return;
    if(document.activeElement&&document.activeElement.tagName==='TEXTAREA')return;
    if(e.key>='a'&&e.key<='e')clickChoice(e.key.toUpperCase());
    else if(e.key>='A'&&e.key<='E')clickChoice(e.key);
    else if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();nextQ();}
    else if(e.key==='ArrowLeft')prevQ();
    else if(e.key==='Escape')goHome();
    else if(e.key==='f'||e.key==='F')toggleFlag();
  });

  renderGrids();updStats();

  // Check for saved session
  const sess=loadSession();
  if(sess&&sess.qIds&&sess.qIds.length>0){
    const age=Date.now()-sess.ts;
    if(age<86400000){ // less than 24h old
      if(confirm('You have a saved session. Resume where you left off?')){
        resumeSession(sess);
      } else {
        clearSession();
      }
    } else clearSession();
  }
});
