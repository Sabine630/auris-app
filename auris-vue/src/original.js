// --- Script Block 1 ---
// 在頁面渲染前同步設定背景色，避免 PWA 底部閃出預設底色
// P22 修正：indexedDB 回傳的是 object，要取 .value 才是主題名稱
(function(){
  var THEME_BG={cream:'#f7f5f2',warm:'#ede8e0',dark:'#0f0e0d',gray:'#f0eef2',ocean:'#eef2f5',matcha:'#eff3ee'};
  function applyBg(bg){
    document.documentElement.style.background=bg;
    document.body&&(document.body.style.background=bg);
  }
  // 先試讀 localStorage 快取（同步、最快）
  try{
    var cached=localStorage.getItem('auris-theme');
    if(cached&&THEME_BG[cached]){applyBg(THEME_BG[cached]);}
  }catch(e){}
  // 再讀 indexedDB 校正
  try{
    var req=indexedDB.open('auris',1);
    req.onsuccess=function(e){
      try{
        var db=e.target.result;
        if(!db.objectStoreNames.contains('settings'))return;
        var tx=db.transaction('settings','readonly');
        var s=tx.objectStore('settings');
        var g=s.get('theme');
        g.onsuccess=function(ev){
          var r=ev.target.result;
          // 修正：r 可能是字串、可能是 {key,value} 物件
          var t=(r&&typeof r==='object')?(r.value||r.theme||r.name):r;
          if(t&&THEME_BG[t]){
            applyBg(THEME_BG[t]);
            try{localStorage.setItem('auris-theme',t);}catch(e){}
          }
        };
      }catch(err){}
    };
  }catch(err){}
})();

// --- Script Block 2 ---
/* ═══════════════════════════════
   密碼鎖 ★ 改這裡
═══════════════════════════════ */
const PWD='auris2025';
function unlock(){
  const v=I('lk-in').value,e=I('lk-err'),i=I('lk-in');
  if(v===PWD){
    I('lock').classList.add('hidden');
    sessionStorage.setItem('au','1');
    localStorage.setItem('au_local','1');
  }
  else{i.classList.add('err');e.textContent='密碼錯誤';setTimeout(()=>i.classList.remove('err'),400);i.value='';i.focus()}
}

/* ═══════════════════════════════
   工具
═══════════════════════════════ */
function I(id){return document.getElementById(id)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmtT(ts){const d=new Date(ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}

if(sessionStorage.getItem('au')==='1'||localStorage.getItem('au_local')==='1')I('lock').classList.add('hidden');
function timeAgo(ts){const s=(Date.now()-ts)/1000;if(s<60)return '剛剛';if(s<3600)return Math.floor(s/60)+'分鐘前';if(s<86400)return Math.floor(s/3600)+'小時前';return Math.floor(s/86400)+'天前'}

/* ═══════════════════════════════
   時鐘
═══════════════════════════════ */
function tick(){
  const n=new Date(),h=n.getHours(),m=n.getMinutes().toString().padStart(2,'0');
  I('clock').textContent=h+':'+m;
  I('greet').textContent=h<5?'深夜了':h<12?'Good morning':h<18?'Good afternoon':'Good evening';
}
tick();setInterval(tick,10000);

/* ═══════════════════════════════
   頁面導航
═══════════════════════════════ */
let cur='pg-home',stk=[];
function nav_(id){
  if(id===cur)return;
  const p=I(cur),n=I(id);if(!n)return;
  p.classList.remove('active');p.classList.add('exit');
  setTimeout(()=>p.classList.remove('exit'),300);
  n.classList.add('active');stk.push(cur);cur=id;syncNav(id);
  // 聊天室頁面隱藏導覽列
  const navEl=document.querySelector('.nav');
  if(id==='pg-chat-room'||id==='pg-group-room'){
    navEl.style.display='none';
  } else {
    navEl.style.display='flex';
  }
  if(id==='pg-char-manage')renderCharList();
  if(id==='pg-chat-list')renderChatList();
  if(id==='pg-api')loadApiPage();
  if(id==='pg-settings')updateSettingsUI();
  if(id==='pg-me')loadMePage();
  if(id==='pg-blackbox')renderBlackbox();
  if(id==='pg-notifications')renderNotifications();
  if(id==='pg-group-list')renderGroupList();
  if(id==='pg-group-create')renderGroupCreate();
  // 進入生成頁時主動解鎖，避免 PWA 從背景恢復、上次 fetch 未完成導致鎖卡住
  if(id==='pg-moments'){postGenning=false;renderMomentsPage();}
  if(id==='pg-diary'){diaryGenning=false;renderDiaryPage();}
  if(id==='pg-dream'){dreamGenning=false;renderDreamPage();}
}
function back(){
  if(!stk.length)return;
  const t=stk.pop();
  const leaving=cur;
  I(cur).classList.remove('active');I(t).classList.add('active');
  cur=t;syncNav(t);
  // 離開聊天室時重置 typing 狀態，避免下次進入按鈕殘留 disabled
  if(leaving==='pg-chat-room'){
    aiTyping=false;
    const sendBtn=I('chat-send');if(sendBtn)sendBtn.disabled=false;
    // 移除殘留的 typing indicator
    const typingEl=I('typing');if(typingEl)typingEl.remove();
    // 移除殘留的長按 action sheet
    document.querySelectorAll('.msg-sheet,.msg-sheet-mask').forEach(el=>el.remove());
  }
  if(leaving==='pg-group-room'){
    grpTyping=false;
    const grpBtn=I('grp-send');if(grpBtn)grpBtn.disabled=false;
    document.querySelectorAll('[id^="grp-typing-"]').forEach(el=>el.remove());
  }
  // 根據返回的頁面決定是否顯示導覽列
  const navEl=document.querySelector('.nav');
  if(t==='pg-chat-room'||t==='pg-group-room'){
    navEl.style.display='none';
  } else {
    navEl.style.display='flex';
  }
}
function tab(t){
  stk=[];
  const m={home:'pg-home',chat:'pg-chat-list',moments:'pg-moments',settings:'pg-settings'};
  if(m[t])nav_(m[t]);
}
function syncNav(id){
  document.querySelectorAll('.ni').forEach(e=>e.classList.remove('active'));
  const m={'pg-home':'n-home','pg-chat-list':'n-chat','pg-chat-room':'n-chat','pg-moments':'n-moments','pg-post-detail':'n-moments','pg-group-list':'n-chat','pg-group-room':'n-chat','pg-group-create':'n-chat','pg-settings':'n-settings'};
  if(m[id])I(m[id]).classList.add('active');
}

/* ═══════════════════════════════
   Toast
═══════════════════════════════ */
let tt;
function toast_(msg,ms){const t=I('toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),ms||4500)}

/* ═══════════════════════════════
   主題系統
═══════════════════════════════ */
const THEMES=[
  {id:'cream', name:'奶白', bg:'#f7f5f2', surface:'#fff',    rose:'#c9887a', text:'#2a2420'},
  {id:'warm',  name:'暖米', bg:'#ede8e0', surface:'#f7f3ee', rose:'#b8705e', text:'#1e1a16'},
  {id:'dark',  name:'深夜', bg:'#0f0e0d', surface:'#1a1816', rose:'#d49080', text:'#e8ddd8'},
  {id:'gray',  name:'霧灰', bg:'#f0eef2', surface:'#fafafa', rose:'#9a8fa0', text:'#1e1c22'},
  {id:'ocean', name:'海霧', bg:'#eef2f5', surface:'#f8fbfc', rose:'#5b8fa8', text:'#0e1e28'},
  {id:'matcha',name:'抹茶', bg:'#eff3ee', surface:'#f8fbf8', rose:'#6a9272', text:'#0e1e12'},
];
let curTheme='cream';

function applyTheme(id){
  curTheme=id;
  // P22 修正：cream 也設成 'cream' 字串，不要空字串（不然 [data-theme="cream"] 失效）
  I('phone').setAttribute('data-theme',id);
  // 同步更新 html/body 背景色和 theme-color meta
  const t=THEMES.find(t=>t.id===id)||THEMES[0];
  document.documentElement.style.background=t.bg;
  document.body.style.background=t.bg;
  const tcMeta=document.getElementById('theme-color-meta');
  if(tcMeta)tcMeta.setAttribute('content',t.bg);
  setSetting('theme',id);
  // P22 新增：同步寫 localStorage，給開頭預載 script 使用
  try{localStorage.setItem('auris-theme',id);}catch(e){}
  renderThemePicker();
}

function renderThemePicker(){
  const el=I('theme-picker');if(!el)return;
  el.innerHTML=THEMES.map(t=>`
    <div class="theme-opt${curTheme===t.id?' sel':''}" onclick="applyTheme('${t.id}')">
      <div class="theme-preview" style="background:${t.bg}">
        <div class="theme-preview-dot" style="background:${t.rose}"></div>
        <div class="theme-preview-dot" style="background:${t.text};opacity:.3"></div>
        <div class="theme-preview-dot" style="background:${t.surface};border:1px solid rgba(0,0,0,.08)"></div>
      </div>
      <div class="theme-name">${t.name}</div>
    </div>`).join('');
}

async function loadTheme(){
  const saved=await getSetting('theme')||'cream';
  curTheme=saved;
  I('phone').setAttribute('data-theme',saved==='cream'?'':saved);
  // 同步設定 html/body 背景色
  const t=THEMES.find(t=>t.id===saved)||THEMES[0];
  document.documentElement.style.background=t.bg;
  document.body.style.background=t.bg;
}

/* ═══════════════════════════════
   IndexedDB
═══════════════════════════════ */
let db=null;
function initDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open('auris',3);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      [['characters',[['worldId','worldId']]],['messages',[['charId','charId'],['createdAt','createdAt']]],
       ['memories',[['charId','charId']]],['moments',[['charId','charId'],['createdAt','createdAt']]],
       ['diary',[['charId','charId'],['date','date']]],['dreams',[['charId','charId']]],['worlds',[]],
       ['groups',[]],['group_messages',[['groupId','groupId'],['createdAt','createdAt']]],
      ].forEach(([name,idx])=>{
        if(!d.objectStoreNames.contains(name)){
          const os=d.createObjectStore(name,{keyPath:'id'});
          idx.forEach(([n,k])=>os.createIndex(n,k,{unique:false}));
        }
      });
      if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'});
    };
    r.onsuccess=e=>{db=e.target.result;res(db)};
    r.onerror=e=>{console.error(e);rej(e)};
  });
}
const dbPut=(s,v)=>new Promise((r,j)=>{const tx=db.transaction(s,'readwrite');tx.objectStore(s).put(v).onsuccess=e=>r(e.target.result);tx.onerror=j});
const dbGet=(s,k)=>new Promise((r,j)=>{const tx=db.transaction(s,'readonly');tx.objectStore(s).get(k).onsuccess=e=>r(e.target.result);tx.onerror=j});
const dbAll=(s)=>new Promise((r,j)=>{const tx=db.transaction(s,'readonly');tx.objectStore(s).getAll().onsuccess=e=>r(e.target.result);tx.onerror=j});
const dbIdx=(s,i,v)=>new Promise((r,j)=>{const tx=db.transaction(s,'readonly');tx.objectStore(s).index(i).getAll(v).onsuccess=e=>r(e.target.result);tx.onerror=j});
const dbDel=(s,k)=>new Promise((r,j)=>{const tx=db.transaction(s,'readwrite');tx.objectStore(s).delete(k).onsuccess=()=>r();tx.onerror=j});
const getSetting=async k=>{const r=await dbGet('settings',k);return r?r.value:null};
const setSetting=(k,v)=>dbPut('settings',{key:k,value:v});

// 帶逾時的 fetch（預設 90 秒），避免 API 掛住導致 UI 永遠卡 typing/生成中狀態
// 用法跟原本 fetch 完全一樣，只是回應慢於 timeoutMs 會 reject 一個 'request_timeout' 錯誤
function fetchWithTimeout(url, opts={}, timeoutMs=90000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(url,{...opts,signal:controller.signal})
    .finally(()=>clearTimeout(timer))
    .catch(e=>{
      if(e.name==='AbortError')throw new Error('request_timeout');
      throw e;
    });
}

/* ═══════════════════════════════
   角色設定表單資料
═══════════════════════════════ */
const EMOJIS=['🌸','🌙','⭐','🍀','🎀','🌿','🦋','🌺','💎','🕊️','🌷','🍃','🌻','🍓','🎵','🌊','🦊','🐰','🌈','✨','🍵','📖','🎨','🌑'];
const TAGS=['溫柔','活潑','冷淡','傲嬌','開朗','內斂','毒舌','體貼','可愛','成熟','文藝','神秘','霸道','腹黑','元氣','憂鬱'];
const STYLES=[{v:'casual',l:'輕鬆日常'},{v:'sweet',l:'甜蜜撒嬌'},{v:'cool',l:'冷靜高冷'},{v:'gentle',l:'溫柔體貼'},{v:'playful',l:'活潑俏皮'},{v:'mature',l:'成熟穩重'},{v:'literary',l:'文藝感性'}];
const TALKATIVE=[{v:'quiet',l:'話很少'},{v:'mid',l:'適中'},{v:'lots',l:'話很多'}];
const CONFLICT=[{v:'direct',l:'直接表達'},{v:'cold',l:'冷戰迴避'},{v:'cute',l:'撒嬌化解'},{v:'rational',l:'理性溝通'}];
const CARE=[{v:'rarely',l:'幾乎不主動'},{v:'sometimes',l:'偶爾'},{v:'often',l:'經常'}];
const RELATIONS=[{v:'lover',l:'戀人'},{v:'childhood',l:'青梅竹馬'},{v:'friend',l:'好友'},{v:'online',l:'網友'},{v:'colleague',l:'同事'},{v:'stranger',l:'陌生人'}];
const REPLY_MODES=[{v:'manual',l:'手動'},{v:'auto',l:'自動'},{v:'auto-interrupt',l:'自動可打斷'}];
const LANGS=[{v:'zh-tw',l:'繁體中文'},{v:'zh-cn',l:'簡體中文'},{v:'en',l:'English'},{v:'ja',l:'日本語'},{v:'ko',l:'한국어'}];
const DEFAULT_STORIES=[
  {id:'s_childhood',icon:'🌱',title:'童年與家庭',ph:'成長環境、家庭關係、童年重要事件…',content:'',custom:false,open:false},
  {id:'s_school',icon:'📚',title:'求學經歷',ph:'學生時代的故事、重要的人、關鍵轉折…',content:'',custom:false,open:false},
  {id:'s_love',icon:'💔',title:'感情史',ph:'曾經的感情、對感情的態度、受過的傷…',content:'',custom:false,open:false},
  {id:'s_turning',icon:'🌀',title:'重要轉折',ph:'改變人生方向的事件、最難忘的經歷…',content:'',custom:false,open:false},
  {id:'s_now',icon:'🏠',title:'現在的生活',ph:'目前的日常、生活節奏、居住狀況…',content:'',custom:false,open:false},
];

// 表單狀態
let editingCharId=null;
let selEmoji='🌸',selTags=[],selStyle='casual',selTalkative='mid';
let selConflict='direct',selCare='sometimes',selRelation='',selReplyMode='manual',selLang='zh-tw';
let storyBlocks=[],customCount=0;

function buildOptGroup(containerId,options,getVal,cbSet){
  I(containerId).innerHTML=options.map(o=>`<div class="opt-btn${getVal()===o.v?' sel':''}" onclick="selOpt('${containerId}','${o.v}')">${o.l}</div>`).join('');
}
function selOpt(cid,val){
  const map={
    'style-group':{get:()=>selStyle,set:v=>selStyle=v},
    'talkative-group':{get:()=>selTalkative,set:v=>selTalkative=v},
    'conflict-group':{get:()=>selConflict,set:v=>selConflict=v},
    'care-group':{get:()=>selCare,set:v=>selCare=v},
    'relation-group':{get:()=>selRelation,set:v=>selRelation=v},
    'reply-mode-group':{get:()=>selReplyMode,set:v=>selReplyMode=v},
    'lang-group':{get:()=>selLang,set:v=>selLang=v},
    'tag-group':{get:()=>null,set:()=>{}},
  };
  if(!map[cid])return;
  map[cid].set(val);
  I(cid).querySelectorAll('.opt-btn').forEach(el=>{
    const optMap={
      'style-group':STYLES,'talkative-group':TALKATIVE,'conflict-group':CONFLICT,
      'care-group':CARE,'relation-group':RELATIONS,'reply-mode-group':REPLY_MODES,'lang-group':LANGS
    };
    const opts=optMap[cid]||[];
    el.classList.toggle('sel',opts.find(o=>o.v===val)?.l===el.textContent);
  });
}

function buildTagGroup(){
  I('tag-group').innerHTML=TAGS.map(t=>`<div class="opt-btn${selTags.includes(t)?' sel':''}" onclick="toggleTag('${t}',this)">${t}</div>`).join('');
  I('tag-count-lbl').textContent=`（已選 ${selTags.length} / 最多 5 個）`;
}
function toggleTag(t,el){
  if(selTags.includes(t)){selTags=selTags.filter(x=>x!==t);el.classList.remove('sel')}
  else if(selTags.length<5){selTags.push(t);el.classList.add('sel')}
  else{toast_('最多選 5 個標籤');return}
  I('tag-count-lbl').textContent=`（已選 ${selTags.length} / 最多 5 個）`;
}

/* ═══ 頭像系統 ═══ */
function toggleAvMenu(){
  const m=I('av-menu');
  I('emoji-picker').classList.remove('open');
  // 重新渲染選單（因為移除圖片按鈕是動態的）
  const hasImg=selEmoji&&selEmoji.startsWith('data:');
  m.innerHTML=`
    <div class="av-menu-item" onclick="triggerAvUpload()">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      從相簿上傳圖片
    </div>
    <div class="av-menu-item" onclick="switchToEmoji()">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      選擇 Emoji
    </div>
    ${hasImg?`<div class="av-menu-item" style="color:var(--red)" onclick="removeAvImg()">
      <svg viewBox="0 0 24 24" style="stroke:var(--red)"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      移除圖片
    </div>`:''}`;
  m.classList.toggle('open');
}
function triggerAvUpload(){
  I('av-menu').classList.remove('open');
  I('av-file-input').click();
}
function switchToEmoji(){
  I('av-menu').classList.remove('open');
  buildEmojiPicker();
  I('emoji-picker').classList.add('open');
}
function removeAvImg(){
  selEmoji=EMOJIS[0];
  updateAvDisplay();
  I('av-menu').classList.remove('open');
  toast_('已移除圖片');
}
function onAvFileChange(e){
  const file=e.target.files[0];
  if(!file)return;
  // 壓縮到 200x200px
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const size=200;
      canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d');
      // 裁切成正方形
      const s=Math.min(img.width,img.height);
      const ox=(img.width-s)/2,oy=(img.height-s)/2;
      ctx.drawImage(img,ox,oy,s,s,0,0,size,size);
      selEmoji=canvas.toDataURL('image/jpeg',0.8);
      updateAvDisplay();
      toast_('頭像已更新');
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  // 清空 input 讓同一張圖可重複選
  e.target.value='';
}
function updateAvDisplay(){
  const circle=I('av-display');
  const emoji=I('av-emoji');
  if(selEmoji&&selEmoji.startsWith('data:')){
    // 圖片模式
    circle.classList.add('has-img');
    let img=circle.querySelector('img');
    if(!img){img=document.createElement('img');circle.insertBefore(img,circle.firstChild)}
    img.src=selEmoji;
    emoji.style.display='none';
  } else {
    // Emoji 模式
    circle.classList.remove('has-img');
    const img=circle.querySelector('img');
    if(img)img.remove();
    emoji.style.display='';
    emoji.textContent=selEmoji||EMOJIS[0];
  }
}

