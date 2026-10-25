import {createClient} from '@supabase/supabase-js';
import {CONFIG as C} from './config.js';
import './style.css';
import {initFeatures,refreshFeatures,noticeSection,pageFeature,adminFeatures,renderFeatureCaptcha} from './wedding-features.js';

const turnstileScript = document.createElement('script');
turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
turnstileScript.async = true;
turnstileScript.defer = true;
// Reuse a single loading promise even when the RSVP form is re-rendered.
const turnstileReady = new Promise((resolve,reject)=>{
  turnstileScript.addEventListener('load',()=>resolve(true),{once:true});
  turnstileScript.addEventListener('error',()=>reject(new Error('Turnstile script blocked')),{once:true});
});
document.head.appendChild(turnstileScript);

const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key):null;
const app=document.querySelector('#app');
initFeatures(db,C);
window.addEventListener('wedding-features-changed',()=>render());
window.addEventListener('wedding-rsvp-deleted',()=>loadRows());
const state={tab:'home',relationship:'가족',attendance:'참석',shuttle:false,guests:1,meals:1,shuttleCount:1,submitted:false,name:'',pin:'',rsvpMode:'new',gumi:false,gimcheon:false,gumiTrip:'round',gimcheonTrip:'round',gumiCount:1,gimcheonCount:1,mealSlot:'first',receptionStatus:null,adminPage:'guests',envelopes:[],envelopeBusy:false,shuttleRoute:'gumi_outbound',shuttleSearch:'',boardingRows:[],boardingAvailable:true,boardingBusy:false,admin:false,session:null,rows:[],loading:false,turnstileToken:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='button')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const chip=(label,group,value,selected)=>`<button type="button" class="chip ${selected?'active':''}" data-group="${group}" data-value="${esc(value)}">${esc(label)}</button>`;
const count=(key,label,min=1)=>`<div class="field"><label>${label}</label><div class="stepper"><button type="button" data-counter="${key}" data-delta="-1">−</button><span>${state[key]}명</span><button type="button" data-counter="${key}" data-delta="1">+</button></div></div>`;
function home(){return `<section class="home-invitation"><div class="home-overline">Together, from now on</div><div class="home-hero-wrap">${C.heroVideo?`<video class="hero hero-video" src="${esc(C.heroVideo)}" poster="${esc(C.photos[0] || '')}" autoplay muted loop playsinline webkit-playsinline preload="auto" aria-label="다래와 민우의 초대 영상"></video>`:C.photos.length?`<img class="hero" src="${esc(C.photos[0])}" alt="우리의 한복 스냅">`:'<div class="placeholder">우리의 한복 스냅사진을 준비하고 있습니다.</div>'}</div><div class="home-identity"><div class="home-label">INVITATION</div><h1 class="home-heading">우리, 혼례합니다</h1><div class="home-names">임다래 · 남민우</div><p class="home-detail">${esc(C.date)}<br>${esc(C.ceremony.time)} · ${esc(C.ceremony.name)}</p></div>${C.invitationVideo?`<div class="panel"><iframe title="초대영상" src="${esc(C.invitationVideo)}" width="100%" height="220" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`:''}<div class="home-divider" aria-hidden="true"></div><p class="home-message">저희 두 사람의 새로운 시작에<br>함께하시어 축복해 주시기 바랍니다.</p>${button('참석 여부 알려주기 →','rsvp','button secondary')}</section>`}
function gallery(){return `<div class="center small muted" style="letter-spacing:3px">OUR MOMENTS</div><h1 class="heading">우리의 순간들</h1><div class="flourish">─ ✿ ─</div><p class="center intro muted">다래와 민우의 소중한 기록<br>사진을 누르면 크게 볼 수 있어요.</p>${C.galleryPhotos.length?`<div class="gallery-grid">${C.galleryPhotos.map((p,i)=>`<button type="button" class="gallery-item" data-photo="${esc(p)}" aria-label="사진 ${i+1} 크게 보기"><img src="${esc(p)}" alt="한복 스냅 ${i+1}" loading="lazy"></button>`).join('')}</div>`:'<div class="panel center">사진을 준비하고 있습니다.</div>'}`}
async function loadReceptionStatus(){if(!db)return;const {data,error}=await db.rpc('reception_capacity_status');if(!error&&data){state.receptionStatus=data;}}
const rsvpClosed=()=>Date.now()>new Date(C.rsvpDeadline+'T23:59:59+09:00').getTime();
const routeFields=(key,label)=>`<div class="panel shuttle-route"><b>${label} 셔틀버스 이용</b><div class="chips">${chip('이용 안 함',key,'no',!state[key])}${chip('이용함',key,'yes',state[key])}</div>${state[key]?`<div class="field"><label>이용 구간</label><div class="chips">${chip('왕복',key+'Trip','round',state[key+'Trip']==='round')}${chip('서울행 편도',key+'Trip','out',state[key+'Trip']==='out')}${chip('귀가 편도',key+'Trip','back',state[key+'Trip']==='back')}</div></div>${count(key+'Count','이용 인원')}`:''}</div>`;
const pinField=()=>`<div class="field"><label for="guest-pin">숫자 4자리 비밀번호</label><input id="guest-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" minlength="4" required autocomplete="off" value="${esc(state.pin)}" placeholder="숫자 4자리"><p class="small muted">나중에 응답을 수정할 때 필요합니다. 잊지 않도록 기억해 주세요.</p></div>`;
function rsvp(){
  const closed=rsvpClosed(), edit=state.rsvpMode==='edit', lookup=state.rsvpMode==='lookup';
  if(state.rsvpMode==='deleted')return `<div class="center" style="padding:55px 0"><h1>응답이 삭제되었습니다</h1><p class="intro">기존 참석 응답을 삭제했습니다.<br>11월 6일까지 다시 등록할 수 있습니다.</p>${button('새로 응답하기','newRsvp','button secondary')}</div>`;
  if(state.rsvpMode==='done')return `<div class="center" style="padding:55px 0"><div class="flower" style="font-size:42px">✿</div><h1>감사합니다</h1><p class="intro">${state.editSaved?'수정된 참석 정보가 저장되었습니다.':'참석 여부가 접수되었습니다.'}<br>11월 6일까지 이름과 비밀번호로 다시 수정하실 수 있습니다.</p>${button('기존 응답 수정하기','editLookup','button secondary')}</div>`;
  const head=`<h1 class="heading">참석 여부를 알려주세요</h1><div class="flourish">─ ✿ ─</div><p class="center intro">귀한 걸음 준비에 참고하고자<br>참석 여부를 여쭙습니다.</p><p class="center small muted">응답 및 수정 마감: 2026년 11월 6일 (금) 23:59</p>`;
  if(closed)return head+'<div class="panel center">응답 및 수정 기간이 마감되었습니다.<br>변경이나 추가 참석은 신랑·신부에게 직접 연락해 주세요.</div>';
  const tabs=`<div class="chips rsvp-tabs">${chip('새로 응답하기','rsvpMode','new',!lookup&&!edit)}${chip('기존 응답 수정하기','rsvpMode','lookup',lookup||edit)}</div>`;
  const name=`<div class="field"><label for="guest-name">성함</label><input id="guest-name" name="name" required maxlength="60" autocomplete="name" value="${esc(state.name)}" placeholder="성함을 입력해 주세요"></div>`;
  const verify=`<div id="turnstile-widget"></div><p id="captcha-help" class="small muted" aria-live="polite">인증 체크가 안 되면 카카오톡 내 브라우저 대신 Safari 또는 Chrome에서 열어주세요.</p><p id="form-error" class="error" role="alert"></p>`;
  if(lookup)return head+tabs+`<form id="rsvp-lookup-form">${name}${pinField()}<p class="small muted">최초 응답 당시 설정한 이름과 비밀번호를 입력해 주세요.</p>${verify}<button class="button" type="submit">내 응답 불러오기</button></form>`;
  const relationship=`<div class="field"><label>우리와의 인연</label><div class="chips">${['가족','직장','학교','친구','기타'].map(v=>chip(v,'relationship',v,state.relationship===v)).join('')}</div></div>`;
  const attendance=`<div class="field"><label>참석 여부</label><div class="chips">${chip('참석합니다','attendance','참석',state.attendance==='참석')}${chip('참석이 어렵습니다','attendance','불참',state.attendance==='불참')}</div></div>`;
  const cap=state.receptionStatus;
  const mealChoice=`<div class="panel meal-choice"><b>신라스테이 광화문 · 피로연 · 18:00~21:00</b></div>`;
  const details=state.attendance==='참석'?
    count('guests','함께 오시는 분 포함 참석 인원')+count('meals','신라스테이 광화문 · 피로연 식사 인원',0)+mealChoice+routeFields('gumi','구미 출발')+routeFields('gimcheon','김천 출발'):'';
  const notice='<div class="panel notice">11월 6일까지 이름과 숫자 4자리 비밀번호로 응답을 수정할 수 있습니다. 마감 후에는 신랑·신부에게 따로 연락해 주세요.<br>연락처는 수집하지 않으며 참석 확인과 행사 운영 목적으로만 정보를 사용합니다. 비밀번호는 암호화된 검증값으로 보관합니다.</div>';
  const disabled=!db||state.loading?'disabled':'';
  const submit=state.loading?'전송 중…':edit?'수정 내용 저장하기':'참석 여부 전달하기';
  return head+tabs+`<form id="rsvp-form">${name}${pinField()}${relationship}${attendance}${details}${notice}${!db?'<p class="error">현재 데모 모드입니다. Supabase 연결 전에는 응답을 제출할 수 없습니다.</p>':''}${verify}<button class="button" type="submit" ${disabled}>${submit}</button>${edit?'<button class="button secondary" type="button" data-action="deleteOwnRsvp" style="margin-top:12px;border:1px solid #b37b82;color:#8e3b49">내 참석 응답 삭제하기</button>':''}</form>`;
}
const maplinks=name=>`<div class="mapbuttons"><a href="https://map.naver.com/p/search/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a href="https://map.kakao.com/?q=${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">카카오맵 ↗</a></div>`;
const navAddress=place=>encodeURIComponent(place.address);
const mapFrame=place=>`<div class="directions-map"><iframe title="${esc(place.name)} 위치 지도" src="https://maps.google.com/maps?q=${navAddress(place)}&amp;z=16&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
const venueMapLinks=place=>`<div class="directions-actions"><a href="https://map.naver.com/p/search/${navAddress(place)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(place.name)} 네이버지도에서 열기">네이버지도 <span aria-hidden="true">↗</span></a><a href="https://map.kakao.com/?q=${navAddress(place)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(place.name)} 카카오맵에서 열기">카카오맵 <span aria-hidden="true">↗</span></a></div>`;
const routeUrl=()=>`https://www.google.com/maps/dir/?api=1&origin=${navAddress(C.ceremony)}&destination=${navAddress(C.reception)}&travelmode=walking`;
const venueSection=(n,label,place)=>`<section class="directions-venue" aria-labelledby="directions-venue-${n}"><div class="directions-venue-head"><span class="directions-index">${n}</span><div><p class="directions-caption">${label}</p><h2 id="directions-venue-${n}">${esc(place.name)}</h2></div></div><p class="directions-time">${esc(C.date)}<br><strong>${esc(place.time)}</strong></p><p class="directions-address">${esc(place.address)}</p>${mapFrame(place)}${venueMapLinks(place)}</section>`;
function guide(){
  return `<section class="directions-page simple-guide">
    <div class="directions-overline">WEDDING GUIDE</div><h1 class="directions-title">혼례 안내</h1>
    <p class="directions-intro">11월 14일 토요일 · 운현궁</p>
    <div class="guide-summary">
      
      <div class="guide-key"><span>전통혼례</span><strong>18:00</strong><small>운현궁 · 17:50 사물놀이</small></div>
      <div class="guide-key"><span>피로연</span><strong>18:00–21:00</strong><small>신라스테이 광화문 · 혼례 후 이동</small></div>
    </div>
    <section class="guide-essentials"><h2>유의사항</h2><div class="guide-lines"><p>음식물·꽃 반입 금지</p><p>야외 예식 · 좌석 제한</p><p>따뜻한 복장 권장</p></div></section>
    <section class="guide-essentials"><h2>교통 안내</h2><div class="guide-lines">
      <p><strong>자가용 이용</strong> 운현궁 주변 주차 공간이 협소하여 대중교통 또는 셔틀버스 이용을 권장합니다.</p>
      <p><strong>대중교통</strong></p>
      <p>지하철 · 서울역(1호선) → 종로3가역(3호선 환승) → 안국역 4번 출구 → 운현궁 도보 이동</p>
      <p>버스 · 안국역 또는 운현궁 인근 정류장 하차 후 도보 이동</p>
      <p><strong>셔틀 이용</strong></p>
      <p>구미 · 구미시청 출발 12:30 / 귀가 20:30 출발 예정</p>
      <p>김천 · 검역본부 출발 12:30 / 귀가 20:30 출발 예정</p>
      <p>현장 셔틀 · 운현궁 ↔ 신라스테이 광화문 왕복 운행 (승차 위치 추후 안내)</p>
    </div></section>
    
    <details class="guide-extra"><summary>오시는 길 · 지도 · 주차 안내</summary>
      ${venueSection('01','전통혼례',C.ceremony)}
      ${venueSection('02','피로연',C.reception)}
      
      <p class="directions-note">운현궁 주차 유료 · 호텔 주차 조건 별도 확인</p>
    </details>
    <p class="directions-end">We look forward to seeing you.</p>
  </section>`;
}
function more(){
  const accounts=C.accounts.map((group,i)=>`<details class="account-fold"><summary><span class="account-name">${esc(group.label)}</span><span class="account-toggle"><span class="account-toggle-label">계좌 보기</span><span class="account-chevron" aria-hidden="true">⌄</span></span></summary><div class="account-content">${group.members.map((person,j)=>`<div class="account-member"><p class="account-relation">${esc(person.relation)} · ${esc(person.holder)}</p><div class="account-bank">${esc(person.bank)} <strong>${esc(person.number)}</strong></div><div class="account-holder">예금주 ${esc(person.holder)}</div>${button('계좌번호 복사','copy:'+i+':'+j,'button secondary account-copy')}</div>`).join('')}</div></details>`).join('');
  return `<section class="accounts-page"><p class="accounts-overline">WITH GRATITUDE</p><h1 class="heading">마음 전하실 곳</h1><div class="flourish">─ ✿ ─</div><p class="center intro">축하해 주시는 따뜻한 마음에<br>진심으로 감사드립니다.</p><p class="center accounts-hint">계좌 정보는 선택하신 항목을 누르면 표시됩니다.</p><div class="accounts-list">${accounts}</div><div class="panel center"><h2>축하 메시지</h2><p class="intro muted">하객들이 전하는 축하의 한마디를 만나보세요.</p>${button("축하 메시지 보기 →","guestbook","button secondary")}</div><div class="panel center"><h2>Wedding Archive</h2><p class="intro muted">결혼식 후 사진과 영상을 함께 나눌 공간입니다.</p>${button("사진·영상 아카이브 →","archive","button secondary")}</div></section>`;
}