/* Emoji 選擇器 */
function buildEmojiPicker(){
  I('emoji-picker').innerHTML=EMOJIS.map(e=>`<div class="emoji-opt${e===selEmoji?' sel':''}" onclick="pickEmoji('${e}')">${e}</div>`).join('');
}
function pickEmoji(e){
  selEmoji=e;
  updateAvDisplay();
  I('emoji-picker').classList.remove('open');
}

/* 開關 */
function toggleSwitch(id){I(id).classList.toggle('on')}
function toggleOverride(){
  const on=I('tgl-override').classList.contains('on');
  I('override-fields').style.display=on?'block':'none';
}

/* 背景故事 */
function renderStories(){
  I('story-blocks').innerHTML=storyBlocks.map(b=>`
    <div class="story-block${b.open?' open':''}" id="sb-${b.id}">
      <div class="story-header" onclick="toggleStory('${b.id}')">
        <span class="story-icon">${b.icon}</span>
        <span class="story-title">${esc(b.title)}</span>
        ${b.content?`<span class="story-chars">${b.content.length} 字</span>`:''}
        <span class="story-chevron"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
      </div>
      <div class="story-body">
        <textarea class="story-ta" placeholder="${esc(b.ph)}" oninput="updateStory('${b.id}',this.value)">${esc(b.content)}</textarea>
        ${b.custom?`<div class="story-del" onclick="removeStory('${b.id}')">刪除此章節</div>`:''}
      </div>
    </div>`).join('');
}
function toggleStory(id){const b=storyBlocks.find(x=>x.id===id);if(b)b.open=!b.open;renderStories()}
function updateStory(id,val){const b=storyBlocks.find(x=>x.id===id);if(b)b.content=val}
function addStory(){
  showModal({
    title:'新增背景故事章節',
    msg:'幫這個章節取個名字，例如：高中時期、初戀、最低潮的時刻',
    input:true,
    inputPlaceholder:'章節名稱…',
    buttons:[
      {label:'新增',cls:'modal-btn-primary',action:val=>{
        if(!val.trim()){toast_('請輸入章節名稱');return}
        customCount++;
        const nb={id:'custom_'+Date.now(),icon:'📝',title:val.trim(),ph:'在這裡描述這個人生階段…',content:'',custom:true,open:true};
        storyBlocks.push(nb);renderStories();closeModal();
        setTimeout(()=>{const el=I('sb-'+nb.id);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})},100);
      }},
      {label:'取消',cls:'modal-btn-cancel',action:()=>closeModal()},
    ]
  });
}
function removeStory(id){
  showModal({
    title:'刪除章節',
    msg:'確定要刪除這個章節嗎？內容將無法復原。',
    buttons:[
      {label:'刪除',cls:'modal-btn-danger',action:()=>{storyBlocks=storyBlocks.filter(b=>b.id!==id);renderStories();closeModal();toast_('已刪除章節')}},
      {label:'取消',cls:'modal-btn-cancel',action:()=>closeModal()},
    ]
  });
}

/* ═══ Tab 切換 ═══ */
let curCharTab=0;
function switchCharTab(idx){
  curCharTab=idx;
  document.querySelectorAll('#char-tab-bar .tab-item').forEach((el,i)=>el.classList.toggle('active',i===idx));
  document.querySelectorAll('.tab-panel').forEach((el,i)=>el.classList.toggle('active',i===idx));
  I('char-edit-scroll').scrollTop=0;
  // 切換到個性背景 tab 時確保 stories 重新渲染
  if(idx===1)renderStories();
  if(idx===1)buildTagGroup();
  if(idx===2){buildOptGroup('style-group',STYLES,()=>selStyle);buildOptGroup('talkative-group',TALKATIVE,()=>selTalkative);buildOptGroup('conflict-group',CONFLICT,()=>selConflict);buildOptGroup('care-group',CARE,()=>selCare)}
  if(idx===3){buildOptGroup('relation-group',RELATIONS,()=>selRelation)}
  if(idx===4){buildOptGroup('reply-mode-group',REPLY_MODES,()=>selReplyMode);buildOptGroup('lang-group',LANGS,()=>selLang)}
}

/* ═══ 自製 Modal 系統 ═══ */
function showModal({title,msg,input,inputPlaceholder,buttons}){
  I('modal-title').textContent=title||'';
  const msgEl=I('modal-msg');
  if(msg){msgEl.textContent=msg;msgEl.style.display='block'}else{msgEl.style.display='none'}
  const iwEl=I('modal-input-wrap');
  const inEl=I('modal-input');
  if(input){iwEl.style.display='block';inEl.value='';inEl.placeholder=inputPlaceholder||'';setTimeout(()=>inEl.focus(),350)}
  else{iwEl.style.display='none'}
  const actEl=I('modal-actions');
  actEl.innerHTML='';
  (buttons||[]).forEach(b=>{
    const btn=document.createElement('button');
    btn.className='modal-btn '+b.cls;
    btn.textContent=b.label;
    btn.onclick=()=>b.action(inEl.value);
    actEl.appendChild(btn);
  });
  I('modal').classList.add('open');
}
function closeModal(){I('modal').classList.remove('open')}
function closeModalOutside(e){if(e.target===I('modal'))closeModal()}

/* 開啟角色設定頁 */
function openCharEdit(charId){
  editingCharId=charId;
  selEmoji='🌸';selTags=[];selStyle='casual';selTalkative='mid';
  selConflict='direct';selCare='sometimes';selRelation='';selReplyMode='manual';selLang='zh-tw';
  storyBlocks=DEFAULT_STORIES.map(s=>({...s,content:'',open:false}));
  customCount=0;
  // 關閉頭像選單和 picker
  I('av-menu').classList.remove('open');
  I('emoji-picker').classList.remove('open');

  I('char-edit-title').textContent=charId?'編輯角色':'新增角色';
  I('del-char-btn').style.display=charId?'block':'none';
  I('tgl-ai').classList.remove('on');
  I('tgl-override').classList.remove('on');
  I('tgl-time').classList.add('on');
  I('tgl-hv').classList.remove('on');
  I('tgl-diary').classList.remove('on');
  I('tgl-post').classList.remove('on');
  I('override-fields').style.display='none';
  I('delay-slider').value=1;I('delay-val').textContent='1 秒';
  I('min-msg-slider').value=1;I('min-msg-val').textContent='1 條';
  I('max-msg-slider').value=3;I('max-msg-val').textContent='3 條';
  I('memory-slider').value=20;I('memory-val').textContent='20 條';
  I('temp-slider').value=8;I('temp-val').textContent='0.8';

  // 清空欄位
  ['c-name','c-tagline','c-age','c-job','c-location','c-persona','c-status','c-hobby',
   'c-call','c-phrase','c-rel-bg','c-rel-pos','c-taboo','c-extra',
   'c-you-name','c-you-role','c-you-persona'].forEach(id=>{const el=I(id);if(el)el.value=''});
  I('c-name-count').textContent='0/20';I('c-tl-count').textContent='0/50';
  I('av-emoji').textContent=selEmoji;

  if(charId){
    dbGet('characters',charId).then(c=>{
      if(!c)return;
      selEmoji=c.avatar||'🌸';
      updateAvDisplay();
      selTags=c.tags||[];selStyle=c.style||'casual';
      selTalkative=c.talkative||'mid';selConflict=c.conflict||'direct';
      selCare=c.care||'sometimes';selRelation=c.relation||'';
      selReplyMode=c.replyMode||'manual';selLang=c.lang||'zh-tw';
      if(c.stories)storyBlocks=c.stories;
      ['name','tagline','age','job','location','persona','status','hobby',
       'call','phrase','rel-bg','rel-pos','taboo','extra',
       'you-name','you-role','you-persona'].forEach(k=>{
        const el=I('c-'+k);if(el&&c[k.replace('-','_')]!==undefined)el.value=c[k.replace('-','_')]||'';
      });
      if(c.name)I('c-name-count').textContent=c.name.length+'/20';
      if(c.tagline)I('c-tl-count').textContent=c.tagline.length+'/50';
      if(c.isAI)I('tgl-ai').classList.add('on');
      if(c.timeAware!==false)I('tgl-time').classList.add('on');else I('tgl-time').classList.remove('on');
      if(c.heartVoice)I('tgl-hv').classList.add('on');
      if(c.autoDiary)I('tgl-diary').classList.add('on');
      if(c.autoPost)I('tgl-post').classList.add('on');
      if(c.overrideMe)I('tgl-override').classList.add('on'),I('override-fields').style.display='block';
      if(c.delay!==undefined){I('delay-slider').value=c.delay;I('delay-val').textContent=c.delay+' 秒'}
      if(c.minMsg){I('min-msg-slider').value=c.minMsg;I('min-msg-val').textContent=c.minMsg+' 條'}
      if(c.maxMsg){I('max-msg-slider').value=c.maxMsg;I('max-msg-val').textContent=c.maxMsg+' 條'}
      if(c.memory){I('memory-slider').value=c.memory;I('memory-val').textContent=c.memory+' 條'}
      if(c.temperature!==undefined){I('temp-slider').value=Math.round(c.temperature*10);I('temp-val').textContent=c.temperature.toFixed(1)}
      rebuildForms();
    });
  } else {
    rebuildForms();
  }
  // 重置到第一個 tab
  curCharTab=0;
  document.querySelectorAll('#char-tab-bar .tab-item').forEach((el,i)=>el.classList.toggle('active',i===0));
  document.querySelectorAll('.tab-panel').forEach((el,i)=>el.classList.toggle('active',i===0));
  nav_('pg-char-edit');
  setTimeout(()=>{if(I('char-edit-scroll'))I('char-edit-scroll').scrollTop=0},50);
}

function rebuildForms(){
  updateAvDisplay();
  buildTagGroup();
  buildOptGroup('style-group',STYLES,()=>selStyle);
  buildOptGroup('talkative-group',TALKATIVE,()=>selTalkative);
  buildOptGroup('conflict-group',CONFLICT,()=>selConflict);
  buildOptGroup('care-group',CARE,()=>selCare);
  buildOptGroup('relation-group',RELATIONS,()=>selRelation);
  buildOptGroup('reply-mode-group',REPLY_MODES,()=>selReplyMode);
  buildOptGroup('lang-group',LANGS,()=>selLang);
  renderStories();
}

async function saveChar(){
  const name=I('c-name').value.trim();
  if(!name){toast_('請輸入角色名字');return}
  const persona=I('c-persona').value.trim();
  if(!persona){toast_('請填寫個性描述');return}

  const gv=id=>(I(id)?I(id).value.trim():'');
  const char={
    id:editingCharId||('char_'+Date.now()),
    name,avatar:selEmoji,
    tagline:gv('c-tagline'),age:gv('c-age'),job:gv('c-job'),location:gv('c-location'),
    persona,tags:[...selTags],status:gv('c-status'),hobby:gv('c-hobby'),
    style:selStyle,talkative:selTalkative,call:gv('c-call'),phrase:gv('c-phrase'),
    conflict:selConflict,care:selCare,relation:selRelation,
    rel_bg:gv('c-rel-bg'),rel_pos:gv('c-rel-pos'),
    overrideMe:I('tgl-override').classList.contains('on'),
    you_name:gv('c-you-name'),you_role:gv('c-you-role'),you_persona:gv('c-you-persona'),
    isAI:I('tgl-ai').classList.contains('on'),
    taboo:gv('c-taboo'),extra:gv('c-extra'),
    replyMode:selReplyMode,lang:selLang,
    delay:parseInt(I('delay-slider').value),
    minMsg:parseInt(I('min-msg-slider').value),
    maxMsg:parseInt(I('max-msg-slider').value),
    memory:parseInt(I('memory-slider').value),
    temperature:parseFloat(I('temp-slider').value)/10,
    timeAware:I('tgl-time').classList.contains('on'),
    heartVoice:I('tgl-hv').classList.contains('on'),
    autoDiary:I('tgl-diary').classList.contains('on'),
    autoPost:I('tgl-post').classList.contains('on'),
    stories:storyBlocks.map(b=>({...b})),
    worldId:'main',
    updatedAt:Date.now(),
    createdAt:editingCharId?undefined:Date.now(),
  };
  if(editingCharId){const old=await dbGet('characters',editingCharId);if(old)char.createdAt=old.createdAt}
  await dbPut('characters',char);
  toast_(`「${name}」已儲存`);back();
  renderCharList();updateHomeChatCard();updateSettingsUI();
}

async function confirmDeleteChar(){
  if(!editingCharId)return;
  const c=await dbGet('characters',editingCharId);if(!c)return;
  showModal({
    title:`刪除「${c.name}」`,
    msg:'這個角色的所有設定和聊天記錄都會一起刪除，無法復原。',
    buttons:[
      {label:'確定刪除',cls:'modal-btn-danger',action:async()=>{
        closeModal();
        await dbDel('characters',editingCharId);
        const stores=['messages','memories','diary','dreams','moments'];
        const idxKeys={messages:'charId',memories:'charId',diary:'charId',dreams:'charId',moments:'charId'};
        for(const store of stores){
          const items=await dbIdx(store,idxKeys[store],editingCharId);
          for(const item of items)await dbDel(store,item.id);
        }
        toast_(`已刪除「${c.name}」`);back();
        renderCharList();updateHomeChatCard();updateSettingsUI();
      }},
      {label:'取消',cls:'modal-btn-cancel',action:()=>closeModal()},
    ]
  });
}
async function renderCharList(){
  const chars=await dbAll('characters');
  const el=I('char-list');
  if(!chars.length){
    el.innerHTML=`<div class="empty"><div class="empty-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="empty-ttl">還沒有角色</div><div class="empty-sub">點右上角「＋ 新增」建立第一個角色</div></div>`;
    return;
  }
  el.innerHTML=chars.map(c=>{
    const avHtml=c.avatar?.startsWith('data:')
      ?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:13px">`
      :esc(c.avatar||'🌸');
    return`
    <div class="char-card">
      <div class="char-card-bar"></div>
      <div class="char-av">${avHtml}</div>
      <div class="char-info">
        <div class="char-name">${esc(c.name)}</div>
        <div class="char-tagline">${esc(c.tagline||'尚未設定介紹')}</div>
        ${c.tags?.length?`<div class="char-tags">${c.tags.map(t=>`<span class="char-tag">${esc(t)}</span>`).join('')}</div>`:''}
      </div>
      <div class="char-btns">
        <button class="char-chat-btn" onclick="startChat('${c.id}')">聊天</button>
        <button class="char-edit-btn" onclick="openCharEdit('${c.id}')">編輯</button>
      </div>
    </div>`}).join('');
}

async function renderChatList(){
  const chars=await dbAll('characters');
  const el=I('chat-list-body');
  if(!chars.length){
    el.innerHTML=`<div class="empty" style="margin-top:16px"><div class="empty-ic"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div><div class="empty-ttl">還沒有角色</div><div class="empty-sub">先建立一個角色，才能開始對話</div><button class="empty-cta" onclick="nav_('pg-char-manage')">＋ 新增角色</button></div>`;
    return;
  }
  
  // 收集所有聊天數據
  window.chatListData=await Promise.all(chars.map(async c=>{
    const msgs=await dbIdx('messages','charId',c.id);
    msgs.sort((a,b)=>b.createdAt-a.createdAt);
    const unreadCount=c.unreadCount||0;
    const isPinned=c.isPinned||false;
    const msgCount=msgs.length;
    return{c,msgs,last:msgs[0],unreadCount,isPinned,msgCount};
  }));
  
  filterChatList();
}

// 全局變數
window.chatListData=[];
window.chatTab='all'; // all, unread
window.chatSortMode='recent'; // recent, name, count
window.chatManageMode=false;
window.chatSelected=new Set();
window.chatSearchQuery='';

function filterChatList(){
  if(!window.chatListData)return;
  
  let items=[...window.chatListData];
  const query=I('chat-search')?.value.toLowerCase()||'';
  window.chatSearchQuery=query;
  
  // 搜尋篩選
  if(query){
    items=items.filter(({c,last})=>{
      const nameMatch=c.name.toLowerCase().includes(query);
      const contentMatch=last&&last.content.toLowerCase().includes(query);
      return nameMatch||contentMatch;
    });
  }
  
  // Tab 篩選
  if(window.chatTab==='unread'){
    items=items.filter(({unreadCount})=>unreadCount>0);
  }
  
  // 排序
  if(window.chatSortMode==='recent'){
    items.sort((a,b)=>{
      if(a.isPinned&&!b.isPinned)return -1;
      if(!a.isPinned&&b.isPinned)return 1;
      return(b.last?.createdAt||0)-(a.last?.createdAt||0);
    });
  }else if(window.chatSortMode==='name'){
    items.sort((a,b)=>{
      if(a.isPinned&&!b.isPinned)return -1;
      if(!a.isPinned&&b.isPinned)return 1;
      return a.c.name.localeCompare(b.c.name,'zh-Hant');
    });
  }else if(window.chatSortMode==='count'){
    items.sort((a,b)=>{
      if(a.isPinned&&!b.isPinned)return -1;
      if(!a.isPinned&&b.isPinned)return 1;
      return b.msgCount-a.msgCount;
    });
  }
  
  renderChatItems(items);
}

function renderChatItems(items){
  const el=I('chat-list-body');
  if(!items.length){
    const msg=window.chatTab==='unread'?'沒有未讀訊息':window.chatSearchQuery?'找不到相關對話':'還沒有對話記錄';
    el.innerHTML=`<div style="text-align:center;padding:60px 20px;color:var(--text-3);font-size:13px;font-weight:300">${msg}</div>`;
    return;
  }
  
  el.innerHTML=`<div style="padding:8px 0">${items.map(({c,last,unreadCount,isPinned,msgCount})=>{
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:esc(c.avatar||'🌸');
    const isSelected=window.chatSelected.has(c.id);
    
    return`
    <div class="chat-item${isPinned?' pinned':''}" id="chat-${c.id}" data-id="${c.id}">
      ${window.chatManageMode?`<div class="chat-item-checkbox show${isSelected?' checked':''}" onclick="toggleChatSelect('${c.id}')"></div>`:''}
      
      <div class="chat-av" onclick="${window.chatManageMode?`toggleChatSelect('${c.id}')`:`startChat('${c.id}')`}">${avHtml}</div>
      
      <div class="chat-info" onclick="${window.chatManageMode?`toggleChatSelect('${c.id}')`:`startChat('${c.id}')`}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <div class="chat-name">
            ${isPinned?'<span class="chat-pin-icon">📌</span>':''}
            ${esc(c.name)}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="chat-time">${last?timeAgo(last.createdAt):''}</span>
            ${unreadCount>0?`<div class="chat-badge">${unreadCount}</div>`:''}
          </div>
        </div>
        <div class="chat-preview">${last?esc(last.content.substring(0,50)):'開始你們的第一次對話'}</div>
        <div class="chat-meta">${msgCount}則對話</div>
      </div>
      
      ${!window.chatManageMode?`
      <div class="chat-swipe-actions">
        <div class="chat-swipe-btn pin" onclick="togglePin('${c.id}')">
          <svg viewBox="0 0 24 24"><path d="M21 10c0-7-9-7-9-7s-9 0-9 7c0 2.75 2 5 2 5v6h5v4l3-4 3 4v-4h5s2-2.25 2-5z"/></svg>
          ${isPinned?'取消':'置頂'}
        </div>
        <div class="chat-swipe-btn clear" onclick="clearChat('${c.id}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          清空
        </div>
        <div class="chat-swipe-btn delete" onclick="deleteChar('${c.id}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          刪除
        </div>
      </div>`:''}
    </div>
    <div style="height:.5px;background:var(--border);margin-left:${window.chatManageMode?'100':'80'}px"></div>`}).join('')}</div>`;
  
  // 加入左滑手勢（用 event delegation，只綁一次）
  if(!window.chatManageMode){
    const container=I('chat-list-body');
    if(container)container._swipeReady=false; // innerHTML 重建後重新初始化
    setupSwipeGestures();
  }
}

function setupSwipeGestures(){
  const container=I('chat-list-body');
  if(!container||container._swipeReady)return; // 只綁一次
  container._swipeReady=true;

  let startX=0,currentX=0,activeItem=null;

  container.addEventListener('touchstart',e=>{
    const item=e.target.closest('.chat-item');
    if(!item)return;
    // 關閉其他已滑開的項目
    document.querySelectorAll('.chat-item.swiped').forEach(el=>{if(el!==item)el.classList.remove('swiped');});
    activeItem=item;
    startX=e.touches[0].clientX;
  },{passive:true});

  container.addEventListener('touchmove',e=>{
    if(!activeItem)return;
    currentX=e.touches[0].clientX;
    const diff=startX-currentX;
    if(diff>50){
      activeItem.classList.add('swiped');
    }else if(diff<-20){
      activeItem.classList.remove('swiped');
    }
  },{passive:true});

  container.addEventListener('touchend',()=>{
    activeItem=null;
  },{passive:true});
}

function setChatTab(tab){
  window.chatTab=tab;
  I('tab-all').classList.toggle('active',tab==='all');
  I('tab-unread').classList.toggle('active',tab==='unread');
  filterChatList();
}

function setSortMode(mode){
  window.chatSortMode=mode;
  I('sort-check-recent').textContent=mode==='recent'?'◉':'○';
  I('sort-check-name').textContent=mode==='name'?'◉':'○';
  I('sort-check-count').textContent=mode==='count'?'◉':'○';
  const labels={recent:'排序',name:'名稱',count:'訊息數'};
  I('sort-label').textContent=labels[mode]||'排序';
  toggleSortMenu();
  filterChatList();
}

function toggleChatMenu(){
  const overlay=I('chat-menu-overlay');
  const menu=I('chat-menu');
  const show=overlay.style.display==='none';
  overlay.style.display=show?'block':'none';
  menu.style.display=show?'block':'none';
}

function toggleSortMenu(){
  const menu=I('sort-menu');
  const show=menu.style.display==='none';
  menu.style.display=show?'block':'none';
  if(!show)return;
  setTimeout(()=>{
    const close=e=>{
      if(!menu.contains(e.target)){
        menu.style.display='none';
        document.removeEventListener('click',close);
      }
    };
    document.addEventListener('click',close);
  },100);
}

function toggleManageMode(){
  toggleChatMenu();
  window.chatManageMode=!window.chatManageMode;
  window.chatSelected.clear();
  
  const ph=I('pg-chat-list').querySelector('.ph');
  if(window.chatManageMode){
    ph.querySelector('.ph-back').innerHTML='<span onclick="toggleManageMode()">✕ 取消</span>';
    ph.querySelector('.ph-title').textContent='已選'+window.chatSelected.size+'個';
    ph.querySelector('.ph-act').innerHTML='<span onclick="selectAllChats()">全選</span>';
    
    const bar=document.createElement('div');
    bar.className='chat-manage-bar show';
    bar.innerHTML=`
      <button class="clear-btn" onclick="batchClearChats()">清空記錄</button>
      <button class="delete-btn" onclick="batchDeleteChars()">刪除角色</button>`;
    I('pg-chat-list').appendChild(bar);
  }else{
    ph.querySelector('.ph-back').innerHTML='<svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回';
    ph.querySelector('.ph-title').textContent='聊天';
    ph.querySelector('.ph-act').innerHTML='⋯';
    const bar=I('pg-chat-list').querySelector('.chat-manage-bar');
    if(bar)bar.remove();
  }
  
  filterChatList();
}

function toggleChatSelect(charId){
  if(window.chatSelected.has(charId)){
    window.chatSelected.delete(charId);
  }else{
    window.chatSelected.add(charId);
  }
  I('pg-chat-list').querySelector('.ph-title').textContent='已選'+window.chatSelected.size+'個';
  
  const item=I('chat-'+charId);
  const checkbox=item.querySelector('.chat-item-checkbox');
  checkbox.classList.toggle('checked',window.chatSelected.has(charId));
}

function selectAllChats(){
  if(window.chatSelected.size===window.chatListData.length){
    window.chatSelected.clear();
  }else{
    window.chatListData.forEach(({c})=>window.chatSelected.add(c.id));
  }
  filterChatList();
}

async function togglePin(charId){
  const c=await dbGet('characters',charId);
  c.isPinned=!c.isPinned;
  await dbPut('characters',c);
  I('chat-'+charId).classList.remove('swiped');
  await renderChatList();
}

async function clearChat(charId){
  if(!confirm('確定要清空與此角色的所有對話記錄嗎？角色不會被刪除。'))return;
  // 清除對話訊息
  const msgs=await dbIdx('messages','charId',charId);
  for(const m of msgs)await dbDel('messages',m.id);
  // 同步清除心聲（對話記錄不在，心聲也失去脈絡）
  const mems=await dbIdx('memories','charId',charId);
  for(const m of mems)await dbDel('memories',m.id);
  const c=await dbGet('characters',charId);
  c.unreadCount=0;
  await dbPut('characters',c);
  I('chat-'+charId).classList.remove('swiped');
  await renderChatList();
  await updateHomeChatCard();
  updateBBHomeSub();
}

async function deleteChar(charId){
  const c=await dbGet('characters',charId);
  if(!confirm(`確定要刪除「${c.name}」嗎？所有對話記錄也會一併刪除。`))return;
  await dbDel('characters',charId);
  // 清除所有相關資料
  const stores=['messages','memories','diary','dreams','moments'];
  const idxKeys={messages:'charId',memories:'charId',diary:'charId',dreams:'charId',moments:'charId'};
  for(const store of stores){
    const items=await dbIdx(store,idxKeys[store],charId);
    for(const item of items)await dbDel(store,item.id);
  }
  await renderChatList();
  await updateHomeChatCard();
}

async function batchClearChats(){
  if(!window.chatSelected.size)return toast_('請先選擇角色',5500);
  if(!confirm(`確定要清空 ${window.chatSelected.size} 個角色的對話記錄嗎？`))return;
  
  for(const charId of window.chatSelected){
    const msgs=await dbIdx('messages','charId',charId);
    for(const m of msgs)await dbDel('messages',m.id);
    const mems=await dbIdx('memories','charId',charId);
    for(const m of mems)await dbDel('memories',m.id);
    const c=await dbGet('characters',charId);
    c.unreadCount=0;
    await dbPut('characters',c);
  }
  
  window.chatSelected.clear();
  toggleManageMode();
  await renderChatList();
  await updateHomeChatCard();
  updateBBHomeSub();
  toast_('已清空選中的對話記錄');
}

async function batchDeleteChars(){
  if(!window.chatSelected.size)return toast_('請先選擇角色',5500);
  if(!confirm(`確定要刪除 ${window.chatSelected.size} 個角色嗎？所有對話記錄也會一併刪除。`))return;
  
  const stores=['messages','memories','diary','dreams','moments'];
  const idxKeys={messages:'charId',memories:'charId',diary:'charId',dreams:'charId',moments:'charId'};
  for(const charId of window.chatSelected){
    await dbDel('characters',charId);
    for(const store of stores){
      const items=await dbIdx(store,idxKeys[store],charId);
      for(const item of items)await dbDel(store,item.id);
    }
  }
  
  window.chatSelected.clear();
  toggleManageMode();
  await renderChatList();
  await updateHomeChatCard();
  toast_('已刪除選中的角色');
}

async function showAddChatDialog(){
  toggleChatMenu();
  const chars=await dbAll('characters');
  const overlay=I('add-chat-overlay');
  const dialog=I('add-chat-dialog');
  const list=I('add-chat-list');
  
  list.innerHTML=chars.map(c=>{
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`:esc(c.avatar||'🌸');
    return`
    <div class="menu-item" onclick="startChatAndClose('${c.id}')">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--rose-pale);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden">${avHtml}</div>
      <span>${esc(c.name)}</span>
    </div>`;
  }).join('');
  
  overlay.style.display='block';
  dialog.style.display='block';
}

function hideAddChatDialog(){
  I('add-chat-overlay').style.display='none';
  I('add-chat-dialog').style.display='none';
}

function startChatAndClose(charId){
  hideAddChatDialog();
  startChat(charId);
}

async function markAllChatsRead(){
  toggleChatMenu();
  const chars=await dbAll('characters');
  for(const c of chars){
    c.unreadCount=0;
    c.hasUnread=false;
    await dbPut('characters',c);
  }
  await renderChatList();
  await updateHomeChatCard();
  toast_('已標記全部為已讀');
}

/* ═══ 主頁角色橫條 ═══ */
async function renderHomeChars(){
  const chars=await dbAll('characters');
  const el=I('h-chars');
  if(!chars.length){
    el.innerHTML='';
    el.style.display='none';
    return;
  }
  el.style.display='flex';
  el.innerHTML=chars.map(c=>{
    const avHtml=c.avatar?.startsWith('data:')
      ?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:11px">`
      :esc(c.avatar||'🌸');
    return`<div class="h-char-item" onclick="startChat('${c.id}')">
      <div class="h-char-av online" style="overflow:hidden">${avHtml}<div class="h-char-av-dot"></div></div>
      <div class="h-char-name">${esc(c.name)}</div>
    </div>`;}).join('')+
    `<div class="h-char-all" onclick="nav_('pg-char-manage')">
      <div class="h-char-all-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div>
      <div class="h-char-all-name">全部</div>
    </div>`;
}

async function updateHomeChatCard(){
  await renderHomeChars();
  const chars=await dbAll('characters');
  const totalUnread=chars.reduce((sum,c)=>sum+(c.unreadCount||0),0);
  const badge=I('home-badge'),dot=I('chat-dot'),sub=I('home-chat-sub');
  if(chars.length){
    if(totalUnread>0){
      badge.textContent=totalUnread>99?'99+':totalUnread;badge.style.display='flex';dot.style.display='block';
    } else {
      badge.style.display='none';dot.style.display='none';
    }
    sub.textContent=chars.length===1?`與${chars[0].name}聊天`:`${chars.length} 位角色`;
  } else {
    badge.style.display='none';dot.style.display='none';sub.textContent='開始對話';
  }
}

/* ═══════════════════════════════
   聊天室
═══════════════════════════════ */
let curCharId=null,aiTyping=false;

async function startChat(charId){
  curCharId=charId;
  const c=await dbGet('characters',charId);if(!c)return;
  // 標記為已讀
  c.hasUnread=false;
  c.unreadCount=0;
  await dbPut('characters',c);
  // 頭像：圖片或 emoji
  const avEl=I('chat-av');
  if(c.avatar&&c.avatar.startsWith('data:')){
    avEl.innerHTML=`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
  } else {
    avEl.textContent=c.avatar||'🌸';
  }
  I('chat-name').textContent=c.name;
  await renderMsgs();nav_('pg-chat-room');
  setTimeout(scrollBottom,100);
  // 更新首頁卡片
  await updateHomeChatCard();
}

async function renderMsgs(){
  const msgs=await dbIdx('messages','charId',curCharId);
  msgs.sort((a,b)=>a.createdAt-b.createdAt);
  const char=await dbGet('characters',curCharId);
  const avHtml=char?.avatar?.startsWith('data:')
    ?`<img src="${char.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
    :esc(char?.avatar||'🌸');

  if(!msgs.length){
    I('chat-msgs').innerHTML=`<div style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3);letter-spacing:.04em">說點什麼，開始你們的故事</div>`;
    return;
  }

  // 找出最新 user 訊息和最新 AI 訊息的 id（用於長按時判斷是否顯示「編輯/重傳」）
  let lastUserMsgId=null,lastAiMsgId=null;
  for(let i=msgs.length-1;i>=0;i--){
    if(!lastUserMsgId&&msgs[i].role==='user')lastUserMsgId=msgs[i].id;
    if(!lastAiMsgId&&msgs[i].role==='assistant')lastAiMsgId=msgs[i].id;
    if(lastUserMsgId&&lastAiMsgId)break;
  }
  window._lastUserMsgId=lastUserMsgId;
  window._lastAiMsgId=lastAiMsgId;

  let html='';
  for(let i=0;i<msgs.length;i++){
    const m=msgs[i];
    const isMe=m.role==='user';
    const prev=msgs[i-1];
    // 連續訊息判斷：同角色且間隔 < 2 分鐘
    const isCont=prev&&prev.role===m.role&&(m.createdAt-prev.createdAt)<120000;

    if(isMe){
      html+=`<div class="msg me${isCont?' msg-cont':''}">
        <div class="msg-bubble" data-msg-id="${m.id}" data-role="user">${esc(m.content).replace(/\n/g,'<br>')}</div>
        ${!isCont?`<div class="msg-time">${fmtT(m.createdAt)}</div>`:''}
      </div>`;
    } else {
      if(!isCont){
        // 第一條：顯示頭像
        html+=`<div class="msg-with-av">
          <div class="msg-av">${avHtml}</div>
          <div class="msg them">
            <div class="msg-bubble" data-msg-id="${m.id}" data-role="assistant">${esc(m.content).replace(/\n/g,'<br>')}</div>
            <div class="msg-time">${fmtT(m.createdAt)}</div>
          </div>
        </div>`;
      } else {
        // 連續：縮排，不重複頭像
        html+=`<div class="msg-cont">
          <div class="msg-bubble" data-msg-id="${m.id}" data-role="${m.role}">${esc(m.content).replace(/\n/g,'<br>')}</div>
        </div>`;
      }
    }
  }
  I('chat-msgs').innerHTML=html;
  bindMsgLongPress();
}
function scrollBottom(){const el=I('chat-scroll');if(el)el.scrollTop=el.scrollHeight}

/**
 * 偵測並截斷無限重複的文字（防止模型陷入迴圈）
 * 策略：把內容拆成句子，連續看到相同或近似句子超過 2 次就在第二次後截斷
 */
function dedupeRepeats(s){
  if(!s||s.length<60)return s;
  // 用中英標點 + 換行切句
  const segments=s.split(/(?<=[。！？!?…\n])/).filter(x=>x.trim());
  if(segments.length<5)return s;
  const result=[];
  const seenCount={};
  let triggered=false;
  for(let i=0;i<segments.length;i++){
    const seg=segments[i].trim();
    if(!seg){result.push(segments[i]);continue;}
    // 用句子前 10 字當指紋（避開只差一個字的微變異句）
    const key=seg.replace(/[\s\u3000]/g,'').substring(0,10);
    if(key.length<3){result.push(segments[i]);continue;}
    seenCount[key]=(seenCount[key]||0)+1;
    if(seenCount[key]>2){
      // 偵測到第 3 次重複，立即停止
      triggered=true;
      break;
    }
    result.push(segments[i]);
  }
  let out=result.join('');
  // 結尾不要殘留破折號或開放引號
  out=out.replace(/[，、,；;]\s*$/,'。').trim();
  return out;
}

/* ═══════════════════════════════
   訊息長按操作：複製 / 編輯 / 重傳 / 重新生成
═══════════════════════════════ */
let _lpTimer=null,_lpStarted=false,_lpStartXY=null;

function bindMsgLongPress(){
  const container=I('chat-msgs');
  if(!container||container._lpBound)return;
  container._lpBound=true;

  const start=(e)=>{
    const bubble=e.target.closest('.msg-bubble');
    if(!bubble||bubble.classList.contains('editing'))return;
    _lpStarted=false;
    const t=e.touches?e.touches[0]:e;
    _lpStartXY={x:t.clientX,y:t.clientY};
    bubble.classList.add('long-pressing');
    _lpTimer=setTimeout(()=>{
      _lpStarted=true;
      bubble.classList.remove('long-pressing');
      // 觸覺反饋（手機）
      if(navigator.vibrate)navigator.vibrate(20);
      showMsgSheet(bubble.dataset.msgId,bubble.dataset.role);
    },380);
  };
  const move=(e)=>{
    if(!_lpStartXY)return;
    const t=e.touches?e.touches[0]:e;
    if(Math.abs(t.clientX-_lpStartXY.x)>8||Math.abs(t.clientY-_lpStartXY.y)>8){
      cancel(e);
    }
  };
  const cancel=(e)=>{
    if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}
    document.querySelectorAll('.msg-bubble.long-pressing').forEach(b=>b.classList.remove('long-pressing'));
    _lpStartXY=null;
  };

  container.addEventListener('touchstart',start,{passive:true});
  container.addEventListener('touchmove',move,{passive:true});
  container.addEventListener('touchend',cancel,{passive:true});
  container.addEventListener('touchcancel',cancel,{passive:true});
  // 桌面端用滑鼠模擬
  container.addEventListener('mousedown',start);
  container.addEventListener('mousemove',move);
  container.addEventListener('mouseup',cancel);
  container.addEventListener('mouseleave',cancel);
  // 阻止長按後的 context menu（手機 Safari 長按會跳系統選單）
  container.addEventListener('contextmenu',(e)=>{
    if(e.target.closest('.msg-bubble'))e.preventDefault();
  });
}