const countNumber=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const sumChoice=(rows,key)=>rows.reduce((n,r)=>n+countNumber(r[key]),0);
function adminSummary(rows){
 const attending=rows.filter(r=>r.attendance==='참석'), absent=rows.filter(r=>r.attendance==='불참');
 let noMeal=0;
 for(const r of attending){const m=countNumber(r.meals);if(!m){noMeal++;continue}}
 const persons=sumChoice(attending,'guests'),food=sumChoice(attending,'meals'),checked=sumChoice(attending.filter(r=>r.checked_in),'guests');
 const routes=[['구미 → 서울',sumChoice(attending,'gumi_outbound')],['서울 → 구미',sumChoice(attending,'gumi_return')],['김천 → 서울',sumChoice(attending,'gimcheon_outbound')],['서울 → 김천',sumChoice(attending,'gimcheon_return')]];
 const tile=(label,value,sub)=>'<div class="admin-stat-card"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>';
 const line=(label,value)=>'<div class="admin-metric-line"><span>'+label+'</span><strong>'+value+'</strong></div>';
 return '<section class="admin-overview"><h2>하객 신청 현황</h2><div class="admin-stat-grid">'+
 tile('전체 응답',rows.length+'건','참석 '+attending.length+'건 · 불참 '+absent.length+'건')+
 tile('참석 예정',persons+'명','도착 처리 '+checked+'명')+
 tile('피로연 신청',food+'명','식사 신청 인원')+
 tile('셔틀 서울행',routes[0][1]+routes[2][1]+'명','귀가 '+(routes[1][1]+routes[3][1])+'명')+'</div>'+
 '<div class="admin-summary-grid"><section class="admin-summary-panel"><h3>피로연 · 18:00~21:00</h3>'+line('예약 인원',food+'명')+line('운영 정원','130명')+line('잔여 인원',Math.max(0,130-food)+'명')+line('식사 신청 없음',noMeal+'건')+'</section>'+ 
 '<section class="admin-summary-panel"><h3>셔틀 노선별 · 방향별</h3>'+
 routes.map(([name,n])=>line(name,n+'명')).join('')+
 '<div class="admin-metric-total">'+line('서울행 / 귀가',(routes[0][1]+routes[2][1])+'명 / '+(routes[1][1]+routes[3][1])+'명')+'</div></section></div>'+
 '<p class="small muted">피로연 예약은 기존 식사 신청 인원을 모두 합산합니다. 왕복 셔틀 이용자는 서울행과 귀가에 각각 집계됩니다.</p></section>';
}
function adminSelections(r){
 if(r.attendance!=='참석')return '<span class="admin-choice">불참</span>';
 const meal=countNumber(r.meals);
 const opts=['참석 '+countNumber(r.guests)+'명','피로연 '+meal+'명 · '+(!meal?'미신청':'18~21시')];
 for(const [name,key] of [['구미 서울행','gumi_outbound'],['구미 귀가','gumi_return'],['김천 서울행','gimcheon_outbound'],['김천 귀가','gimcheon_return']]){if(countNumber(r[key]))opts.push(name+' '+countNumber(r[key])+'명')}
 return opts.map(x=>'<span class="admin-choice">'+esc(x)+'</span>').join('');
}