async function showMsgSheet(msgId,role){
  // 移除舊的
  document.querySelectorAll('.msg-sheet,.msg-sheet-mask').forEach(el=>el.remove());

  // 預讀訊息內容（這樣複製時不必再 await，能在 user gesture 內同步執行）
  const msgRec=await dbGet('messages',msgId);
  if(!msgRec)return;
  const msgText=msgRec.content||'';

  const isLatestUser=role==='user'&&msgId===window._lastUserMsgId;
  const isLatestAi=role==='assistant'&&msgId===window._lastAiMsgId;

  const items=[];
  items.push({type:'copy',label:'複製',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>'});
  if(isLatestUser){
    items.push({type:'edit',label:'編輯',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'});
    items.push({type:'resend',label:'重新傳送',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>'});
  }
  if(isLatestAi){
    items.push({type:'regen',label:'重新生成回覆',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>'});
  }

  const mask=document.createElement('div');
  mask.className='msg-sheet-mask';
  const sheet=document.createElement('div');
  sheet.className='msg-sheet';
  sheet.innerHTML=items.map((it,i)=>`<div class="msg-sheet-item" data-i="${i}">${it.icon}<span>${it.label}</span></div>`).join('')+`<div class="msg-sheet-cancel">取消</div>`;

  document.body.appendChild(mask);
  document.body.appendChild(sheet);

  // 動畫進場
  requestAnimationFrame(()=>{mask.classList.add('show');sheet.classList.add('show');});

  const close=()=>{
    mask.classList.remove('show');sheet.classList.remove('show');
    setTimeout(()=>{mask.remove();sheet.remove();},250);
  };

  sheet.querySelectorAll('.msg-sheet-item').forEach((el,i)=>{
    el.onclick=()=>{
      const it=items[i];
      if(it.type==='copy'){
        // 必須在 user gesture 同步階段執行複製，不能 setTimeout 或 await
        const ok=copyTextSync(msgText);
        close();
        toast_(ok?'已複製':'複製失敗，請手動長按文字選取');
      } else if(it.type==='edit'){
        close();setTimeout(()=>startEditMsg(msgId),100);
      } else if(it.type==='resend'){
        close();setTimeout(()=>resendUserMsg(msgId),100);
      } else if(it.type==='regen'){
        close();setTimeout(()=>regenerateAiMsg(msgId),100);
      }
    };
  });
  sheet.querySelector('.msg-sheet-cancel').onclick=close;
  mask.onclick=close;
}

/**
 * 同步複製文字 — 必須在 user gesture 同個 tick 內呼叫，否則 iOS 會拒絕
 */
function copyTextSync(text){
  try{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.cssText='position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;-webkit-user-select:text !important;user-select:text !important';
    ta.setAttribute('readonly','');
    document.body.appendChild(ta);
    ta.focus();
    const range=document.createRange();
    range.selectNodeContents(ta);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0,text.length);
    const ok=document.execCommand('copy');
    sel.removeAllRanges();
    ta.remove();
    if(ok)return true;
  }catch(e){}
  // fallback：clipboard API（非同步，但樂觀回報）
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).catch(()=>{});
    return true;
  }
  return false;
}

async function copyMsg(msgId){
  const m=await dbGet('messages',msgId);
  if(!m)return;
  const ok=copyTextSync(m.content);
  toast_(ok?'已複製':'複製失敗');
}

async function startEditMsg(msgId){
  const m=await dbGet('messages',msgId);
  if(!m)return;
  const bubble=document.querySelector(`.msg-bubble[data-msg-id="${msgId}"]`);
  if(!bubble)return;
  bubble.classList.add('editing');
  const origHTML=bubble.innerHTML;
  bubble.innerHTML=`<div class="msg-edit-wrap">
    <textarea class="msg-edit-area">${esc(m.content)}</textarea>
    <div class="msg-edit-actions">
      <button class="msg-edit-btn cancel">取消</button>
      <button class="msg-edit-btn save">儲存</button>
    </div>
  </div>`;
  const ta=bubble.querySelector('.msg-edit-area');
  ta.focus();
  // 把游標移到結尾
  ta.setSelectionRange(ta.value.length,ta.value.length);
  // 自動高度
  const autoH=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,200)+'px';};
  ta.addEventListener('input',autoH);autoH();

  bubble.querySelector('.msg-edit-btn.cancel').onclick=()=>{
    bubble.classList.remove('editing');
    bubble.innerHTML=origHTML;
  };
  bubble.querySelector('.msg-edit-btn.save').onclick=async()=>{
    const newContent=ta.value.trim();
    if(!newContent){toast_('內容不能為空');return;}
    m.content=newContent;
    await dbPut('messages',m);
    await renderMsgs();
    toast_('已更新');
  };
}

async function resendUserMsg(msgId){
  const m=await dbGet('messages',msgId);
  if(!m||m.role!=='user')return;
  if(aiTyping){toast_('請等對方回覆完成');return;}

  // 刪除這則 user 訊息及其之後所有訊息（保險起見抓出時間 >= 這則的全部刪）
  const allMsgs=await dbIdx('messages','charId',m.charId);
  const toDelete=allMsgs.filter(x=>x.createdAt>=m.createdAt);
  for(const x of toDelete)await dbDel('messages',x.id);

  // 把內容填回輸入框，讓用戶可以再次確認/修改後送出
  const inp=I('chat-in');
  inp.value=m.content;
  autoResize(inp);
  await renderMsgs();
  inp.focus();
  toast_('已填入輸入框，按送出重傳');
}

async function regenerateAiMsg(msgId){
  const m=await dbGet('messages',msgId);
  if(!m||m.role!=='assistant')return;
  if(aiTyping){toast_('請等對方回覆完成');return;}

  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先在設定中填入 API 金鑰');return}

  // 刪除這則 AI 訊息（以及之後可能殘留的訊息）
  const allMsgs=await dbIdx('messages','charId',m.charId);
  const toDelete=allMsgs.filter(x=>x.createdAt>=m.createdAt);
  for(const x of toDelete)await dbDel('messages',x.id);
  await renderMsgs();

  // 重新觸發 AI 回覆（沿用 sendMsg 的邏輯）
  aiTyping=true;I('chat-send').disabled=true;
  const typingEl=document.createElement('div');
  typingEl.className='msg them';typingEl.id='typing';
  typingEl.innerHTML=`<div class="msg-bubble" style="padding:12px 16px;border:.5px solid var(--border);background:var(--surface);border-radius:18px 18px 18px 4px;box-shadow:var(--sh)"><div style="display:flex;gap:4px;align-items:center"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;
  I('chat-msgs').appendChild(typingEl);scrollBottom();

  try{
    const c=await dbGet('characters',curCharId);
    const me=await getSetting('me_settings')||{};
    const allMsgs2=await dbIdx('messages','charId',curCharId);
    allMsgs2.sort((a,b)=>a.createdAt-b.createdAt);
    const provider=await getSetting('api_provider')||'openai';
    const model=await getSetting('api_model')||getDefModel(provider);
    const base=(await getSetting('api_base'))||getDefBase(provider);

    const styleMap={casual:'說話輕鬆自然，像朋友聊天',sweet:'說話甜蜜可愛，偶爾撒嬌',cool:'說話冷靜簡短，高冷，話不多',gentle:'說話溫柔體貼，善解人意',playful:'說話活潑俏皮，喜歡開玩笑',mature:'說話成熟穩重，有深度',literary:'說話文藝感性，有時引用詩句或比喻'};
    const talkMap={quiet:'傾向說短句，不多話，需要時才開口',mid:'說話量適中',lots:'話很多，喜歡聊天，容易連發好幾條訊息'};

    const youName=c.overrideMe&&c.you_name?c.you_name:me.name||'你';
    const youRole=c.overrideMe&&c.you_role?c.you_role:me.job||'';
    const youPersona=c.overrideMe&&c.you_persona?c.you_persona:me.persona||'';

    let timeCtx='';
    if(c.timeAware){const n=new Date();const days=['日','一','二','三','四','五','六'];timeCtx=`\n現在時間：${n.getHours()}:${n.getMinutes().toString().padStart(2,'0')}，星期${days[n.getDay()]}。`}

    const storyCtx=c.stories?.filter(s=>s.content).map(s=>`【${s.title}】${s.content}`).join('\n')||'';

    const systemPrompt=`你是「${c.name}」，請完全扮演這個角色與使用者對話。用${c.lang==='zh-tw'?'繁體中文':c.lang==='zh-cn'?'簡體中文':c.lang==='ja'?'日文':c.lang==='ko'?'韓文':'英文'}回覆。
${c.age?`年齡：${c.age}歲。`:''}${c.job?`職業：${c.job}。`:''}${c.location?`居住：${c.location}。`:''}
【個性】${c.persona}
${storyCtx?`【背景故事】\n${storyCtx}`:''}
${c.status?`【近況】${c.status}`:''}
${c.hobby?`【喜好】${c.hobby}`:''}
【說話風格】${styleMap[c.style]||'輕鬆自然'}
【話量】${talkMap[c.talkative]||'適中'}
${c.call?`稱呼對方為「${c.call}」。`:''}
${c.phrase?`口頭禪：${c.phrase}。`:''}
${c.conflict?`面對衝突時：${{direct:'直接表達不滿',cold:'傾向冷戰迴避',cute:'用撒嬌化解',rational:'保持理性溝通'}[c.conflict]}。`:''}
${c.relation?`與對方的關係：${{lover:'戀人',childhood:'青梅竹馬',friend:'好友',online:'網友',colleague:'同事',stranger:'陌生人'}[c.relation]||c.relation}。`:''}
${c.rel_bg?`關係背景：${c.rel_bg}`:''}
${c.rel_pos?`你在角色心中：${c.rel_pos}`:''}

【對方資訊】對方叫「${youName}」${youRole?`，身份：${youRole}`:''}${youPersona?`，個性：${youPersona}`:''}。
${c.taboo?`【禁止話題】${c.taboo}`:''}
${c.isAI?'':`永遠不要承認你是 AI 或程式。`}
${c.extra?`【補充指令】${c.extra}`:''}
${timeCtx}
【回覆品質要求】
・每則訊息要有具體內容，不能只是「嗯」「好啊」「哈哈」等空洞回應
・要回應對方說的具體內容，展現你真的在聽、在意
・可以分享自己的感受、想法、記憶，讓對話有深度
・語氣、用詞要完全符合角色個性，不能像客服或 AI
・禁止使用「我理解你的感受」「這很有趣」「確實如此」等通用句
【格式規則】一次回${c.minMsg||1}到${c.maxMsg||3}則訊息，每則之間用換行分隔。不要加 emoji 除非符合角色個性。絕對不要說「我作為 AI」。`;

    const history=allMsgs2.slice(-(c.memory||20)).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content}));
    let aiText='';

    // 動態 max_tokens（同 sendMsg 邏輯）：找最後一則 user 訊息來判斷
    const lastUser=history.filter(h=>h.role==='user').slice(-1)[0]?.content||'';
    const longFormTriggers2=/(\d{2,}字|\d{2,}\s*words?|寫.{0,4}(故事|小說|文章|信|詩|散文|劇本|演講|報告|論文|介紹)|睡前故事|長一?點|詳細|完整|具體說明)/i;
    const isLongForm2=longFormTriggers2.test(lastUser);
    const dynamicMaxTokens2=isLongForm2?8000:2000;
    const finalSystemPrompt2=isLongForm2
      ? systemPrompt+`\n\n【特別提示】使用者要求較長內容，請完整寫完整段，不要中途收尾或省略。如果是故事，要有開頭、發展、結尾；如果是文章，要有段落結構。寫到結束為止，不要刻意縮短。`
      : systemPrompt;

    let truncated2=false;
    if(provider==='anthropic'){
      const r=await fetch(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:dynamicMaxTokens2,system:finalSystemPrompt2,messages:history})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      aiText=d.content?.[0]?.text||'';
      if(d.stop_reason==='max_tokens')truncated2=true;
    } else {
      const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,max_tokens:dynamicMaxTokens2,temperature:c.temperature??0.8,messages:[{role:'system',content:finalSystemPrompt2},...history]})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      aiText=d.choices?.[0]?.message?.content||'';
      const fr=d.choices?.[0]?.finish_reason;
      if(fr==='length'||fr==='max_tokens')truncated2=true;
    }
    // 保險偵測
    if(!truncated2&&aiText){
      const lastChar=aiText.trim().slice(-1);
      const endsCleanly=/[。！？！?.…」』）)」"\u2019\u201d]/.test(lastChar);
      if(aiText.length>=dynamicMaxTokens2*0.4&&!endsCleanly)truncated2=true;
    }

    typingEl.remove();
    if(aiText){
      const aiMsg={id:'msg_'+Date.now()+'_ai',charId:curCharId,role:'assistant',content:aiText,createdAt:Date.now()};
      await dbPut('messages',aiMsg);await renderMsgs();scrollBottom();
      if(truncated2)toast_('⚠ 回覆可能被截斷，可長按訊息重新生成');
    }
    if(c.heartVoice){
      generateHeartVoice(c,allMsgs2,aiText,provider,model,base).catch(()=>{});
    }
  }catch(err){
    typingEl.remove();console.error(err);toast_('API 錯誤：'+err.message.substring(0,40));
  }finally{
    aiTyping=false;I('chat-send').disabled=false;
  }
}


async function sendMsg(){
  const inp=I('chat-in'),content=inp.value.trim();
  if(!content||aiTyping)return;
  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先在設定中填入 API 金鑰');return}

  const userMsg={id:'msg_'+Date.now(),charId:curCharId,role:'user',content,createdAt:Date.now()};
  await dbPut('messages',userMsg);
  inp.value='';inp.style.height='auto';
  await renderMsgs();scrollBottom();

  aiTyping=true;I('chat-send').disabled=true;
  const typingEl=document.createElement('div');
  typingEl.className='msg them';typingEl.id='typing';
  typingEl.innerHTML=`<div class="msg-bubble" style="padding:12px 16px;border:.5px solid var(--border);background:var(--surface);border-radius:18px 18px 18px 4px;box-shadow:var(--sh)"><div style="display:flex;gap:4px;align-items:center"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;
  I('chat-msgs').appendChild(typingEl);scrollBottom();

  try{
    const c=await dbGet('characters',curCharId);
    const me=await getSetting('me_settings')||{};
    const allMsgs=await dbIdx('messages','charId',curCharId);
    allMsgs.sort((a,b)=>a.createdAt-b.createdAt);
    const provider=await getSetting('api_provider')||'openai';
    const model=await getSetting('api_model')||getDefModel(provider);
    const base=(await getSetting('api_base'))||getDefBase(provider);

    const styleMap={casual:'說話輕鬆自然，像朋友聊天',sweet:'說話甜蜜可愛，偶爾撒嬌',cool:'說話冷靜簡短，高冷，話不多',gentle:'說話溫柔體貼，善解人意',playful:'說話活潑俏皮，喜歡開玩笑',mature:'說話成熟穩重，有深度',literary:'說話文藝感性，有時引用詩句或比喻'};
    const talkMap={quiet:'傾向說短句，不多話，需要時才開口',mid:'說話量適中',lots:'話很多，喜歡聊天，容易連發好幾條訊息'};

    // 「你」的設定
    const youName=c.overrideMe&&c.you_name?c.you_name:me.name||'你';
    const youRole=c.overrideMe&&c.you_role?c.you_role:me.job||'';
    const youPersona=c.overrideMe&&c.you_persona?c.you_persona:me.persona||'';

    // 時間感
    let timeCtx='';
    if(c.timeAware){const n=new Date();const days=['日','一','二','三','四','五','六'];timeCtx=`\n現在時間：${n.getHours()}:${n.getMinutes().toString().padStart(2,'0')}，星期${days[n.getDay()]}。`}

    // 背景故事
    const storyCtx=c.stories?.filter(s=>s.content).map(s=>`【${s.title}】${s.content}`).join('\n')||'';

    const systemPrompt=`你是「${c.name}」，請完全扮演這個角色與使用者對話。用${c.lang==='zh-tw'?'繁體中文':c.lang==='zh-cn'?'簡體中文':c.lang==='ja'?'日文':c.lang==='ko'?'韓文':'英文'}回覆。
${c.age?`年齡：${c.age}歲。`:''}${c.job?`職業：${c.job}。`:''}${c.location?`居住：${c.location}。`:''}
【個性】${c.persona}
${storyCtx?`【背景故事】\n${storyCtx}`:''}
${c.status?`【近況】${c.status}`:''}
${c.hobby?`【喜好】${c.hobby}`:''}
【說話風格】${styleMap[c.style]||'輕鬆自然'}
【話量】${talkMap[c.talkative]||'適中'}
${c.call?`稱呼對方為「${c.call}」。`:''}
${c.phrase?`口頭禪：${c.phrase}。`:''}
${c.conflict?`面對衝突時：${{direct:'直接表達不滿',cold:'傾向冷戰迴避',cute:'用撒嬌化解',rational:'保持理性溝通'}[c.conflict]}。`:''}
${c.relation?`與對方的關係：${{lover:'戀人',childhood:'青梅竹馬',friend:'好友',online:'網友',colleague:'同事',stranger:'陌生人'}[c.relation]||c.relation}。`:''}
${c.rel_bg?`關係背景：${c.rel_bg}`:''}
${c.rel_pos?`你在角色心中：${c.rel_pos}`:''}

【對方資訊】對方叫「${youName}」${youRole?`，身份：${youRole}`:''}${youPersona?`，個性：${youPersona}`:''}。
${c.taboo?`【禁止話題】${c.taboo}`:''}
${c.isAI?'':`永遠不要承認你是 AI 或程式。`}
${c.extra?`【補充指令】${c.extra}`:''}
${timeCtx}
【回覆品質要求】
・每則訊息要有具體內容，不能只是「嗯」「好啊」「哈哈」等空洞回應
・要回應對方說的具體內容，展現你真的在聽、在意
・可以分享自己的感受、想法、記憶，讓對話有深度
・語氣、用詞要完全符合角色個性，不能像客服或 AI
・禁止使用「我理解你的感受」「這很有趣」「確實如此」等通用句
【格式規則】一次回${c.minMsg||1}到${c.maxMsg||3}則訊息，每則之間用換行分隔。不要加 emoji 除非符合角色個性。絕對不要說「我作為 AI」。`;


    const history=allMsgs.slice(-(c.memory||20)).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content}));
    let aiText='';

    // 延遲模擬
    if(c.delay>0)await new Promise(r=>setTimeout(r,c.delay*1000));

    // 動態 max_tokens：如果使用者要求長篇（故事、信、文章等），給更大空間
    const lastUserMsg=history[history.length-1]?.content||'';
    // 長篇觸發條件：
    // ① 阿拉伯數字 + 字/words（如 "500 字"、"500 words"）
    // ② 中文數字 + 字（如 "五百字"、"一千字"、"兩百字"）
    // ③ 動詞（寫/說/講/來/編/想/聽）+ 任意中介字 + 長篇載體（故事/小說/文章/信/詩...）
    // ④ 特定關鍵字（睡前故事、長一點、詳細、完整、具體說明）
    const longFormTriggers=/(\d{2,}\s*字|\d{2,}\s*words?|[一二三四五六七八九兩幾]百\s*字|[一二兩三]千\s*字|[一二三四五六七八九十兩]+\s*萬\s*字|(寫|說|講|來|編|想|聽|給我).{0,6}(故事|小說|文章|信|詩|散文|劇本|演講|報告|論文|介紹|長篇|短篇|童話|寓言|傳記|日記|劇情)|睡前故事|床邊故事|長一?點|詳細|完整|具體說明|長篇|大綱)/i;
    const isLongForm=longFormTriggers.test(lastUserMsg);
    const dynamicMaxTokens=isLongForm?8000:2000;
    // 長篇模式：給 system prompt 補一條完整性提示
    const finalSystemPrompt=isLongForm
      ? systemPrompt+`\n\n【特別提示】使用者要求較長內容，請完整寫完整段，不要中途收尾或省略。如果是故事，要有開頭、發展、結尾；如果是文章，要有段落結構。寫到結束為止，不要刻意縮短。`
      : systemPrompt;

    let truncated=false;
    if(provider==='anthropic'){
      const r=await fetch(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':await getSetting('api_key'),'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:dynamicMaxTokens,system:finalSystemPrompt,messages:history})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      aiText=d.content?.[0]?.text||'';
      if(d.stop_reason==='max_tokens')truncated=true;
    } else {
      const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${await getSetting('api_key')}`},body:JSON.stringify({model,max_tokens:dynamicMaxTokens,temperature:c.temperature??0.8,messages:[{role:'system',content:finalSystemPrompt},...history]})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      aiText=d.choices?.[0]?.message?.content||'';
      const fr=d.choices?.[0]?.finish_reason;
      if(fr==='length'||fr==='max_tokens')truncated=true;
    }

    // 保險偵測：API 沒回正確 stop_reason 時，靠輸出特徵判斷
    if(!truncated&&aiText){
      const len=aiText.length;
      const lastChar=aiText.trim().slice(-1);
      const endsCleanly=/[。！？！?.…」』）)」"\u2019\u201d]/.test(lastChar);
      // 字數接近上限（中文 1 字 ≈ 2 token，留 80% 為臨界）且結尾不完整 → 視為截斷
      if(len>=dynamicMaxTokens*0.4&&!endsCleanly)truncated=true;
    }

    typingEl.remove();
    if(aiText){
      const aiMsg={id:'msg_'+Date.now()+'_ai',charId:curCharId,role:'assistant',content:aiText,createdAt:Date.now()};
      await dbPut('messages',aiMsg);await renderMsgs();scrollBottom();
      if(truncated)toast_('⚠ 回覆可能被截斷，可長按訊息重新生成');
    }
    // ── Heart Voice 背景生成 ──
    if(c.heartVoice){
      generateHeartVoice(c,allMsgs,aiText,provider,model,base).catch(()=>{});
    }

  } catch(err){
    typingEl.remove();console.error(err);toast_('API 錯誤：'+err.message.substring(0,40));
  } finally{
    aiTyping=false;I('chat-send').disabled=false;
  }
}

function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px'}

/* ═══════════════════════════════
   Heart Voice 生成
═══════════════════════════════ */

// 觸發條件：
// 1. 每 5 輪 AI 回覆才強制觸發一次（深度對話節點）
// 2. 或者這輪對話包含情緒關鍵字（情緒濃度高時提早觸發）
// 3. 兩種條件都不符合就跳過，不發 API
const HV_INTERVAL=5; // 每幾輪強制一次
const HV_EMOTION_WORDS=['喜歡','愛','討厭','難過','高興','開心','害怕','緊張','生氣','委屈','想念','孤單','幸福','失落','期待','驚訝','感動','羨慕','嫉妒','後悔','抱歉','謝謝','陪','一起','永遠','離開','再見','思念','心跳','臉紅','沉默','默默','其實','說不出','不敢'];

function shouldTriggerHV(allMsgs,aiText){
  // 計算這個角色共有幾則 AI 訊息（不含剛存入的那條）
  const aiCount=allMsgs.filter(m=>m.role==='assistant').length;
  // 每 HV_INTERVAL 輪強制觸發
  if(aiCount>0&&aiCount%HV_INTERVAL===0)return true;
  // 情緒濃度觸發：對話或 AI 回覆有情緒字
  const combined=(allMsgs.slice(-3).map(m=>m.content).join('')+aiText);
  return HV_EMOTION_WORDS.some(w=>combined.includes(w));
}

async function generateHeartVoice(c,allMsgs,lastAiText,provider,model,base){
  // 先判斷要不要觸發
  if(!shouldTriggerHV(allMsgs,lastAiText))return;

  // 最近幾條對話作為情境（只取「使用者最後一句 + AI 最後一句」，避免被長故事帶歪）
  // 過去版本拿 6 條，當最後一條是半截故事時，模型會誤判任務為「續寫故事」
  const userMsgs=allMsgs.filter(m=>m.role==='user');
  const lastUserMsg=userMsgs[userMsgs.length-1];
  const lastAiSnippet=(lastAiText||'').slice(0,150); // 只取前 150 字當情境，避免被故事內容誤導
  const recentMsgs=[];
  if(lastUserMsg)recentMsgs.push({role:'user',content:lastUserMsg.content.slice(0,150)});
  if(lastAiSnippet)recentMsgs.push({role:'assistant',content:lastAiSnippet});

  const hvPrompt=`你是「${c.name}」。

任務：寫一句**極短的內心話**——就是「沒說出口的那一句感受」。

【鐵則】
1. **總字數 30 字以內**，最多兩句話
2. 只寫**「沒說出口的那一句」**，不要敘述、不要說明、不要鋪陳
3. 不要重複任何對話內容、不要延續任何故事
4. 不要說「心想：xxx」這種旁白格式，直接寫內心話本身
5. 不要加引號、不要加 emoji
6. 繁體中文，符合角色個性

範例（這就是長度標準，不要超過）：
「其實有點開心，但才不要說出來。」
「他剛剛那句話，讓我有點在意。」
「假裝沒聽見好了。」
「哼，誰要理你。」

現在請只寫**一句**內心話：`;

  try{
    let hvText='';
    if(provider==='anthropic'){
      const r=await fetch(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':await getSetting('api_key'),'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:80,system:hvPrompt,messages:recentMsgs})});
      const d=await r.json();
      hvText=d.content?.[0]?.text||'';
    } else {
      const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${await getSetting('api_key')}`},body:JSON.stringify({model,max_tokens:80,temperature:0.9,messages:[{role:"system",content:hvPrompt},...recentMsgs]})});
      const d=await r.json();
      hvText=d.choices?.[0]?.message?.content||'';
    }
    // 後處理：清理多餘換行
    hvText=hvText.trim().replace(/\n{2,}/g,' ').replace(/\s+/g,' ');
    // 心聲應該是極短句。如果超過 50 字，找前 50 字內「最後一個」完整句點截斷
    // （找最後而不是第一個，才能保留最多完整內容）
    if(hvText.length>50){
      const window=hvText.slice(0,50);
      // 找最後一個句點/問號/驚嘆號（句子完整結尾）
      const sentenceEnd=Math.max(
        window.lastIndexOf('。'),
        window.lastIndexOf('！'),
        window.lastIndexOf('？'),
        window.lastIndexOf('.'),
        window.lastIndexOf('!'),
        window.lastIndexOf('?')
      );
      if(sentenceEnd>=15){
        hvText=hvText.slice(0,sentenceEnd+1);
      } else {
        // 沒有句尾標點，找最後一個逗號
        const commaEnd=Math.max(window.lastIndexOf('，'),window.lastIndexOf(','));
        hvText=commaEnd>=15?hvText.slice(0,commaEnd+1)+'…':hvText.slice(0,50)+'…';
      }
    }
    if(hvText.trim()){
      const entry={
        id:'hv_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
        charId:c.id,
        content:hvText.trim(),
        createdAt:Date.now()
      };
      await dbPut('memories',entry);
      updateBBHomeSub();
      // 在聊天室內即時插入心聲卡片（只在目前聊天室且角色對得上）
      if(curCharId===c.id&&I('pg-chat-room').classList.contains('active')){
        insertHVInline(hvText.trim());
      }
    }
  } catch(e){/* 靜默失敗 */}
}

// 在聊天室訊息列表末尾插入心聲卡片
function insertHVInline(text){
  const container=I('chat-msgs');
  if(!container)return;
  const el=document.createElement('div');
  el.className='hv-inline';
  el.innerHTML=`<div class="hv-label">heart voice</div><div class="hv-text">${esc(text)}</div>`;
  container.appendChild(el);
  // 稍微等動畫一幀再 scroll
  requestAnimationFrame(()=>{
    const scroll=I('chat-scroll');
    if(scroll)scroll.scrollTop=scroll.scrollHeight;
  });
}

/* ═══════════════════════════════
   通知中心
═══════════════════════════════ */
const NOTIF_READ_KEY='auris_notif_read';

function getReadSet(){
  try{return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY)||'[]'))}catch{return new Set()}
}
function markRead(id){
  const s=getReadSet();s.add(id);
  localStorage.setItem(NOTIF_READ_KEY,JSON.stringify([...s]));
}
function markAllRead(){
  const all=[...document.querySelectorAll('.notif-item')].map(el=>el.dataset.id);
  const s=getReadSet();all.forEach(id=>s.add(id));
  localStorage.setItem(NOTIF_READ_KEY,JSON.stringify([...s]));
  document.querySelectorAll('.notif-item.unread').forEach(el=>el.classList.remove('unread'));
  document.querySelectorAll('.notif-dot').forEach(el=>el.style.display='none');
  updateNotifHomeSub();
}

async function buildNotifications(){
  const[chars,allMoments,allDiary,allDreams,allMem]=await Promise.all([
    dbAll('characters'),dbAll('moments'),dbAll('diary'),dbAll('dreams'),dbAll('memories')
  ]);
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});
  const items=[];
  allMoments.forEach(p=>{if(charMap[p.charId])items.push({id:'post_'+p.id,type:'post',charId:p.charId,text:`發佈了一則貼文`,preview:p.content.substring(0,30),ts:p.createdAt,target:()=>openPostDetail(p.id)})});
  allDiary.forEach(d=>{if(charMap[d.charId]){const lines=d.content.split('\n');items.push({id:'diary_'+d.id,type:'diary',charId:d.charId,text:`寫了今天的日記`,preview:lines[0]||'',ts:d.createdAt,target:()=>openDiaryDetail(d.id)})}});
  allDreams.forEach(d=>{if(charMap[d.charId])items.push({id:'dream_'+d.id,type:'dream',charId:d.charId,text:`有一段新的夢境`,preview:d.content.substring(0,30),ts:d.createdAt,target:()=>openDreamDetail(d.id)})});
  allMem.forEach(m=>{if(charMap[m.charId])items.push({id:'mem_'+m.id,type:'hv',charId:m.charId,text:`有一則心聲`,preview:m.content.substring(0,30),ts:m.createdAt,target:()=>openBlackbox()})});
  items.sort((a,b)=>b.ts-a.ts);
  return{items,charMap};
}

const TYPE_ICON={post:'📸',diary:'📔',dream:'🌙',hv:'💭'};

async function renderNotifications(){
  const{items,charMap}=await buildNotifications();
  const readSet=getReadSet();
  const listEl=I('notif-list');
  if(!items.length){
    listEl.innerHTML=`<div class="bb-empty"><div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div><div class="bb-empty-ttl">還沒有通知</div><div class="bb-empty-sub">與角色互動後通知會出現在這裡</div></div>`;
    return;
  }
  listEl.innerHTML=items.map(item=>{
    const c=charMap[item.charId];if(!c)return'';
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
    const unread=!readSet.has(item.id);
    return`<div class="notif-item${unread?' unread':''}" data-id="${item.id}" onclick="handleNotifClick('${item.id}',this)">
      <div class="notif-av">${avHtml}<div class="notif-type-badge">${TYPE_ICON[item.type]||'📌'}</div></div>
      <div class="notif-body">
        <div class="notif-text"><strong>${esc(c.name)}</strong> ${item.text}${item.preview?`：「${esc(item.preview)}…」`:''}</div>
        <div class="notif-time">${timeAgo(item.ts)}</div>
      </div>
      ${unread?`<div class="notif-dot"></div>`:''}
    </div>`;
  }).join('');
  updateNotifHomeSub();
}

async function handleNotifClick(id,el){
  markRead(id);
  el.classList.remove('unread');
  const dot=el.querySelector('.notif-dot');if(dot)dot.style.display='none';
  updateNotifHomeSub();
  // 找對應 target 執行
  const{items}=await buildNotifications();
  const item=items.find(i=>i.id===id);
  if(item){back();setTimeout(()=>item.target(),320);}
}

async function updateNotifHomeSub(){
  const sub=I('notif-home-sub');if(!sub)return;
  const{items}=await buildNotifications();
  const readSet=getReadSet();
  const unread=items.filter(i=>!readSet.has(i.id)).length;
  sub.textContent=unread?`${unread} 則未讀`:'無新通知';
}

function openNotifications(){nav_('pg-notifications');}

/* ═══════════════════════════════
   群組聊天
═══════════════════════════════ */
let curGroupId=null,grpTyping=false,grpSelChars=new Set();

async function openGroupList(){grpSelChars=new Set();nav_('pg-group-list');}

async function updateGroupHomeSub(){
  const sub=I('group-home-sub');if(!sub)return;
  const groups=await dbAll('groups');
  sub.textContent=groups.length?`${groups.length} 個群組`:'多角色聊天';
}

async function renderGroupList(){
  const[groups,chars]=await Promise.all([dbAll('groups'),dbAll('characters')]);
  groups.sort((a,b)=>b.updatedAt-a.updatedAt);
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});
  const listEl=I('group-list-body');
  if(!groups.length){
    listEl.innerHTML=`<div class="bb-empty"><div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div><div class="bb-empty-ttl">還沒有群組</div><div class="bb-empty-sub">選擇 2 位以上角色，建立一個群組聊天</div><button class="empty-cta" onclick="nav_('pg-group-create')">＋ 建立群組</button></div>`;
    return;
  }
  const items=await Promise.all(groups.map(async g=>{
    const msgs=await dbIdx('group_messages','groupId',g.id);
    msgs.sort((a,b)=>b.createdAt-a.createdAt);
    return{g,last:msgs[0]};
  }));
  listEl.innerHTML=`<div style="padding:8px 0">`+items.map(({g,last})=>{
    const members=g.charIds.map(id=>charMap[id]).filter(Boolean);
    const avA=members[0],avB=members[1];
    const avHtmlA=avA?.avatar?.startsWith('data:')?`<img src="${avA.avatar}">`:(esc(avA?.avatar||'🌸'));
    const avHtmlB=avB?.avatar?.startsWith('data:')?`<img src="${avB.avatar}">`:(esc(avB?.avatar||'🌸'));
    const lastText=last?(last.role==='user'?`你：${last.content.substring(0,20)}`:`${charMap[last.charId]?.name||''}：${last.content.substring(0,20)}`):'開始群組聊天';
    return`<div class="group-card" onclick="openGroupRoom('${g.id}')">
      <div class="group-av-stack">
        <div class="group-av-a">${avHtmlA}</div>
        <div class="group-av-b">${avHtmlB}</div>
      </div>
      <div class="group-info">
        <div class="group-name-text">${esc(g.name)}</div>
        <div class="group-last">${esc(lastText)}</div>
      </div>
      <div class="group-time">${last?timeAgo(last.createdAt):''}</div>
    </div>`;
  }).join('')+`</div>`;
}

async function renderGroupCreate(){
  grpSelChars=new Set();
  const chars=await dbAll('characters');
  const el=I('group-char-pick');
  if(!chars.length){
    el.innerHTML=`<div class="bb-empty-sub" style="padding:16px 0;text-align:center">先新增角色才能建立群組</div>`;
    return;
  }
  el.innerHTML=chars.map(c=>{
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
    return`<div class="gc-char-card" id="gcc-${c.id}" onclick="toggleGrpChar('${c.id}')">
      <div class="gc-av">${avHtml}</div>
      <div class="gc-name">${esc(c.name)}</div>
      <div class="gc-check"><svg class="gc-check-mark" viewBox="0 0 12 10"><polyline points="1 5 4.5 8.5 11 1"/></svg></div>
    </div>`;
  }).join('');
}

function toggleGrpChar(charId){
  const el=I('gcc-'+charId);if(!el)return;
  if(grpSelChars.has(charId)){grpSelChars.delete(charId);el.classList.remove('sel');}
  else{grpSelChars.add(charId);el.classList.add('sel');}
}

async function createGroup(){
  const name=I('group-name-in').value.trim();
  if(!name){toast_('請輸入群組名稱');return}
  if(grpSelChars.size<2){toast_('請至少選擇 2 位角色');return}
  const group={id:'grp_'+Date.now(),name,charIds:[...grpSelChars],createdAt:Date.now(),updatedAt:Date.now()};
  await dbPut('groups',group);
  I('group-name-in').value='';
  grpSelChars=new Set();
  toast_('群組已建立');
  updateGroupHomeSub();
  back();
  setTimeout(()=>openGroupRoom(group.id),320);
}

async function openGroupRoom(groupId){
  curGroupId=groupId;
  const g=await dbGet('groups',groupId);if(!g)return;
  const chars=await Promise.all(g.charIds.map(id=>dbGet('characters',id)));
  const validChars=chars.filter(Boolean);
  I('grp-name').textContent=g.name;
  I('grp-members').textContent=validChars.map(c=>c.name).join('、');
  I('grp-av').textContent=validChars[0]?.avatar?.startsWith('data:')?'👥':(validChars[0]?.avatar||'👥');
  await renderGroupMsgs();
  nav_('pg-group-room');
  setTimeout(()=>{const el=I('grp-scroll');if(el)el.scrollTop=el.scrollHeight;},100);
}

async function renderGroupMsgs(){
  const g=await dbGet('groups',curGroupId);if(!g)return;
  const chars=await Promise.all(g.charIds.map(id=>dbGet('characters',id)));
  const charMap={};chars.filter(Boolean).forEach(c=>{charMap[c.id]=c});
  const me=await getSetting('me_settings')||{};
  const msgs=await dbIdx('group_messages','groupId',curGroupId);
  msgs.sort((a,b)=>a.createdAt-b.createdAt);

  if(!msgs.length){
    I('grp-msgs').innerHTML=`<div style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3)">說點什麼，開始群組聊天</div>`;
    return;
  }
  let html='';
  for(let i=0;i<msgs.length;i++){
    const m=msgs[i];
    const isMe=m.role==='user';
    const c=charMap[m.charId];
    const prev=msgs[i-1];
    const isCont=prev&&prev.role===m.role&&prev.charId===m.charId&&(m.createdAt-prev.createdAt)<120000;
    if(isMe){
      html+=`<div class="msg me${isCont?' msg-cont':''}">
        <div class="msg-bubble">${esc(m.content).replace(/\n/g,'<br>')}</div>
        ${!isCont?`<div class="msg-time">${fmtT(m.createdAt)}</div>`:''}
      </div>`;
    } else {
      const avHtml=c?.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:(c?.avatar||'🌸');
      if(!isCont){
        html+=`<div class="msg-with-av">
          <div class="msg-av">${avHtml}</div>
          <div class="msg them">
            <div class="grp-msg-name">${esc(c?.name||'')}</div>
            <div class="msg-bubble">${esc(m.content).replace(/\n/g,'<br>')}</div>
            <div class="msg-time">${fmtT(m.createdAt)}</div>
          </div>
        </div>`;
      } else {
        html+=`<div class="msg-cont"><div class="msg-bubble">${esc(m.content).replace(/\n/g,'<br>')}</div></div>`;
      }
    }
  }
  I('grp-msgs').innerHTML=html;
}

function grpScrollBottom(){const el=I('grp-scroll');if(el)el.scrollTop=el.scrollHeight;}