// Boarding records are separate from ceremony arrival check-in.
// The route-specific counts are written through a protected RPC to prevent overwrites.
const SHUTTLE_ROUTES=[
 ['gumi_outbound','구미 → 서울'],['gumi_return','서울 → 구미'],
 ['gimcheon_outbound','김천 → 서울'],['gimcheon_return','서울 → 김천']
];
const boardingKey=(id,route)=>id+'|'+route;
function boardingPage(){
 const route=state.shuttleRoute;
 const rows=state.rows.filter(r=>r.attendance==='참석'&&countNumber(r[route])>0);
 const booked=sumChoice(rows,route);
 const boardById=new Map(state.boardingRows.filter(r=>r.route===route).map(r=>[r.rsvp_id,countNumber(r.boarded_count)]));
 const boarded=rows.reduce((n,r)=>n+Math.min(countNumber(r[route]),boardById.get(r.id)||0),0);
 const term=state.shuttleSearch.trim().toLocaleLowerCase();
 const visible=rows.filter(r=>String(r.name||'').toLocaleLowerCase().includes(term));
 return '<section class="shuttle-admin"><h2>셔틀 탑승 관리</h2><p class="small muted">관리자 전용 · 예식장 도착 체크인과 별개로 관리됩니다.</p>'+
 '<label class="shuttle-label" for="shuttle-route">운행 노선</label><select id="shuttle-route">'+SHUTTLE_ROUTES.map(([value,name])=>'<option value="'+value+'" '+(route===value?'selected':'')+'>'+name+'</option>').join('')+'</select>'+
 '<div class="shuttle-totals"><div><small>신청 인원</small><strong>'+booked+'명</strong></div><div><small>탑승 완료</small><strong>'+boarded+'명</strong></div><div><small>미탑승</small><strong>'+Math.max(0,booked-boarded)+'명</strong></div></div>'+
 (!state.boardingAvailable?'<p class="error">탑승 기록 저장 기능을 사용할 수 없습니다. Supabase에 셔틀 탑승 관리 SQL 마이그레이션을 적용해 주세요.</p>':'')+
 '<div class="shuttle-toolbar"><input id="shuttle-search" placeholder="탑승자 성함 검색" value="'+esc(state.shuttleSearch)+'" aria-label="탑승자 성함 검색"><button type="button" class="button secondary" data-action="refreshBoarding">새로고침</button></div>'+
 '<div id="shuttle-list">'+(visible.length?visible.map(r=>{
  const n=countNumber(r[route]),current=Math.min(n,boardById.get(r.id)||0);
  return '<div class="shuttle-passenger"><div><strong>'+esc(r.name)+'</strong><p class="small muted">신청 '+n+'명 · 탑승 '+current+'명</p></div><div class="shuttle-stepper">'+
  '<button type="button" data-board="'+esc(r.id)+'" data-delta="-1" '+(current===0||state.boardingBusy||!state.boardingAvailable?'disabled':'')+' aria-label="'+esc(r.name)+' 탑승 인원 줄이기">−</button>'+
  '<strong>'+current+' / '+n+'</strong>'+
  '<button type="button" data-board="'+esc(r.id)+'" data-delta="1" '+(current===n||state.boardingBusy||!state.boardingAvailable?'disabled':'')+' aria-label="'+esc(r.name)+' 탑승 인원 늘리기">+</button></div></div>';
 }).join(''):'<p class="panel center">해당하는 탑승 신청자가 없습니다.</p>')+'</div>'+
 '<p class="small muted">탑승한 인원만 + 버튼으로 기록합니다. 탑승 취소는 − 버튼을 누르세요. 기록은 서버에 저장되며 다른 관리자도 새로고침하면 확인할 수 있습니다.</p></section>';
}
async function loadBoarding(){
 if(!db||!state.session)return;
 const result=await db.from('shuttle_boardings').select('rsvp_id,route,boarded_count');
 if(result.error){
  state.boardingAvailable=false;
  state.boardingRows=[];
 }else{
  state.boardingAvailable=true;
  state.boardingRows=result.data||[];
 }
 render();
}
async function setBoarding(id,delta){
 if(state.boardingBusy||!state.boardingAvailable)return;
 const route=state.shuttleRoute,r=state.rows.find(x=>x.id===id&&x.attendance==='참석');
 if(!r||countNumber(r[route])<1)return;
 const current=state.boardingRows.find(x=>x.rsvp_id===id&&x.route===route)?.boarded_count||0;
 const next=Math.max(0,Math.min(countNumber(r[route]),countNumber(current)+delta));
 if(next===current)return;
 state.boardingBusy=true;render();
 const {error}=await db.rpc('admin_set_shuttle_boarding',{p_rsvp_id:id,p_route:route,p_count:next});
 state.boardingBusy=false;
 if(error){alert('탑승 기록 저장 실패: '+error.message);await loadBoarding();return}
 await loadBoarding();
}