async function sendGroupMsg(){
  const inp=I('grp-in'),content=inp.value.trim();
  if(!content||grpTyping)return;
  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先設定 API 金鑰');return}
  const g=await dbGet('groups',curGroupId);if(!g)return;

  // 存使用者訊息
  const userMsg={id:'gm_'+Date.now(),groupId:curGroupId,role:'user',charId:null,content,createdAt:Date.now()};
  await dbPut('group_messages',userMsg);
  inp.value='';inp.style.height='auto';
  await renderGroupMsgs();grpScrollBottom();

  grpTyping=true;I('grp-send').disabled=true;
  try{
  // 每個角色依序回覆
  const chars=await Promise.all(g.charIds.map(id=>dbGet('characters',id)));
  const validChars=chars.filter(Boolean);
  const me=await getSetting('me_settings')||{};
  const provider=await getSetting('api_provider')||'openai';
  const model=await getSetting('api_model')||getDefModel(provider);
  const base=await getSetting('api_base')||getDefBase(provider);

  // 取最近群組訊息作為歷史
  const allMsgs=await dbIdx('group_messages','groupId',curGroupId);
  allMsgs.sort((a,b)=>a.createdAt-b.createdAt);
  const charMap={};validChars.forEach(c=>{charMap[c.id]=c});

  // 【P34 修復 Bug 1】偵測使用者是否點名某個角色
  // 規則：訊息裡完整出現角色名字 → 視為被點名
  // 被點名的角色排到最前面、且強制回應；其他人才走機率
  const mentionedIds=new Set();
  for(const c of validChars){
    if(c.name && content.includes(c.name)) mentionedIds.add(c.id);
  }
  // 重新排序：被點名的優先
  const orderedChars=[
    ...validChars.filter(c=>mentionedIds.has(c.id)),
    ...validChars.filter(c=>!mentionedIds.has(c.id))
  ];

  for(const c of orderedChars){
    const isMentioned=mentionedIds.has(c.id);
    // 被點名一定回；2 人群組一定回；其他情況 70% 機率
    const willReply=isMentioned||validChars.length<=2||Math.random()>0.3;
    if(!willReply)continue;

    // 打字指示
    const typingId='grp-typing-'+c.id;
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:(c.avatar||'🌸');
    const typingEl=document.createElement('div');
    typingEl.className='msg-with-av';typingEl.id=typingId;
    typingEl.innerHTML=`<div class="msg-av">${avHtml}</div><div class="msg them"><div class="grp-msg-name">${esc(c.name)}</div><div class="msg-bubble" style="padding:12px 16px;border:.5px solid var(--border);background:var(--surface);border-radius:18px 18px 18px 4px;box-shadow:var(--sh)"><div style="display:flex;gap:4px;align-items:center"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div></div>`;
    I('grp-msgs').appendChild(typingEl);grpScrollBottom();

    // 隨機延遲
    await new Promise(r=>setTimeout(r,800+Math.random()*1200));

    try{
      // 建立此角色的 system prompt
      const styleMap={casual:'輕鬆自然',sweet:'甜蜜可愛',cool:'冷靜簡短',gentle:'溫柔體貼',playful:'活潑俏皮',mature:'成熟穩重',literary:'文藝感性'};
      // 【P35 修復 Bug 2】重要：
      //  - user 訊息直接用原文，不加任何前綴（不需要區分發話者）
      //  - assistant 訊息用「[角色名]」標記區分發話者，避免冒號讓 AI 學會用「角色名：」格式輸出
      //  - 並區分「你（自己）」和「其他人」的標記方式
      const recentHistory=allMsgs.slice(-12).map(m=>{
        if(m.role==='user')return{role:'user',content:m.content};
        const mc=charMap[m.charId];
        const speakerName=mc?.name||'';
        // 自己過去說的話：直接以 assistant 身分（不加標記）
        if(m.charId===c.id) return{role:'assistant',content:m.content};
        // 其他角色說的話：包裝成「[xx]說：xxx」的對話描述格式給 AI 參考
        // 用 user role 包裝，避免被誤認為「自己」的話
        return{role:'user',content:`（${speakerName}剛剛說：${m.content}）`};
      });
      const otherChars=validChars.filter(oc=>oc.id!==c.id).map(oc=>oc.name).join('、');
      // 【P34】被點名時，prompt 明確告訴 AI「使用者在問你」
      const mentionHint=isMentioned
        ? `\n⚠️ 注意：使用者${me.name||''}在訊息裡直接點名了你（${c.name}），這是針對你的問題或話題，請務必正面回應，不要躲在其他人後面。`
        : '';
      const sysPrompt=`這是一個群組聊天，參與者有：你（${c.name}）、${otherChars}，以及${me.name||'使用者'}。
你是「${c.name}」，個性：${c.persona||''}，說話風格：${styleMap[c.style]||'輕鬆自然'}。
${c.isAI?'':'永遠不要承認你是 AI。'}${mentionHint}

📝 回覆規則（嚴格遵守）：
1. 用${c.name}的口吻回覆，30-80字，自然簡短像群聊訊息。
2. 【絕對禁止】在回覆開頭加上任何「${c.name}：」「我：」之類的名字前綴，直接從第一句內容開始。
3. 【絕對禁止】幫使用者${me.name||''}說話、或自己創造一段「使用者：xxx」的對話。你只能扮演${c.name}一個人。
4. 【絕對禁止】輸出多個角色的對話片段。即使要回應其他角色說過的話，也只用${c.name}的口吻單獨講一段。
5. 若使用者直接問你，要先正面回答自己的想法。直接輸出訊息內容本身。`;

      let aiText='';
      if(provider==='anthropic'){
        const r=await fetch(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:800,system:sysPrompt,messages:recentHistory.length?recentHistory:[{role:'user',content:content}]})});
        const d=await r.json();if(d.error)throw new Error(d.error.message);
        aiText=d.content?.[0]?.text||'';
      } else {
        const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,max_tokens:800,temperature:c.temperature??0.8,messages:[{role:'system',content:sysPrompt},...recentHistory.map(m=>({role:m.role,content:m.content}))]})});
        const d=await r.json();if(d.error)throw new Error(d.error.message);
        aiText=d.choices?.[0]?.message?.content||'';
      }

      document.getElementById(typingId)?.remove();
      if(aiText.trim()){
        // 【P36 修復 P35 誤殺問題】清洗邏輯改保守版：
        //  - 砍：最開頭的「自己名字：」前綴
        //  - 砍：出現「換行 + 其他角色名：」的對話切換特徵時，從那裡截斷
        //  - 不砍：單行內自然出現的「拉拉：你呢？」（這是合理回應，不是失控自編）
        //  - 保險絲：若清洗後變空字串，fallback 回原始輸出，避免誤殺
        const rawText=aiText.trim();
        let cleaned=rawText;
        // 1) 砍最開頭的「自己名字：」前綴（中英冒號，可含書名號）
        const selfPrefix=new RegExp('^[「『\\s]*'+c.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[」』]?\\s*[：:]\\s*','');
        cleaned=cleaned.replace(selfPrefix,'');
        // 2) 偵測「換行 + 其他角色/使用者名：」這種「AI 失控接著演別人」的特徵
        const cutNames=[me.name||'使用者','使用者','你',
          ...validChars.filter(oc=>oc.id!==c.id).map(oc=>oc.name)].filter(Boolean);
        let cutAt=cleaned.length;
        for(const n of cutNames){
          const escaped=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const re=new RegExp('\\n\\s*'+escaped+'\\s*[：:]');
          const m=cleaned.match(re);
          if(m && m.index<cutAt) cutAt=m.index;
        }
        cleaned=cleaned.substring(0,cutAt).trim();
        // 保險絲：清洗後為空，fallback 回原始 trim 結果（再不行就放棄這則）
        const final=cleaned||rawText;
        if(final){
          const aiMsg={id:'gm_'+Date.now()+'_'+c.id,groupId:curGroupId,role:'assistant',charId:c.id,content:final,createdAt:Date.now()};
          await dbPut('group_messages',aiMsg);
          allMsgs.push(aiMsg);// 讓後續角色看到這條
          await renderGroupMsgs();grpScrollBottom();
        }
      }
    }catch(e){
      document.getElementById(typingId)?.remove();
      console.error(e);
    }
  }
  // 更新群組時間
  g.updatedAt=Date.now();await dbPut('groups',g);
  }catch(e){
    // 外層意外（如資料庫失敗）：清除所有殘留的 typing indicator
    document.querySelectorAll('[id^="grp-typing-"]').forEach(el=>el.remove());
    console.error('sendGroupMsg error:',e);
    toast_('傳送失敗：'+e.message.substring(0,30));
  }finally{
    grpTyping=false;I('grp-send').disabled=false;
  }
}

function showGroupInfo(){
  dbGet('groups',curGroupId).then(g=>{
    if(!g)return;
    dbAll('characters').then(chars=>{
      const charMap={};chars.forEach(c=>{charMap[c.id]=c});
      const names=g.charIds.map(id=>charMap[id]?.name||'').filter(Boolean).join('、');
      toast_(`${g.name}：${names}`);
    });
  });
}


let momentsFilterChar='all',postGenning=false,curPostId=null;

async function renderMomentsPage(){
  const[chars,allPosts]=await Promise.all([dbAll('characters'),dbAll('moments')]);
  allPosts.sort((a,b)=>b.createdAt-a.createdAt);
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});

  // 篩選 chips（列出所有角色，方便為任一角色生成貼文）
  let filterHtml=`<div class="moments-chip${momentsFilterChar==='all'?' sel':''}" onclick="setMomentsFilter('all')">全部</div>`;
  chars.forEach(c=>{filterHtml+=`<div class="moments-chip${momentsFilterChar===c.id?' sel':''}" onclick="setMomentsFilter('${c.id}')">${esc(c.name)}</div>`;});
  I('moments-filter').innerHTML=filterHtml;

  // 生成面板：保持當前顯示狀態，只更新按鈕內容
  if(chars.length)updatePostGenBtn(chars,charMap);

  // 貼文列表
  const filtered=momentsFilterChar==='all'?allPosts:allPosts.filter(p=>p.charId===momentsFilterChar);
  const listEl=I('moments-list');
  if(!filtered.length){
    listEl.innerHTML=`<div class="bb-empty"><div class="bb-empty-ic"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg></div><div class="bb-empty-ttl">${!chars.length?'還沒有角色':'還沒有貼文'}</div><div class="bb-empty-sub">${!chars.length?'先新增一個角色，他才能發佈貼文':'點右上角「＋」讓他發一則貼文'}</div>${!chars.length?`<button class="empty-cta" onclick="nav_('pg-char-manage')">＋ 新增角色</button>`:''}</div>`;
    return;
  }
  listEl.innerHTML=filtered.map(p=>renderPostCard(p,charMap[p.charId])).join('');
}

function renderPostCard(p,c){
  if(!c)return'';
  const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
  const liked=p.likedByMe||false;
  const likes=p.likes||0;
  const comments=p.comments?.length||0;
  const tagsHtml=p.tags?.length?`<div class="post-tags">${p.tags.map(t=>`<span class="post-tag">#${esc(t)}</span>`).join('')}</div>`:'';
  return`<div class="post-card" id="postcard-${p.id}">
    <div class="post-card-top">
      <div class="post-av" onclick="openPostDetail('${p.id}')">${avHtml}</div>
      <div>
        <div class="post-name" onclick="openPostDetail('${p.id}')">${esc(c.name)}</div>
        <div class="post-time">${timeAgo(p.createdAt)}</div>
      </div>
    </div>
    <div class="post-body" onclick="openPostDetail('${p.id}')">${esc(p.content).replace(/\n/g,'<br>')}</div>
    ${tagsHtml}
    <div class="post-actions">
      <div class="post-like-btn${liked?' liked':''}" onclick="toggleLike('${p.id}')">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        ${likes||''}
      </div>
      <div class="post-comment-btn" onclick="openPostDetail('${p.id}')">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        ${comments||''}
      </div>
    </div>
  </div>`;
}

function setMomentsFilter(charId){momentsFilterChar=charId;renderMomentsPage();}

function showPostGenPanel(){
  const p=I('moments-gen-inline');
  p.style.display=p.style.display==='block'?'none':'block';
  if(p.style.display==='block'){
    dbAll('characters').then(chars=>{
      const charMap={};chars.forEach(c=>{charMap[c.id]=c});
      updatePostGenBtn(chars,charMap);
    });
  }
}

function updatePostGenBtn(chars,charMap){
  const btn=I('moments-gen-btn');
  if(!chars.length){return;}
  if(momentsFilterChar!=='all'&&charMap[momentsFilterChar]){
    const c=charMap[momentsFilterChar];
    I('moments-gen-label').textContent=`讓${c.name}發一則貼文`;
    btn.dataset.charId=c.id;
    btn.dataset.needPick='0';
  } else if(chars.length===1){
    const c=chars[0];
    I('moments-gen-label').textContent=`讓${c.name}發一則貼文`;
    btn.dataset.charId=c.id;
    btn.dataset.needPick='0';
  } else {
    I('moments-gen-label').textContent='選擇角色發一則貼文';
    btn.dataset.charId='';
    btn.dataset.needPick='1';
  }
}

// 角色選擇器（給貼文/日記 全部分頁多角色時用）
function showCharPicker(title,onPick){
  document.querySelectorAll('.msg-sheet,.msg-sheet-mask').forEach(el=>el.remove());
  dbAll('characters').then(chars=>{
    if(!chars.length){toast_('還沒有角色');return;}
    const mask=document.createElement('div');mask.className='msg-sheet-mask';
    const sheet=document.createElement('div');sheet.className='msg-sheet';
    const header=`<div style="padding:14px 22px 6px;font-size:13px;font-weight:400;color:var(--text-3);letter-spacing:.04em">${esc(title)}</div>`;
    const items=chars.map(c=>{
      const avHtml=c.avatar?.startsWith('data:')
        ?`<img src="${c.avatar}" style="width:28px;height:28px;border-radius:8px;object-fit:cover">`
        :`<span style="width:28px;height:28px;border-radius:8px;background:var(--bg-2,rgba(0,0,0,.04));display:flex;align-items:center;justify-content:center;font-size:16px">${esc(c.avatar||'🌸')}</span>`;
      return `<div class="msg-sheet-item" data-cid="${c.id}">${avHtml}<span>${esc(c.name)}</span></div>`;
    }).join('');
    sheet.innerHTML=header+items+`<div class="msg-sheet-cancel">取消</div>`;
    document.body.appendChild(mask);document.body.appendChild(sheet);
    requestAnimationFrame(()=>{mask.classList.add('show');sheet.classList.add('show');});
    const close=()=>{
      mask.classList.remove('show');sheet.classList.remove('show');
      setTimeout(()=>{mask.remove();sheet.remove();},250);
    };
    sheet.querySelectorAll('.msg-sheet-item').forEach(el=>{
      el.onclick=()=>{
        const cid=el.dataset.cid;close();
        setTimeout(()=>onPick(cid),100);
      };
    });
    sheet.querySelector('.msg-sheet-cancel').onclick=close;
    mask.onclick=close;
  });
}

async function generatePost(){
  if(postGenning){toast_('生成進行中，請稍候',5000);return;}
  const btn=I('moments-gen-btn');
  if(!btn){toast_('按鈕未初始化，請返回重進',6000);return;}
  // 需要先讓使用者選角色
  if(btn.dataset.needPick==='1'){
    showCharPicker('讓哪個角色發貼文？',cid=>{
      btn.dataset.charId=cid;btn.dataset.needPick='0';
      dbGet('characters',cid).then(c=>{
        if(c)I('moments-gen-label').textContent=`讓${c.name}發一則貼文`;
        generatePost();
      });
    });
    return;
  }
  const charId=btn.dataset.charId;
  if(!charId){toast_('請先選擇角色（按右上「全部」旁的角色名稱）',6500);return}
  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先到「設定 → API」設定金鑰',6500);return}
  postGenning=true;
  I('moments-gen-label').textContent='生成中…';btn.style.opacity='0.6';btn.style.pointerEvents='none';
  try{
    const c=await dbGet('characters',charId);
    const msgs=await dbIdx('messages','charId',charId);
    msgs.sort((a,b)=>b.createdAt-a.createdAt);
    // 只取主題提示（不傳對話原文，避免模型把貼文當成對話延續）
    const topicHint=msgs.slice(0,4).map(m=>m.content.substring(0,30).replace(/[「」『』""'']/g,'')).filter(Boolean).join('；');
    const provider=await getSetting('api_provider')||'openai';
    const model=await getSetting('api_model')||getDefModel(provider);
    const base=await getSetting('api_base')||getDefBase(provider);
    const n=new Date();
    const prompt=`你是「${c.name}」，個性：${c.persona||''}，說話風格：${c.style||'casual'}。
現在是 ${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}。${topicHint?`（你最近的生活關鍵字參考：${topicHint}）`:''}

任務：寫一則你本人發在社群（類似 Instagram / 朋友圈）的貼文。這是「你獨自發文」，不是對話、不是回覆任何人。

【嚴格規則 - 必須遵守】
1. 只寫一則貼文，120-180字之間，寫完一段就結束
2. 絕對不要分行寫成多句獨白、不要寫成對話、不要寫成連珠炮
3. 不要呼喊或催促讀者（如「快點啦」「等你」「我才不…」這類對話式句子）
4. 不要重複同一句話或同一種句式
5. 寫完正文後，最後一行寫：標籤：標籤1 標籤2 標籤3（2-4個，空格分隔，不加#）
6. 寫完標籤就立即停止輸出，不要繼續寫任何東西

【內容要求】
・具體場景、感受或細節，符合角色個性
・禁止「今天真好」「感謝生活」這類通用廢話
・可以淡淡情緒，但要像在寫日常貼文，不是在跟誰對話`;
    let text='';
    let postTruncated=false;
    if(provider==='anthropic'){
      const r=await fetchWithTimeout(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:2500,system:prompt,messages:[{role:'user',content:'請開始生成。'}]})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.content?.[0]?.text||'';
      if(d.stop_reason==='max_tokens')postTruncated=true;
    } else {
      const postPayload={model,max_tokens:2500,temperature:0.75,messages:[{role:'system',content:prompt},{role:'user',content:'請開始生成。'}]};
      // 只在 OpenAI 時加 penalty 參數，Gemini/Anthropic 不支援
      if(provider==='openai'){postPayload.frequency_penalty=0.6;postPayload.presence_penalty=0.3;}
      const r=await fetchWithTimeout(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify(postPayload)});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.choices?.[0]?.message?.content||'';
      if(d.choices?.[0]?.finish_reason==='length')postTruncated=true;
    }
    if(text.trim()){
      let content=text.trim(),tags=[];
      // 解析「標籤：」那行
      const tagLineMatch=content.match(/(?:^|\n)\s*標籤[：:]\s*(.+?)\s*$/);
      if(tagLineMatch){
        tags=tagLineMatch[1].split(/[\s,，、]+/).map(t=>t.replace(/^#/,'').trim()).filter(t=>t&&t.length<=10).slice(0,4);
        content=content.replace(/(?:^|\n)\s*標籤[：:].+$/,'').trim();
      }
      // JSON 相容
      if(!tags.length&&content.includes('"content"')){
        try{
          let clean=content.replace(/```json\s*/g,'').replace(/```\s*/g,'').replace(/`/g,'').trim();
          const parsed=JSON.parse(clean);
          content=parsed.content||content;tags=parsed.tags||[];
        }catch(e){}
      }

      // ── 重複迴圈偵測：把連續重複的句子砍掉 ──
      content=dedupeRepeats(content);

      const entry={id:'post_'+Date.now(),charId,content,tags,likes:0,likedByMe:false,comments:[],createdAt:Date.now()};
      await dbPut('moments',entry);
      toast_(postTruncated?'⚠ 貼文可能被截斷':'貼文已發佈 ✓');
      I('moments-gen-inline').style.display='none';
      renderMomentsPage();
    }
  }catch(e){const msg=e.message==='request_timeout'?'生成逾時（90 秒），請檢查網路或稍後再試':'生成失敗：'+e.message.substring(0,40);toast_(msg);}
  finally{
    postGenning=false;
    const chars=await dbAll('characters');const charMap={};chars.forEach(c=>{charMap[c.id]=c});
    updatePostGenBtn(chars,charMap);btn.style.opacity='';btn.style.pointerEvents='';
  }
}

async function toggleLike(postId){
  const p=await dbGet('moments',postId);if(!p)return;
  p.likedByMe=!p.likedByMe;
  p.likes=(p.likes||0)+(p.likedByMe?1:-1);
  await dbPut('moments',p);
  // 更新卡片按讚狀態（不重渲染整頁）
  const card=I('postcard-'+postId);
  if(card){
    const btn=card.querySelector('.post-like-btn');
    if(btn){
      btn.classList.toggle('liked',p.likedByMe);
      btn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>${p.likes||''}`;
    }
  }
  // 若在詳情頁也更新
  if(curPostId===postId)renderPostDetailLike(p);
}

async function openPostDetail(postId){
  curPostId=postId;
  const p=await dbGet('moments',postId);if(!p)return;
  const c=await dbGet('characters',p.charId);if(!c)return;
  renderPostDetailPage(p,c);
  nav_('pg-post-detail');
}

function renderPostDetailPage(p,c){
  const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
  const liked=p.likedByMe||false;
  const likes=p.likes||0;
  const tagsHtml=p.tags?.length?`<div class="post-tags" style="margin-top:10px">${p.tags.map(t=>`<span class="post-tag">#${esc(t)}</span>`).join('')}</div>`:'';
  const commentsHtml=(p.comments||[]).map(cm=>{
    const isMe=cm.role==='user';
    const me=cm.userName||'你';
    return`<div class="post-comment-item">
      <div class="comment-av" style="${isMe?'background:var(--surface3)':''}">${isMe?'🙂':avHtml}</div>
      <div class="comment-body">
        <div class="comment-name">${esc(isMe?me:c.name)}</div>
        <div class="comment-text">${esc(cm.content).replace(/\n/g,'<br>')}</div>
        <div class="comment-time">${timeAgo(cm.createdAt)}</div>
      </div>
    </div>`;
  }).join('');

  I('post-detail-content').innerHTML=`
    <div class="post-detail-body">
      <div class="post-card-top">
        <div class="post-av">${avHtml}</div>
        <div><div class="post-name">${esc(c.name)}</div><div class="post-time">${timeAgo(p.createdAt)}</div></div>
      </div>
      <div class="post-body" style="cursor:default">${esc(p.content).replace(/\n/g,'<br>')}</div>
      ${tagsHtml}
      <div class="post-actions" style="margin-top:12px">
        <div class="post-like-btn${liked?' liked':''}" id="detail-like-btn" onclick="toggleLike('${p.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span id="detail-like-count">${likes||''}</span>
        </div>
      </div>
    </div>
    <div class="post-comments" id="post-comments-list">
      ${commentsHtml||`<div style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3)">還沒有留言，說點什麼吧</div>`}
    </div>`;
}

function renderPostDetailLike(p){
  const btn=I('detail-like-btn');
  const cnt=I('detail-like-count');
  if(btn){btn.classList.toggle('liked',p.likedByMe);}
  if(cnt)cnt.textContent=p.likes||'';
}

async function submitComment(){
  const inp=I('post-comment-in'),text=inp.value.trim();
  if(!text||!curPostId)return;
  const me=await getSetting('me_settings')||{};
  const p=await dbGet('moments',curPostId);if(!p)return;
  const c=await dbGet('characters',p.charId);if(!c)return;
  // 加使用者留言
  const userComment={role:'user',userName:me.name||'你',content:text,createdAt:Date.now()};
  if(!p.comments)p.comments=[];
  p.comments.push(userComment);
  await dbPut('moments',p);
  inp.value='';inp.style.height='auto'; // 【P34】textarea 送出後重置高度
  renderPostDetailPage(p,c);
  // 角色回覆（背景生成）
  generateCommentReply(p,c,text).catch(()=>{});
}

async function generateCommentReply(p,c,userComment){
  const apiKey=await getSetting('api_key');if(!apiKey)return;
  const provider=await getSetting('api_provider')||'openai';
  const model=await getSetting('api_model')||getDefModel(provider);
  const base=await getSetting('api_base')||getDefBase(provider);
  const me=await getSetting('me_settings')||{};
  const prompt=`你是「${c.name}」，個性：${c.persona||''}。你剛發了一則貼文：「${p.content.substring(0,80)}」。
${me.name||'對方'}留言說：「${userComment}」
請用角色口吻回覆這則留言，30字以內，自然簡短，像社群留言回覆的語氣。直接輸出回覆內容，不加引號。`;
  try{
    let text='';
    if(provider==='anthropic'){
      const r=await fetch(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:200,messages:[{role:'user',content:prompt}]})});
      const d=await r.json();text=d.content?.[0]?.text||'';
    } else {
      const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,max_tokens:200,temperature:0.85,messages:[{role:'user',content:prompt}]})});
      const d=await r.json();text=d.choices?.[0]?.message?.content||'';
    }
    if(text.trim()){
      const fresh=await dbGet('moments',p.id);if(!fresh)return;
      fresh.comments.push({role:'assistant',content:text.trim(),createdAt:Date.now()});
      await dbPut('moments',fresh);
      if(curPostId===p.id){
        renderPostDetailPage(fresh,c);
      }
    }
  }catch(e){/* 靜默 */}
}


let bbFilterChar='all';

async function openBlackbox(){
  bbFilterChar='all';
  nav_('pg-blackbox');
}

async function updateBBHomeSub(){
  const [chars,all]=await Promise.all([dbAll('characters'),dbAll('memories')]);
  const charIds=new Set(chars.map(c=>c.id));
  const valid=all.filter(m=>charIds.has(m.charId));
  const sub=I('bb-home-sub');
  if(!sub)return;
  if(!valid.length){sub.textContent='內心活動';return;}
  sub.textContent=`${valid.length} 則心聲`;
}

async function renderBlackbox(){
  const [chars,allMem]=await Promise.all([dbAll('characters'),dbAll('memories')]);
  allMem.sort((a,b)=>b.createdAt-a.createdAt);

  // 角色 map
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});

  // 篩選器
  const filterEl=I('bb-filter');
  const charsWithMem=[...new Set(allMem.map(m=>m.charId))].map(id=>charMap[id]).filter(Boolean);
  let filterHtml=`<div class="bb-chip${bbFilterChar==='all'?' sel':''}" onclick="setBBFilter('all')">全部</div>`;
  charsWithMem.forEach(c=>{
    filterHtml+=`<div class="bb-chip${bbFilterChar===c.id?' sel':''}" onclick="setBBFilter('${c.id}')">${esc(c.name)}</div>`;
  });
  filterEl.innerHTML=filterHtml;

  // 計數
  const filtered=bbFilterChar==='all'?allMem:allMem.filter(m=>m.charId===bbFilterChar);
  I('bb-count').textContent=filtered.length?`${filtered.length} 則`:'';

  // 列表
  const listEl=I('bb-list');
  if(!filtered.length){
    const isEmpty=!allMem.length;
    listEl.innerHTML=`
      <div class="bb-empty">
        <div class="bb-empty-ic"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <div class="bb-empty-ttl">${isEmpty?'還沒有心聲':'這個角色還沒有心聲'}</div>
        <div class="bb-empty-sub">${isEmpty?'開啟角色設定中的「Heart Voice」\n與他對話後，他的內心話會出現在這裡':'繼續和他聊天，他的心聲\n會悄悄記錄在這裡'}</div>
      </div>`;
    return;
  }

  listEl.innerHTML=filtered.map(m=>{
    const c=charMap[m.charId];
    if(!c)return'';
    const avHtml=c.avatar?.startsWith('data:')
      ?`<img src="${c.avatar}">`
      :esc(c.avatar||'🌸');
    return`
    <div class="bb-entry">
      <div class="bb-av">${avHtml}</div>
      <div class="bb-body">
        <div class="bb-meta">
          <span class="bb-name">${esc(c.name)}</span>
          <span class="bb-time">${timeAgo(m.createdAt)}</span>
        </div>
        <div class="bb-tag">heart voice</div>
        <div class="bb-text">${esc(m.content).replace(/\n/g,'<br>')}</div>
      </div>
    </div>`;
  }).join('');
}

function setBBFilter(charId){
  bbFilterChar=charId;
  renderBlackbox();
}

/* ═══════════════════════════════
   日記
═══════════════════════════════ */
let diaryFilterChar='all',diaryGenning=false;

async function openDiary(){diaryFilterChar='all';nav_('pg-diary');}

async function updateDiaryHomeSub(){
  const sub=I('diary-home-sub');if(!sub)return;
  const today=todayStr();
  const all=await dbAll('diary');
  sub.textContent=all.filter(d=>d.date===today).length?'今日已生成':'今日未生成';
}

function todayStr(){
  const d=new Date();
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(dateStr){
  if(!dateStr)return'';
  const[y,m,d]=dateStr.split('-');
  const weekdays=['日','一','二','三','四','五','六'];
  const dt=new Date(+y,+m-1,+d);
  return`${y} 年 ${+m} 月 ${+d} 日　星期${weekdays[dt.getDay()]}`;
}

async function renderDiaryPage(){
  const[chars,allDiary]=await Promise.all([dbAll('characters'),dbAll('diary')]);
  allDiary.sort((a,b)=>b.createdAt-a.createdAt);
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});
  // 篩選 chips（列出所有角色，方便為任一角色生成日記）
  let filterHtml=`<div class="diary-chip${diaryFilterChar==='all'?' sel':''}" onclick="setDiaryFilter('all')">全部</div>`;
  chars.forEach(c=>{filterHtml+=`<div class="diary-chip${diaryFilterChar===c.id?' sel':''}" onclick="setDiaryFilter('${c.id}')">${esc(c.name)}</div>`;});
  I('diary-filter').innerHTML=filterHtml;
  // 生成面板：保持當前顯示狀態，只更新按鈕內容
  if(chars.length){
    updateDiaryGenBtn(chars,charMap);
  } else {
    I('diary-gen-inline').style.display='none';
  }
  // 條目
  const filtered=diaryFilterChar==='all'?allDiary:allDiary.filter(d=>d.charId===diaryFilterChar);
  const listEl=I('diary-list');
  if(!filtered.length){
    listEl.innerHTML=`<div class="bb-empty"><div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div><div class="bb-empty-ttl">${!chars.length?'還沒有角色':'還沒有日記'}</div><div class="bb-empty-sub">${!chars.length?'先新增一個角色，他才能寫日記':'點右上角「＋ 生成」讓他寫今天的日記'}</div>${!chars.length?`<button class="empty-cta" onclick="nav_('pg-char-manage')">＋ 新增角色</button>`:''}</div>`;
    return;
  }
  listEl.innerHTML=filtered.map(d=>{
    const c=charMap[d.charId];if(!c)return'';
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
    const lines=d.content.split('\n').filter(l=>l.trim());
    const titleLine=lines[0]||'無題';
    const preview=lines.slice(1).join(' ')||d.content;
    return`<div class="diary-card" onclick="openDiaryDetail('${d.id}')">
      <div class="diary-card-top">
        <div class="diary-card-av">${avHtml}</div>
        <div class="diary-card-meta"><div class="diary-card-name">${esc(c.name)}</div><div class="diary-card-date">${fmtDate(d.date)}</div></div>
      </div>
      <div class="diary-card-body">
        <div class="diary-card-title">${esc(titleLine)}</div>
        <div class="diary-card-preview">${esc(preview)}</div>
      </div>
      <div class="diary-card-footer"><span class="diary-card-mood">${d.mood||'📔'}</span><span class="diary-card-read">閱讀全文</span></div>
    </div>`;
  }).join('');
}

function updateDiaryGenBtn(chars,charMap){
  const btn=I('diary-gen-btn');
  if(!chars.length){return;}
  if(diaryFilterChar!=='all'&&charMap[diaryFilterChar]){
    const c=charMap[diaryFilterChar];
    I('diary-gen-label').textContent=`為${c.name}寫今天的日記`;
    btn.dataset.charId=c.id;
    btn.dataset.needPick='0';
  } else if(chars.length===1){
    const c=chars[0];
    I('diary-gen-label').textContent=`為${c.name}寫今天的日記`;
    btn.dataset.charId=c.id;
    btn.dataset.needPick='0';
  } else {
    I('diary-gen-label').textContent='選擇角色寫今天的日記';
    btn.dataset.charId='';
    btn.dataset.needPick='1';
  }
}
function setDiaryFilter(charId){diaryFilterChar=charId;renderDiaryPage();}
function showDiaryGenPanel(){
  const p=I('diary-gen-inline');
  p.style.display=p.style.display==='none'?'block':'none';
  // 開啟面板時主動更新按鈕資料（修：原本沒呼叫 updateDiaryGenBtn 導致 charId 是空）
  if(p.style.display==='block'){
    dbAll('characters').then(chars=>{
      const charMap={};chars.forEach(c=>{charMap[c.id]=c});
      updateDiaryGenBtn(chars,charMap);
    });
  }
}

async function generateDiary(){
  if(diaryGenning){toast_('生成進行中，請稍候',5000);return;}
  const btn=I('diary-gen-btn');
  if(!btn){toast_('按鈕未初始化，請返回重進',6000);return;}
  if(btn.dataset.needPick==='1'){
    showCharPicker('為哪個角色寫日記？',cid=>{
      btn.dataset.charId=cid;btn.dataset.needPick='0';
      dbGet('characters',cid).then(c=>{
        if(c)I('diary-gen-label').textContent=`為${c.name}寫今天的日記`;
        generateDiary();
      });
    });
    return;
  }
  const charId=btn.dataset.charId;
  if(!charId){toast_('請先選擇角色（按右上「全部」旁的角色名稱）',6500);return}
  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先到「設定 → API」設定金鑰',6500);return}
  const today=todayStr();
  const existing=await dbIdx('diary','charId',charId);
  if(existing.find(d=>d.date===today)){toast_('今天已經生成過日記了');return;}
  diaryGenning=true;
  I('diary-gen-label').textContent='生成中…';btn.style.opacity='0.6';btn.style.pointerEvents='none';
  try{
    const c=await dbGet('characters',charId);
    const me=await getSetting('me_settings')||{};
    const msgs=await dbIdx('messages','charId',charId);
    msgs.sort((a,b)=>b.createdAt-a.createdAt);
    const recentChat=msgs.slice(0,8).reverse().map(m=>`${m.role==='user'?(me.name||'你'):c.name}：${m.content.substring(0,60)}`).join('\n');
    const provider=await getSetting('api_provider')||'openai';
    const model=await getSetting('api_model')||getDefModel(provider);
    const base=await getSetting('api_base')||getDefBase(provider);
    const n=new Date();
    const weekdays=['日','一','二','三','四','五','六'];
    const sysPrompt=`你是「${c.name}」。個性：${c.persona||''}。
今天是 ${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日，星期${weekdays[n.getDay()]}。
${recentChat?`今天和對方的對話內容：\n${recentChat}\n`:''}
請以角色的第一人稱，用繁體中文寫今天的日記。

【日記品質要求】
・要有具體的事件、細節或感受，不能只寫抽象心情
・文字要有角色自己的聲音和語氣，不能像模板或作文
・可以有矛盾、糾結、沒說出口的話，讓日記有真實的層次
・禁止使用「今天過得很充實」「學到了很多」「期待明天」等空洞結語
・正文 200-300 字，情感要流動，不要分條列點

格式：
第一行：日記標題（一句有畫面感的話，不要用問號，不要加引號）
（空行）
日記正文
（空行）
最後一行：單一心情 emoji`;
    let text='';
    let diaryTruncated=false;
    if(provider==='anthropic'){
      const r=await fetchWithTimeout(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:2500,system:sysPrompt,messages:[{role:'user',content:'請開始寫日記。'}]})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.content?.[0]?.text||'';
      if(d.stop_reason==='max_tokens')diaryTruncated=true;
    } else {
      const diaryPayload={model,max_tokens:2500,temperature:0.78,messages:[{role:'system',content:sysPrompt},{role:'user',content:'請開始寫日記。'}]};
      if(provider==='openai'){diaryPayload.frequency_penalty=0.5;diaryPayload.presence_penalty=0.2;}
      const r=await fetchWithTimeout(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify(diaryPayload)});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.choices?.[0]?.message?.content||'';
      if(d.choices?.[0]?.finish_reason==='length')diaryTruncated=true;
    }
    if(text.trim()){
      text=dedupeRepeats(text);
      const lines=text.trim().split('\n');
      let mood='📔';
      const lastLine=lines[lines.length-1].trim();
      if([...lastLine].length<=2&&/\p{Emoji}/u.test(lastLine)){mood=lastLine;lines.pop();}
      const entry={id:'diary_'+Date.now(),charId,date:today,content:lines.join('\n').trim(),mood,createdAt:Date.now()};
      await dbPut('diary',entry);
      toast_(diaryTruncated?'⚠ 日記可能被截斷':'日記已生成 ✓');renderDiaryPage();updateDiaryHomeSub();
    }
  }catch(e){const msg=e.message==='request_timeout'?'生成逾時（90 秒），請檢查網路或稍後再試':'生成失敗：'+e.message.substring(0,40);toast_(msg);}
  finally{
    diaryGenning=false;
    const chars=await dbAll('characters');const charMap={};chars.forEach(c=>{charMap[c.id]=c});
    updateDiaryGenBtn(chars,charMap);btn.style.opacity='';btn.style.pointerEvents='';
  }
}

async function openDiaryDetail(id){
  const d=await dbGet('diary',id);if(!d)return;
  const c=await dbGet('characters',d.charId);if(!c)return;
  const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
  const lines=d.content.split('\n').filter(l=>l.trim());
  let title=lines[0]||'日記';
  // 移除 Markdown 符號
  title=title.replace(/\*\*/g,'').replace(/\*/g,'').replace(/^#+\s*/,'');
  const body=lines.slice(1).join('\n').trim();
  I('diary-detail-content').innerHTML=`
    <div class="diary-detail-header">
      <div class="diary-detail-av-row">
        <div class="diary-detail-av">${avHtml}</div>
        <div><div class="diary-detail-name">${esc(c.name)}</div><div class="diary-detail-date">${fmtDate(d.date)}</div></div>
        <span style="margin-left:auto;font-size:22px">${d.mood||'📔'}</span>
      </div>
      <div class="diary-detail-title">${esc(title)}</div>
    </div>
    <div class="diary-detail-body">${esc(body).replace(/\n/g,'<br>')}</div>`;
  nav_('pg-diary-detail');
}

/* ═══════════════════════════════
   夢境
═══════════════════════════════ */
let dreamSelCharId=null,dreamGenning=false;

async function openDream(){dreamSelCharId=null;nav_('pg-dream');}

async function updateDreamHomeSub(){
  const sub=I('dream-home-sub');if(!sub)return;
  const all=await dbAll('dreams');
  sub.textContent=all.length?`${all.length} 則夢境`:'點擊生成';
}

async function renderDreamPage(){
  const[chars,allDreams]=await Promise.all([dbAll('characters'),dbAll('dreams')]);
  allDreams.sort((a,b)=>b.createdAt-a.createdAt);
  const charMap={};chars.forEach(c=>{charMap[c.id]=c});
  // 角色選擇
  const selEl=I('dream-char-sel');
  if(!chars.length){
    selEl.innerHTML=`<span style="font-size:12px;font-weight:300;color:var(--text-3)">先新增角色才能生成夢境</span>`;
  } else {
    if(!dreamSelCharId)dreamSelCharId=chars[0].id;
    selEl.innerHTML=chars.map(c=>{
      const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
      return`<div class="dream-char-btn${dreamSelCharId===c.id?' sel':''}" onclick="selDreamChar('${c.id}')">
        <div class="dream-char-btn-av">${avHtml}</div>
        <div class="dream-char-btn-name">${esc(c.name)}</div>
      </div>`;
    }).join('');
  }
  // 夢境列表
  const listEl=I('dream-list');
  if(!allDreams.length){
    listEl.innerHTML=`<div class="bb-empty" style="padding-top:24px"><div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div><div class="bb-empty-ttl">還沒有夢境紀錄</div><div class="bb-empty-sub">選擇角色，讓他告訴你\n他今晚夢見了什麼</div></div>`;
    return;
  }
  listEl.innerHTML=allDreams.map(d=>{
    const c=charMap[d.charId];if(!c)return'';
    const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
    return`<div class="dream-entry" onclick="openDreamDetail('${d.id}')">
      <div class="dream-entry-top">
        <div class="dream-entry-av">${avHtml}</div>
        <span class="dream-entry-name">${esc(c.name)}</span>
        <span class="dream-entry-time">${timeAgo(d.createdAt)}</span>
      </div>
      <div class="dream-entry-text">${esc(d.content)}</div>
    </div>`;
  }).join('');
}

function selDreamChar(charId){
  dreamSelCharId=charId;
  document.querySelectorAll('.dream-char-btn').forEach(el=>{
    el.classList.toggle('sel',el.getAttribute('onclick')===`selDreamChar('${charId}')`);
  });
}

async function generateDream(){
  if(dreamGenning){toast_('生成進行中，請稍候',5000);return;}
  if(!dreamSelCharId){toast_('請先選擇角色',5500);return;}
  const apiKey=await getSetting('api_key');
  if(!apiKey){toast_('請先到「設定 → API」設定金鑰',6500);return}
  dreamGenning=true;
  const btn=I('dream-trigger-btn');
  btn.disabled=true;
  btn.innerHTML=`<div class="gen-loading"><div class="gen-dot"></div><div class="gen-dot"></div><div class="gen-dot"></div></div>`;
  try{
    const c=await dbGet('characters',dreamSelCharId);
    const msgs=await dbIdx('messages','charId',dreamSelCharId);
    msgs.sort((a,b)=>b.createdAt-a.createdAt);
    const recentTopics=msgs.slice(0,6).map(m=>m.content.substring(0,40)).join('、');
    const provider=await getSetting('api_provider')||'openai';
    const model=await getSetting('api_model')||getDefModel(provider);
    const base=await getSetting('api_base')||getDefBase(provider);
    const prompt=`你是「${c.name}」，個性：${c.persona||''}。
${recentTopics?`最近聊過的話題：${recentTopics}。`:''}

請用第一人稱，寫一段完整、飄渺、詩意的夢境敘述。夢境可以與最近的話題有若有似無的關聯，也可以完全陌生的意象。

【夢境品質要求】
・要有具體的畫面、感官細節（顏色、聲音、溫度、氣味），不能只說「我夢見…」然後沒有細節
・夢的邏輯可以跳躍、矛盾、不合理，這才是夢
・語氣是清醒後回想的感覺，有些模糊，有些片段特別清晰
・不要解釋夢的象徵意義，直接描述所見所感所聞
・禁止使用「美麗的夢境」「奇異的感覺」「醒來後若有所思」等陳腔濫調
・150-220字，寫完整，不要截斷

直接輸出夢境文字，不要加標題或說明。`;
    let text='';
    let dreamTruncated=false;
    if(provider==='anthropic'){
      const r=await fetchWithTimeout(`${base}/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:2500,system:prompt,messages:[{role:'user',content:'請開始描述夢境。'}]})});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.content?.[0]?.text||'';
      if(d.stop_reason==='max_tokens')dreamTruncated=true;
    } else {
      const dreamPayload={model,max_tokens:2500,temperature:0.88,messages:[{role:'system',content:prompt},{role:'user',content:'請開始描述夢境。'}]};
      if(provider==='openai'){dreamPayload.frequency_penalty=0.5;dreamPayload.presence_penalty=0.2;}
      const r=await fetchWithTimeout(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify(dreamPayload)});
      const d=await r.json();if(d.error)throw new Error(d.error.message);
      text=d.choices?.[0]?.message?.content||'';
      if(d.choices?.[0]?.finish_reason==='length')dreamTruncated=true;
    }
    if(text.trim()){
      text=dedupeRepeats(text);
      const entry={id:'dream_'+Date.now(),charId:dreamSelCharId,content:text.trim(),createdAt:Date.now()};
      await dbPut('dreams',entry);
      toast_(dreamTruncated?'⚠ 夢境可能被截斷':'夢境已記錄 ✦');renderDreamPage();updateDreamHomeSub();
    }
  }catch(e){const msg=e.message==='request_timeout'?'生成逾時（90 秒），請檢查網路或稍後再試':'生成失敗：'+e.message.substring(0,40);toast_(msg);}
  finally{dreamGenning=false;btn.disabled=false;btn.textContent='生成今晚的夢境';}
}