function envelopePage(){
 const records=state.envelopes;
 const tickets=records.reduce((n,r)=>n+r.meal_tickets,0),gifts=records.reduce((n,r)=>n+r.gift_quantity,0);
 return `<div class="actions"><button type="button" class="button secondary" data-envelope-refresh>새로고침</button></div>
 <div class="panel"><strong>축의금 접수 ${records.length}건 · 식권 발급 ${tickets}매 · 답례품 지급 ${gifts}개</strong></div>
 <p class="small muted">봉투 1건당 답례품 최대 1개. 각 접수 건의 답례품 지급 수량을 개별 표시합니다.</p>
 <h2>축의금 봉투 접수</h2><form id="envelope-form">
 <div class="field"><label>봉투 성함</label><input name="guest_name" maxlength="60" required></div>
 <div class="field"><label>RSVP 하객 연결 (선택)</label><select name="rsvp_id"><option value="">연결하지 않음</option>${state.rows.filter(r=>r.attendance==='참석').map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></div>
 <div class="field"><label>식권 발급 수량</label><input name="meal_tickets" type="number" min="0" max="30" value="1" required></div>
 <div class="field"><label>답례품 지급 수량 (봉투당 0~1개)</label><input name="gift_quantity" type="number" min="0" max="1" value="0" required></div>
 <p class="error" id="envelope-error"></p><button class="button" type="submit">접수 저장</button></form>
 <h2>접수 기록</h2><div class="tablewrap"><table><thead><tr><th>성함</th><th>식권 발급</th><th>답례품 지급</th><th>관리</th></tr></thead><tbody>
 ${records.map(r=>`<tr><td>${esc(r.guest_name)}</td><td>${r.meal_tickets}매</td><td>${r.gift_quantity}개</td><td>${r.meal_tickets===0?`<button type="button" class="chip" data-gift-toggle="${esc(r.id)}">${r.gift_quantity?'지급 취소':'1개 지급'}</button>`:''} <button type="button" class="chip" data-envelope-delete="${esc(r.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`;
}
async function loadEnvelopes(){
 if(!db||!state.session)return;
 const {data,error}=await db.from('wedding_envelopes').select('id,guest_name,rsvp_id,meal_tickets,gift_quantity,created_at').order('created_at',{ascending:false});
 if(error){alert('축의금 목록 조회 실패: '+error.message);return}
 state.envelopes=data||[];render();
}
function admin(){if(!db)return '<h1>관리자</h1><p>Supabase 연결 후 관리자 기능을 사용할 수 있습니다.</p>';if(!state.session)return `<div class="admin"><h1 class="heading">관리자 로그인</h1><p class="center small muted">사전에 Supabase에서 생성한 관리자 계정으로 로그인하세요.</p><form id="login-form"><div class="field"><label>이메일</label><input name="email" type="email" required></div><div class="field"><label>비밀번호</label><input name="password" type="password" required></div><p id="login-error" class="error"></p><button class="button">로그인</button></form></div>`;const rows=state.rows,att=rows.filter(x=>x.attendance==='참석');return `<div class="admin"><h1>하객 관리</h1><div class="admin-view-tabs"><button type="button" class="chip ${state.adminPage==='guests'?'active':''}" data-admin-page="guests">하객 명단</button><button type="button" class="chip ${state.adminPage==='shuttle'?'active':''}" data-admin-page="shuttle">셔틀 탑승 관리</button><button type="button" class="chip ${state.adminPage==='envelopes'?'active':''}" data-admin-page="envelopes">축의금 · 식권 · 답례품</button></div>${state.adminPage==='shuttle'?boardingPage():state.adminPage==='envelopes'?envelopePage():`<div class="actions">${button('새로고침','refresh','button secondary')}${button('CSV 다운로드','csv','button secondary')}${button('로그아웃','logout','button secondary')}</div>${adminSummary(rows)}<div class="field"><label>하객 검색</label><input id="admin-search" placeholder="이름 또는 인연"></div><div class="tablewrap"><table><thead><tr><th>성함</th><th>인연</th><th>선택 옵션</th><th>인원</th><th>식사</th><th>피로연</th><th>셔틀 합계</th><th>구미 서울행</th><th>구미 귀가</th><th>김천 서울행</th><th>김천 귀가</th><th>도착</th><th>삭제</th></tr></thead><tbody id="admin-body">${rowHtml(rows)}</tbody></table></div><h2 style="margin-top:30px">현장 미등록 하객</h2><form id="walkin-form"><div class="field"><label>성함</label><input name="name" required maxlength="60"></div><div class="field"><label>우리와의 인연</label><select name="relationship"><option>가족</option><option>직장</option><option>학교</option><option>친구</option><option>기타</option></select></div><div class="field"><label>참석 인원</label><input name="guests" type="number" min="1" max="30" value="1" required></div><div class="field"><label>식사 인원</label><input name="meals" type="number" min="0" max="30" value="1" required></div><p id="walkin-error" class="error"></p><button class="button">현장 하객 등록</button></form>${adminFeatures()}`}</div>`}
function rowHtml(rows){return rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.relationship)}</td><td><div class="admin-choice-list">${adminSelections(r)}</div></td><td>${r.guests}</td><td>${r.meals}</td><td>${esc(Number(r.meals)>0?'19~21시':'식사 없음')}</td><td>${r.shuttle_count}</td><td>${r.gumi_outbound??0}</td><td>${r.gumi_return??0}</td><td>${r.gimcheon_outbound??0}</td><td>${r.gimcheon_return??0}</td><td><button class="chip ${r.checked_in?'active':''}" data-check="${esc(r.id)}" ${r.attendance!=='참석'?'disabled':''}>${r.checked_in?'도착 ✓':'체크인'}</button></td><td><button type="button" class="chip danger-outline" data-delete-rsvp="${esc(r.id)}">삭제</button></td></tr>`).join('')}

function startHeroVideo(){
  const video=app.querySelector('.hero-video');
  if(!video)return;
  video.muted=true;
  video.defaultMuted=true;
  video.playsInline=true;
  video.setAttribute('muted','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  const showButton=()=>{
    if(!video.isConnected||video.parentElement?.querySelector('.hero-play-button'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='hero-play-button';
    button.textContent='▶ 영상 재생';
    button.setAttribute('aria-label','초대 영상 재생');
    button.style.cssText='position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:3;padding:12px 20px;border:1px solid #fff;border-radius:24px;background:rgba(0,0,0,.6);color:#fff;font-size:15px;cursor:pointer';
    video.parentElement.style.position='relative';
    button.addEventListener('click',()=>{
      video.muted=true;
      const result=video.play();
      if(result?.then)result.then(()=>button.remove()).catch(()=>{button.textContent='▶ 다시 재생';});
    });
    video.parentElement.append(button);
  };
  const attempt=()=>{
    if(!video.isConnected||document.hidden)return;
    const result=video.play();
    if(result?.then)result.then(()=>video.parentElement?.querySelector('.hero-play-button')?.remove()).catch(showButton);
    else if(video.paused)showButton();
  };
  video.addEventListener('loadeddata',attempt,{once:true});
  video.addEventListener('canplay',attempt,{once:true});
  video.addEventListener('error',showButton,{once:true});
  attempt();
  if(video.paused)showButton();
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)startHeroVideo()});
function render(){
  const adminMode=state.admin||location.pathname.startsWith('/admin');

  app.innerHTML=`<div class="shell"><header class="top"><span>DA-RAE &amp; MINWOO</span><span class="flower" style="font-size:25px">✿</span><span>2026.11.14</span></header><main class="main">${adminMode?admin():C.postWedding&&state.tab==='home'?`<h1 class="heading">함께해주셔서 감사합니다</h1><div class="flourish">─ ✿ ─</div>${C.photos.length?`<div class="photo-grid">${C.photos.map(p=>`<img src="${esc(p)}" alt="혼례 사진" loading="lazy" data-photo="${esc(p)}">`).join('')}</div>`:''}${C.archiveVideo?`<iframe title="혼례 영상" width="100%" height="220" src="${esc(C.archiveVideo)}" allowfullscreen></iframe>`:''}`:(state.tab==='guestbook'?pageFeature('guestbook'):state.tab==='archive'?pageFeature('archive'):({home,gallery,rsvp,guide,more}[state.tab]()))}</main>${!adminMode?`<nav class="nav">${[['home','초대'],['gallery','갤러리'],['rsvp','참석'],['guide','안내'],['more','더보기']].map(([v,t])=>`<button data-tab="${v}" class="${state.tab===v?'selected':''}">${t}</button>`).join('')}</nav>`:''}</div>`;

  startHeroVideo();
  renderFeatureCaptcha();
  state.turnstileToken=null;

  const widget=document.querySelector('#turnstile-widget');
  if(widget){
    const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if(!siteKey){
      widget.textContent='보안 인증 설정을 확인해 주세요.';
      return;
    }

    const showTurnstile=()=>{
      if(!widget.isConnected||!window.turnstile)return;
      try{
        window.turnstile.render(widget,{
          sitekey:siteKey,
          theme:'light',
          callback:(token)=>{
            if(!widget.isConnected)return;
            state.turnstileToken=token;
            const feedback=document.querySelector('#captcha-help');
            if(feedback)feedback.textContent='보안 인증이 완료되었습니다.';
          },
          'expired-callback':()=>{
            state.turnstileToken=null;
            const feedback=document.querySelector('#captcha-help');
            if(feedback)feedback.textContent='인증이 만료되었습니다. 다시 체크해 주세요.';
          },
          'error-callback':(code)=>{
            state.turnstileToken=null;
            const feedback=document.querySelector('#captcha-help');
            if(feedback)feedback.textContent='보안 인증을 불러오지 못했습니다 ('+String(code||'네트워크 오류')+'). 카카오톡 내 브라우저라면 Safari 또는 Chrome에서 열어주세요.';
          }
        });
      }catch(err){
        widget.textContent='보안 인증을 열지 못했습니다. Safari 또는 Chrome에서 다시 접속해 주세요.';
      }
    };
    if(window.turnstile)showTurnstile();
    else turnstileReady.then(showTurnstile).catch(()=>{
      if(widget.isConnected)widget.textContent='보안 인증이 차단되었습니다. Safari 또는 Chrome에서 다시 접속해 주세요.';
    });
  }
}
async function loadRows(){if(!db||!state.session)return;const {data,error}=await db.from('rsvps').select('*').order('created_at',{ascending:false});if(error){alert('목록 조회 실패: '+error.message);return}state.rows=data;render()}

function csv(){
  const fields = [
    ['name', '성함'],
    ['relationship', '관계'],
    ['attendance', '참석 여부'],
    ['guests', '참석 인원'],
    ['meals', '식사 인원'],
    ['meal_slot', '식사 시간'],
    ['shuttle_count', '셔틀 인원'],
    ['gumi_outbound', '구미 서울행'],
    ['gumi_return', '구미 귀가'],
    ['gimcheon_outbound', '김천 서울행'],
    ['gimcheon_return', '김천 귀가'],
    ['updated_at', '수정 일시'],
    ['checked_in', '도착 여부'],
    ['created_at', '제출 일시']
  ];

  const escapeCsv = value =>
    '"' + String(value ?? '').replace(/"/g, '""') + '"';

  const formatValue = (key, value) => {
    if (key === 'checked_in') {
      return value ? '도착' : '미도착';
    }

    if (key === 'created_at' && value) {
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value));
    }

    return value ?? '';
  };

  const lines = [
    fields.map(([, label]) => escapeCsv(label)).join(','),
    ...state.rows.map(row =>
      fields.map(([key]) =>
        escapeCsv(formatValue(key, row[key]))
      ).join(',')
    )
  ];

  const blob = new Blob(
    ['\uFEFF' + lines.join('\r\n')],
    { type: 'text/csv;charset=utf-8' }
  );

  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = '결혼식_하객명단.csv';
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
  
function openPhotoLightbox(source){
  const images=state.tab==='gallery'&&!state.admin?C.galleryPhotos:C.photos;
  if(!images.length)return;
  let index=Math.max(0,images.indexOf(source));
  const previousFocus=document.activeElement;
  const overlay=document.createElement('div');
  overlay.className='lightbox';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','웨딩 사진 보기');
  const photo=document.createElement('img');
  photo.alt='한복 스냅';
  const close=document.createElement('button');
  close.type='button';
  close.className='lightbox-close';
  close.textContent='×';
  close.setAttribute('aria-label','닫기');
  const prev=document.createElement('button');
  prev.type='button';
  prev.className='lightbox-prev';
  prev.textContent='‹';
  prev.setAttribute('aria-label','이전 사진');
  const next=document.createElement('button');
  next.type='button';
  next.className='lightbox-next';
  next.textContent='›';
  next.setAttribute('aria-label','다음 사진');
  const counter=document.createElement('div');
  counter.className='lightbox-counter';
  counter.setAttribute('aria-live','polite');
  const update=()=>{
    photo.src=images[index];
    photo.alt=`한복 스냅 ${index+1}`;
    counter.textContent=`${index+1} / ${images.length}`;
    prev.hidden=images.length<2;
    next.hidden=images.length<2;
  };
  const change=step=>{index=(index+step+images.length)%images.length;update()};
  const onKey=e=>{
    if(e.key==='Escape')dismiss();
    else if(e.key==='ArrowLeft'){e.preventDefault();change(-1)}
    else if(e.key==='ArrowRight'){e.preventDefault();change(1)}
    else if(e.key==='Tab'){
      e.preventDefault();
      const controls=images.length>1?[close,prev,next]:[close];
      const current=controls.indexOf(document.activeElement);
      const delta=e.shiftKey?-1:1;
      controls[(current+delta+controls.length)%controls.length].focus();
    }
  };
  const dismiss=()=>{
    document.removeEventListener('keydown',onKey);
    overlay.remove();
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  };
  close.addEventListener('click',dismiss);
  prev.addEventListener('click',()=>change(-1));
  next.addEventListener('click',()=>change(1));
  overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss()});
  let startX=null;
  overlay.addEventListener('touchstart',e=>{if(e.touches.length===1)startX=e.touches[0].clientX},{passive:true});
  overlay.addEventListener('touchend',e=>{
    if(startX===null||!e.changedTouches.length)return;
    const distance=e.changedTouches[0].clientX-startX;
    startX=null;
    if(Math.abs(distance)>45&&images.length>1)change(distance<0?1:-1);
  },{passive:true});
  overlay.append(photo,prev,next,counter,close);
  update();
  document.body.append(overlay);
  document.addEventListener('keydown',onKey);
  close.focus();
}
app.addEventListener('click',async e=>{const b=e.target.closest('button');if(b){if(b.dataset.adminPage){state.adminPage=b.dataset.adminPage;state.shuttleSearch='';if(state.adminPage==='shuttle')await loadBoarding();else if(state.adminPage==='envelopes')await loadEnvelopes();else render();return}if(b.hasAttribute('data-envelope-refresh')){await loadEnvelopes();return}
if(b.dataset.giftToggle){const row=state.envelopes.find(x=>x.id===b.dataset.giftToggle);if(!row||row.meal_tickets>0||state.envelopeBusy)return;state.envelopeBusy=true;const {error}=await db.from('wedding_envelopes').update({gift_quantity:row.gift_quantity?0:1}).eq('id',row.id);state.envelopeBusy=false;if(error)alert(error.message);await loadEnvelopes();return}
if(b.dataset.envelopeDelete){if(state.envelopeBusy||!confirm('이 접수 기록을 삭제할까요?'))return;state.envelopeBusy=true;const {error}=await db.from('wedding_envelopes').delete().eq('id',b.dataset.envelopeDelete);state.envelopeBusy=false;if(error)alert(error.message);await loadEnvelopes();return}
if(b.dataset.board){await setBoarding(b.dataset.board,Number(b.dataset.delta));return}if(b.dataset.tab){state.tab=b.dataset.tab;if(state.tab==='rsvp')await loadReceptionStatus();render();window.scrollTo(0,0);return}if(b.dataset.group){const group=b.dataset.group,val=b.dataset.value;if(group==='gumi'||group==='gimcheon')state[group]=val==='yes';else if(group==='rsvpMode'){state.rsvpMode=val;state.submitted=false;}else state[group]=val;render();return}if(b.dataset.counter){const k=b.dataset.counter;state[k]=Math.max(k==='meals'?0:1,Math.min(30,state[k]+Number(b.dataset.delta)));if(k==='guests'){state.meals=Math.min(state.meals,state.guests);state.shuttleCount=Math.min(state.shuttleCount,state.guests);state.gumiCount=Math.min(state.gumiCount,state.guests);state.gimcheonCount=Math.min(state.gimcheonCount,state.guests)}if(k==='meals')state.meals=Math.min(state.meals,state.guests);if(k==='shuttleCount')state.shuttleCount=Math.min(state.shuttleCount,state.guests);if(k==='gumiCount')state.gumiCount=Math.min(state.gumiCount,state.guests);if(k==='gimcheonCount')state.gimcheonCount=Math.min(state.gimcheonCount,state.guests);render();return}if(b.dataset.check){const row=state.rows.find(x=>x.id===b.dataset.check);if(!row)return;const {error}=await db.from('rsvps').update({checked_in:!row.checked_in}).eq('id',row.id);if(error)alert(error.message);else await loadRows();return}if(b.dataset.action){const a=b.dataset.action;if(a==='rsvp'){state.tab='rsvp';await loadReceptionStatus();render()}else if(a==='guestbook'||a==='archive'){state.tab=a;render()}else if(a==='editLookup'){state.rsvpMode='lookup';render()}else if(a==='newRsvp'){state.rsvpMode='new';state.name='';state.pin='';render()}else if(a==='deleteOwnRsvp'){
  if(state.loading)return;
  if(rsvpClosed()){alert('응답 삭제 기한이 지났습니다. 신랑·신부에게 연락해 주세요.');return}
  if(!confirm('등록한 참석 응답을 삭제할까요? 삭제 후에는 기존 응답을 불러올 수 없으며 다시 등록해야 합니다.'))return;
  const errorNode=document.querySelector('#form-error');
  const name=document.querySelector('#guest-name')?.value.trim()||state.name;
  const pin=document.querySelector('#guest-pin')?.value||state.pin;
  if(!name||!/^\d{4}$/.test(pin)){if(errorNode)errorNode.textContent='이름과 4자리 비밀번호를 확인해 주세요.';return}
  if(!state.turnstileToken){if(errorNode)errorNode.textContent='삭제하려면 보안 인증을 다시 완료해 주세요.';return}
  state.loading=true;b.disabled=true;
  const {data:result,error}=await db.functions.invoke('rsvp-v2',{body:{action:'delete',name,pin,turnstileToken:state.turnstileToken}});
  state.loading=false;state.turnstileToken=null;
  if(!error&&!result?.error)await loadReceptionStatus();
  if(error||result?.error){let message=result?.error;if(!message&&error?.context){try{message=(await error.context.json())?.error}catch{}}
    if(errorNode)errorNode.textContent=message||'삭제하지 못했습니다. 보안 인증 후 다시 시도해 주세요.';
    b.disabled=false;if(window.turnstile){try{window.turnstile.reset()}catch{}}return}
  state.rsvpMode='deleted';state.name='';state.pin='';render();window.scrollTo(0,0);
}else if(a==='video')alert('초대영상이 준비되면 이곳에서 재생됩니다.');else if(a.startsWith('copy:')){const parts=a.split(':');const acc=C.accounts[Number(parts[1])]?.members?.[Number(parts[2])];if(acc?.number){try{await navigator.clipboard.writeText(acc.number);b.textContent='복사 완료 ✓'}catch{b.textContent='계좌번호를 선택해 복사해 주세요'}}}else if(a==='refreshBoarding'){await loadRows();await loadBoarding()}else if(a==='refresh')await loadRows();else if(a==='csv')csv();else if(a==='logout'){await db.auth.signOut();state.session=null;render()}}}const img=e.target.closest('[data-photo]');if(img){openPhotoLightbox(img.dataset.photo)}});
app.addEventListener('change',e=>{if(e.target.id==='shuttle-route'){state.shuttleRoute=e.target.value;state.shuttleSearch='';render()}});
app.addEventListener('input',e=>{if(e.target.id==='shuttle-search'){state.shuttleSearch=e.target.value;const field=e.target;const start=field.selectionStart;render();const next=document.querySelector('#shuttle-search');if(next){next.focus();next.setSelectionRange(start,start)}return}if(e.target.id==='guest-name')state.name=e.target.value;if(e.target.id==='guest-pin')state.pin=e.target.value});
app.addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(form.id==='rsvp-form'||form.id==='rsvp-lookup-form'){
  const name=form.querySelector('[name=name]').value.trim();
  const pin=form.querySelector('[name=pin]').value;
  const errorNode=form.querySelector('#form-error');
  if(!name||!/^[0-9]{4}$/.test(pin)){errorNode.textContent='성함과 숫자 4자리 비밀번호를 확인해 주세요.';return}
  if(rsvpClosed()){errorNode.textContent='응답 및 수정이 마감되었습니다. 신랑·신부에게 연락해 주세요.';return}
  if(!state.turnstileToken){errorNode.textContent='보안 인증을 완료한 후 제출해 주세요.';return}
  const trip=(key,leg)=>state.attendance==='참석'&&state[key]&&(state[key+'Trip']==='round'||state[key+'Trip']===leg)?state[key+'Count']:0;
  const data={name,pin,relationship:state.relationship,attendance:state.attendance,
    guests:state.attendance==='참석'?state.guests:0,meals:state.attendance==='참석'?state.meals:0,
    meal_slot:state.attendance==='참석'&&state.meals>0?'first':'none',
    gumi_outbound:trip('gumi','out'),gumi_return:trip('gumi','back'),
    gimcheon_outbound:trip('gimcheon','out'),gimcheon_return:trip('gimcheon','back')};
  if(form.id==='rsvp-form'&&data.gumi_outbound+data.gimcheon_outbound>data.guests||
     form.id==='rsvp-form'&&data.gumi_return+data.gimcheon_return>data.guests){
    errorNode.textContent='각 방향의 셔틀 이용 인원 합계는 참석 인원을 넘을 수 없습니다.';return
  }
  state.loading=true;
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  const action=form.id==='rsvp-lookup-form'?'lookup':state.rsvpMode==='edit'?'update':'create';
  const {data:result,error}=await db.functions.invoke('rsvp-v2',{body:{...data,action,turnstileToken:state.turnstileToken}});
  state.loading=false;state.turnstileToken=null;
  if(error||result?.error){
    let message=result?.error;
    if(!message&&error?.context){try{const detail=await error.context.json();message=detail?.error}catch{}}
    errorNode.textContent=message||'처리하지 못했습니다. 인증을 다시 완료한 후 시도해 주세요.';
    submit.disabled=false;if(window.turnstile){try{window.turnstile.reset()}catch{}}return;
  }
  if(action==='lookup'){
    const r=result?.record;
    if(!r){errorNode.textContent='응답을 불러오지 못했습니다.';submit.disabled=false;return}
    Object.assign(state,{name:r.name,pin,relationship:r.relationship,attendance:r.attendance,guests:r.guests||1,meals:r.meals||0,mealSlot:'first',
      gumi:!!(r.gumi_outbound||r.gumi_return),gimcheon:!!(r.gimcheon_outbound||r.gimcheon_return),
      gumiCount:Math.max(r.gumi_outbound,r.gumi_return,1),gimcheonCount:Math.max(r.gimcheon_outbound,r.gimcheon_return,1),
      gumiTrip:r.gumi_outbound&&r.gumi_return?'round':r.gumi_outbound?'out':'back',
      gimcheonTrip:r.gimcheon_outbound&&r.gimcheon_return?'round':r.gimcheon_outbound?'out':'back',rsvpMode:'edit'});
  }else{state.editSaved=action==='update';state.rsvpMode='done'}
  render();window.scrollTo(0,0);
}else if(form.id==='login-form'){const fd=new FormData(form);const {data,error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){form.querySelector('#login-error').textContent='로그인 실패: 이메일 또는 비밀번호를 확인해 주세요.';return}state.session=data.session;await refreshFeatures(true);await loadRows()}else if(form.id==='envelope-form'){if(state.envelopeBusy)return;const fd=new FormData(form),guest_name=String(fd.get('guest_name')||'').trim(),meal_tickets=Number(fd.get('meal_tickets')),gift_quantity=Number(fd.get('gift_quantity'));const msg=form.querySelector('#envelope-error');if(!guest_name||!Number.isInteger(meal_tickets)||meal_tickets<0||meal_tickets>30||![0,1].includes(gift_quantity)||(meal_tickets>0&&gift_quantity>0)){msg.textContent='이름·수량을 확인해 주세요. 식권과 답례품은 중복 지급할 수 없습니다.';return}state.envelopeBusy=true;const {error}=await db.from('wedding_envelopes').insert({guest_name,rsvp_id:fd.get('rsvp_id')||null,meal_tickets,gift_quantity});state.envelopeBusy=false;if(error){msg.textContent=error.message;return}await loadEnvelopes();return}else if(form.id==='walkin-form'){const fd=new FormData(form);const guests=Number(fd.get('guests')),meals=Number(fd.get('meals'));if(meals>guests){form.querySelector('#walkin-error').textContent='식사 인원은 참석 인원보다 많을 수 없습니다.';return}const {error}=await db.from('rsvps').insert({name:String(fd.get('name')).trim(),relationship:fd.get('relationship'),attendance:'참석',guests,meals,shuttle_count:0,checked_in:true});if(error){form.querySelector('#walkin-error').textContent=error.message?.includes('RECEPTION_CAPACITY_EXCEEDED')?'피로연 정원 120명을 초과했습니다. 식사 인원을 줄여주세요.':'등록 실패: '+error.message;return}await loadRows()}});
async function init(){state.admin=location.pathname.startsWith('/admin');if(db){const {data}=await db.auth.getSession();state.session=data.session;db.auth.onAuthStateChange((_event,session)=>{state.session=session});await refreshFeatures(state.admin&&!!state.session);if(state.admin&&state.session){await loadRows();return}await loadReceptionStatus()}render()};init();