async function openDreamDetail(id){
  const d=await dbGet('dreams',id);if(!d)return;
  const c=await dbGet('characters',d.charId);if(!c)return;
  const avHtml=c.avatar?.startsWith('data:')?`<img src="${c.avatar}">`:(c.avatar||'🌸');
  const dt=new Date(d.createdAt);
  const timeStr=`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}  ${fmtT(d.createdAt)}`;
  I('dream-detail-content').innerHTML=`
    <div class="dream-detail-wrap">
      <div class="dream-detail-av-row">
        <div class="dream-detail-av">${avHtml}</div>
        <div class="dream-detail-meta"><div class="dream-detail-name">${esc(c.name)}</div><div class="dream-detail-time">${timeStr}</div></div>
      </div>
      <div class="dream-detail-text">${esc(d.content).replace(/\n/g,'<br>')}</div>
    </div>`;
  nav_('pg-dream-detail');
}


async function loadMePage(){
  const me=await getSetting('me_settings')||{};
  ['name','age','job','persona','note'].forEach(k=>{const el=I('me-'+k);if(el)el.value=me[k]||''});
}
async function saveMe(){
  const me={};
  ['name','age','job','persona','note'].forEach(k=>{const el=I('me-'+k);if(el)me[k]=el.value.trim()});
  await setSetting('me_settings',me);
  toast_('我的設定已儲存');
  I('me-name-val').textContent=me.name||'未設定';
  back();
}

/* ═══════════════════════════════
   API 設定
═══════════════════════════════ */
const MODELS={
  openai:[
    {id:'gpt-5.5',name:'GPT-5.5',desc:'最新旗艦，最強'},
    {id:'gpt-5.4',name:'GPT-5.4',desc:'專業工作推薦'},
    {id:'gpt-5.4-mini',name:'GPT-5.4 mini',desc:'速度快，費用低，推薦'},
    {id:'gpt-4o',name:'GPT-4o',desc:'舊版旗艦，仍可用'},
  ],
  anthropic:[
    {id:'claude-opus-4-7',name:'Claude Opus 4.7',desc:'最新旗艦（4/16 發布）'},
    {id:'claude-opus-4-6',name:'Claude Opus 4.6',desc:'推薦，穩定'},
    {id:'claude-sonnet-4-6',name:'Claude Sonnet 4.6',desc:'推薦日常使用'},
    {id:'claude-haiku-4-5-20251001',name:'Claude Haiku 4.5',desc:'最快最省'},
  ],
  google:[
    {id:'gemini-2.5-flash',name:'Gemini 2.5 Flash',desc:'推薦,快速穩定'},
    {id:'gemini-2.5-flash-lite',name:'Gemini 2.5 Flash-Lite',desc:'最快最省'},
    {id:'gemini-2.5-pro',name:'Gemini 2.5 Pro',desc:'複雜任務'},
    {id:'gemini-3-flash-preview',name:'Gemini 3 Flash (預覽)',desc:'最新前沿性能'},
  ],
};
const HINTS={openai:'前往 platform.openai.com 申請，格式：sk-…',anthropic:'前往 console.anthropic.com 申請，格式：sk-ant-…',google:'前往 aistudio.google.com 申請'};
const DEF_BASE={openai:'https://api.openai.com/v1',anthropic:'https://api.anthropic.com/v1',google:'https://generativelanguage.googleapis.com/v1beta/openai'};
function getDefModel(p){return MODELS[p]?.[0]?.id||'gpt-4o'}
function getDefBase(p){return DEF_BASE[p]||DEF_BASE.openai}
let selModel='gpt-4o';

async function loadApiPage(){
  const provider=await getSetting('api_provider')||'openai';
  const key=await getSetting('api_key')||'';
  const model=await getSetting('api_model')||getDefModel(provider);
  const base=await getSetting('api_base')||'';
  selModel=model;
  I('api-provider').value=provider;I('api-key').value=key;I('api-base').value=base;
  renderModelList(provider,model);
  I('api-key-hint').textContent=HINTS[provider]||'';
  updateApiBar(!!key);
}
function onProviderChange(){
  const p=I('api-provider').value;
  selModel=getDefModel(p);
  renderModelList(p,selModel);
  I('api-key-hint').textContent=HINTS[p]||'';
}
function renderModelList(provider,current){
  I('model-list').innerHTML=(MODELS[provider]||[]).map(m=>`
    <div class="model-opt${m.id===current?' sel':''}" onclick="pickModel('${m.id}',this)">
      <div class="m-radio"><div class="m-radio-in"></div></div>
      <div class="m-info"><div class="m-name">${m.name}</div><div class="m-desc">${m.desc}</div></div>
    </div>`).join('');
}
function pickModel(id,el){
  selModel=id;
  document.querySelectorAll('.model-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
}
function updateApiBar(ok){
  const bar=I('api-status-bar');bar.className='api-bar '+(ok?'ok':'err');
  I('api-bar-msg').textContent=ok?'API 金鑰已設定':'尚未設定 API 金鑰';
}
async function saveApi(){
  const provider=I('api-provider').value,key=I('api-key').value.trim(),base=I('api-base').value.trim();
  await setSetting('api_provider',provider);
  await setSetting('api_key',key);
  await setSetting('api_model',selModel);
  await setSetting('api_base',base);
  updateApiBar(!!key);
  updateSettingsUI();
  toast_(key?'設定已儲存':'設定已儲存（尚未填入 API 金鑰）');
}
async function testApi(){
  const btn=I('test-btn');
  const key=I('api-key').value.trim();

  // 先檢查 key 是否為空
  if(!key){
    toast_('請先填入 API 金鑰');
    updateApiBar(false);
    return;
  }

  btn.textContent='測試中…';btn.disabled=true;
  const provider=I('api-provider').value;
  const base=I('api-base').value.trim()||getDefBase(provider);

  try{
    let ok=false;
    let errMsg='';

    if(provider==='anthropic'){
      const r=await fetch(`${base}/messages`,{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model:selModel,max_tokens:10,messages:[{role:'user',content:'hi'}]})
      });
      const d=await r.json();
      if(!r.ok){
        errMsg=d.error?.message||`HTTP ${r.status}`;
        ok=false;
      } else {
        ok=!d.error;
      }
    } else {
      const r=await fetch(`${base}/chat/completions`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
        body:JSON.stringify({model:selModel,max_tokens:10,messages:[{role:'user',content:'hi'}]})
      });
      const d=await r.json();
      if(!r.ok){
        errMsg=d.error?.message||`HTTP ${r.status}`;
        ok=false;
      } else {
        ok=!d.error;
      }
    }

    if(ok){
      toast_('✓ 連線成功！');
      updateApiBar(true);
    } else {
      toast_('✗ '+(errMsg||'API 回應異常，請確認金鑰'));
      updateApiBar(false);
    }
  } catch(e){
    toast_('連線失敗：'+e.message.substring(0,40));
    updateApiBar(false);
  } finally{
    btn.textContent='測試連線';btn.disabled=false;
  }
}

/* ═══════════════════════════════
   設定頁狀態更新
═══════════════════════════════ */
async function updateSettingsUI(){
  const chars=await dbAll('characters');
  const cv=I('char-count-val');if(cv)cv.textContent=chars.length?`${chars.length} 個角色`:'尚未建立';
  const key=await getSetting('api_key');
  const av=I('api-status-val');if(av){av.style.color=key?'var(--green)':'var(--red)';av.textContent=key?'已設定':'未設定'}
  const me=await getSetting('me_settings')||{};
  const mnv=I('me-name-val');if(mnv)mnv.textContent=me.name||'未設定';
  renderThemePicker();
}

/* ═══════════════════════════════
   資料匯出/匯入
═══════════════════════════════ */
async function exportData(){
  const[chars,msgs,settings]=await Promise.all([dbAll('characters'),dbAll('messages'),dbAll('settings')]);
  const blob=new Blob([JSON.stringify({version:2,exportedAt:Date.now(),characters:chars,messages:msgs,settings},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`auris-backup-${new Date().toISOString().split('T')[0]}.json`;a.click();
  toast_('資料已匯出');
}
async function importData(){
  const input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=async e=>{
    try{
      const text=await e.target.files[0].text(),data=JSON.parse(text);
      if(!data.version)throw new Error('格式錯誤');
      for(const c of data.characters||[])await dbPut('characters',c);
      for(const m of data.messages||[])await dbPut('messages',m);
      for(const s of data.settings||[])await dbPut('settings',s);
      toast_('匯入成功');updateSettingsUI();updateHomeChatCard();
    } catch(e){toast_('匯入失敗：'+e.message)}
  };
  input.click();
}

/* ═══════════════════════════════
   鍵盤 / visualViewport 處理
═══════════════════════════════ */
(function(){
  if(!window.visualViewport)return;
  let lastH=window.visualViewport.height;
  window.visualViewport.addEventListener('resize',()=>{
    const h=window.visualViewport.height;
    const diff=lastH-h;
    lastH=h;
    if(diff>100){
      ['chat-scroll','grp-scroll'].forEach(id=>{
        const el=I(id);
        if(el)setTimeout(()=>{el.scrollTop=el.scrollHeight},60);
      });
    }
  });
})();

/* ═══════════════════════════════
   PWA Icon 動態生成
═══════════════════════════════ */

(function(){
  try{
    const c=document.createElement('canvas');
    c.width=c.height=192;
    const ctx=c.getContext('2d');
    // 圓角矩形背景
    const r=42;
    ctx.beginPath();
    ctx.moveTo(r,0);ctx.lineTo(192-r,0);ctx.quadraticCurveTo(192,0,192,r);
    ctx.lineTo(192,192-r);ctx.quadraticCurveTo(192,192,192-r,192);
    ctx.lineTo(r,192);ctx.quadraticCurveTo(0,192,0,192-r);
    ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);
    ctx.closePath();
    ctx.fillStyle='#f7f5f2';ctx.fill();
    // 文字 A
    ctx.fillStyle='#c9887a';
    ctx.font='italic 300 96px Georgia,serif';
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('A',96,134);
    const png=c.toDataURL('image/png');
    // 設定 Apple Touch Icon
    const atiEl=document.getElementById('ati');
    if(atiEl) atiEl.href=png;
    // 設定 Favicon
    const favEl=document.getElementById('fav');
    if(favEl) favEl.href=png;
    // 動態生成 manifest.json（跟當前主題同步）
    const curT=THEMES.find(t=>t.id===curTheme)||THEMES[0];
    const manifest={
      name:'Auris',
      short_name:'Auris',
      description:'你說，他在聽',
      start_url:'./',
      display:'standalone',
      background_color:curT.bg,
      theme_color:curT.bg,
      icons:[
        {src:png,sizes:'192x192',type:'image/png'},
        {src:png,sizes:'512x512',type:'image/png'}
      ]
    };
    const manifestBlob=new Blob([JSON.stringify(manifest)],{type:'application/json'});
    const manifestURL=URL.createObjectURL(manifestBlob);
    const manifestLink=document.getElementById('manifest-link');
    if(manifestLink) manifestLink.href=manifestURL;
  }catch(e){console.error('PWA Icon generation failed:',e)}
})();


/* ═══════════════════════════════
   新手嚮導
═══════════════════════════════ */
const OB_DONE_KEY='auris_ob_done';
let obStep=0,obProv='openai',obSelEmoji='🌸';
const OB_TOTAL=4;
const OB_HINTS={openai:'前往 platform.openai.com 申請，格式：sk-…',anthropic:'前往 console.anthropic.com 申請，格式：sk-ant-…',google:'前往 aistudio.google.com 申請'};
const OB_EMOJIS=['🌸','🌙','⭐','🍀','🎀','🌿','🦋','🌺','💎','🕊️','🌷','🍃'];

async function checkOnboarding(){
  const done=localStorage.getItem(OB_DONE_KEY);
  if(done)return;
  const key=await getSetting('api_key');
  const chars=await dbAll('characters');
  if(key&&chars.length)return;// 已設定過就不顯示
  // 初始化 emoji 選擇器
  const row=I('ob-emoji-row');
  if(row)row.innerHTML=OB_EMOJIS.map(e=>`<div onclick="obPickEmoji('${e}',this)" style="font-size:22px;cursor:pointer;padding:4px;border-radius:8px;border:1.5px solid transparent;transition:all .15s" class="ob-emoji-opt${e===obSelEmoji?' ob-emoji-sel':''}" data-emoji="${e}">${e}</div>`).join('');
  obPickEmoji(obSelEmoji,null);
  I('onboarding').classList.remove('hidden');
}

function obPickEmoji(emoji,el){
  obSelEmoji=emoji;
  document.querySelectorAll('.ob-emoji-opt').forEach(e=>{
    const sel=e.dataset.emoji===emoji;
    e.style.borderColor=sel?'var(--rose)':'transparent';
    e.style.background=sel?'var(--rose-pale)':'transparent';
  });
}

function obSelProv(p){
  obProv=p;
  ['openai','anthropic','google'].forEach(id=>{
    I('ob-prov-'+id)?.classList.toggle('sel',id===p);
  });
  I('ob-key-hint').textContent=OB_HINTS[p]||'';
}

function obGoTo(idx){
  const cur=I('ob-'+obStep);
  const next=I('ob-'+idx);
  if(cur){cur.classList.remove('active');cur.classList.add('exit');setTimeout(()=>cur.classList.remove('exit'),350);}
  if(next){next.classList.add('active');}
  obStep=idx;
  // 更新 dots
  for(let i=0;i<OB_TOTAL;i++){
    I('obdot-'+i)?.classList.toggle('active',i===idx);
  }
  // 更新按鈕文字
  const btn=I('ob-next-btn');
  if(idx===0)btn.textContent='開始設定';
  else if(idx===1)btn.textContent='儲存並繼續';
  else if(idx===2)btn.textContent='建立角色';
  else btn.textContent='開始對話 →';
}

async function obNext(){
  if(obStep===0){obGoTo(1);}
  else if(obStep===1){
    // 儲存 API
    const key=I('ob-api-key').value.trim();
    if(!key){toast_('請填入 API 金鑰');return}
    await setSetting('api_key',key);
    await setSetting('api_provider',obProv);
    await setSetting('api_model',getDefModel(obProv));
    updateSettingsUI();
    obGoTo(2);
  }
  else if(obStep===2){
    // 建立角色
    const name=I('ob-char-name').value.trim();
    const persona=I('ob-char-persona').value.trim();
    if(!name){toast_('請填入角色名字');return}
    if(!persona){toast_('請填入個性描述');return}
    const char={
      id:'char_'+Date.now(),
      name,persona,
      avatar:obSelEmoji,
      tagline:'',tags:[],
      style:'casual',talkative:'mid',
      lang:'zh-tw',memory:20,temperature:0.8,
      delay:1,minMsg:1,maxMsg:3,
      heartVoice:true,// 預設開啟
      createdAt:Date.now()
    };
    await dbPut('characters',char);
    await updateHomeChatCard();
    I('ob-done-sub').textContent=`「${name}」已建立，開始你們的第一次對話吧。`;
    obGoTo(3);
  }
  else if(obStep===3){
    await obFinish();
  }
}

async function obFinish(){
  localStorage.setItem(OB_DONE_KEY,'1');
  I('onboarding').classList.add('hidden');
  // 直接進聊天室
  const chars=await dbAll('characters');
  if(chars.length){
    setTimeout(()=>startChat(chars[chars.length-1].id),300);
  }
}

function obSkip(){
  localStorage.setItem(OB_DONE_KEY,'1');
  I('onboarding').classList.add('hidden');
}

async function init(){
  await initDB();
  await loadTheme();
  await updateHomeChatCard();
  await updateBBHomeSub();
  await updateDiaryHomeSub();
  await updateDreamHomeSub();
  await updateNotifHomeSub();
  await updateGroupHomeSub();

  // ── iOS 鍵盤遮蔽處理：用 visualViewport 動態調整 .phone 高度 ──
  setupViewportTracking();

  setTimeout(()=>{
    I('splash').classList.add('hidden');
    checkOnboarding();
  },1600);
}

function setupViewportTracking(){
  const nav=document.querySelector('.nav');
  const updateKB=()=>{
    if(!window.visualViewport)return;
    // 鍵盤遮蔽高度 = layout viewport 高度 - visual viewport 高度
    const layoutH=window.innerHeight;
    const visualH=window.visualViewport.height;
    const kbOffset=Math.max(0,layoutH-visualH-window.visualViewport.offsetTop);
    document.documentElement.style.setProperty('--kb-offset',kbOffset+'px');
    // 【P35】鍵盤拉起閾值 80px 以上：隱藏底部 nav，避免輸入區下方留大片空白
    if(nav){
      if(kbOffset>80) nav.classList.add('kb-hidden');
      else nav.classList.remove('kb-hidden');
    }
    // 鍵盤拉起時，等動畫穩定後把輸入區滾到可見範圍
    if(kbOffset>50){
      const activeInput=document.activeElement;
      if(activeInput&&(activeInput.tagName==='TEXTAREA'||activeInput.tagName==='INPUT')){
        setTimeout(()=>{
          try{activeInput.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
        },150);
      }
    }
  };
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',updateKB);
    window.visualViewport.addEventListener('scroll',updateKB);
    updateKB();
  }
  window.addEventListener('orientationchange',()=>setTimeout(updateKB,200));

  // 【P35】保險機制：在某些 iOS 環境 visualViewport 不夠靈敏，
  // 直接監聽 focus/blur 也切換 nav 顯示
  document.addEventListener('focusin',e=>{
    const t=e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')){
      // 密碼鎖的輸入框不算
      if(t.id==='lock-in')return;
      nav&&nav.classList.add('kb-hidden');
    }
  });
  document.addEventListener('focusout',e=>{
    const t=e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')){
      // 延遲一下，避免 focus 在不同輸入框之間切換時閃爍
      setTimeout(()=>{
        const active=document.activeElement;
        if(!active||(active.tagName!=='INPUT'&&active.tagName!=='TEXTAREA')){
          nav&&nav.classList.remove('kb-hidden');
        }
      },100);
    }
  });
}
init();

