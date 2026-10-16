import {createClient} from '@supabase/supabase-js';
import {CONFIG as C} from './config.js';
import './style.css';

const turnstileScript = document.createElement('script');
turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
turnstileScript.async = true;
turnstileScript.defer = true;
document.head.appendChild(turnstileScript);

const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key):null;
const app=document.querySelector('#app');
const state={tab:'home',relationship:'가족',attendance:'참석',shuttle:false,guests:1,meals:1,shuttleCount:1,submitted:false,name:'',pin:'',rsvpMode:'new',gumi:false,gimcheon:false,gumiTrip:'round',gimcheonTrip:'round',gumiCount:1,gimcheonCount:1,mealSlot:'undecided',admin:false,session:null,rows:[],loading:false,turnstileToken:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='button')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const chip=(label,group,value,selected)=>`<button type="button" class="chip ${selected?'active':''}" data-group="${group}" data-value="${esc(value)}">${esc(label)}</button>`;
const count=(key,label,min=1)=>`<div class="field"><label>${label}</label><div class="stepper"><button type="button" data-counter="${key}" data-delta="-1">−</button><span>${state[key]}명</span><button type="button" data-counter="${key}" data-delta="1">+</button></div></div>`;
function home(){return `<section class="home-invitation"><div class="home-overline">Together, from now on</div><div class="home-hero-wrap">${C.heroVideo?`<video class="hero hero-video" src="${esc(C.heroVideo)}" poster="${esc(C.photos[0] || '')}" autoplay muted loop playsinline webkit-playsinline preload="metadata" aria-label="다래와 민우의 초대 영상"></video>`:C.photos.length?`<img class="hero" src="${esc(C.photos[0])}" alt="우리의 한복 스냅">`:'<div class="placeholder">우리의 한복 스냅사진을 준비하고 있습니다.</div>'}</div><div class="home-identity"><div class="home-label">INVITATION</div><h1 class="home-heading">우리, 혼례합니다</h1><div class="home-names">${esc(C.names)}</div><p class="home-detail">${esc(C.date)}<br>${esc(C.ceremony.time)} · ${esc(C.ceremony.name)}</p></div>${C.invitationVideo?`<div class="panel"><iframe title="초대영상" src="${esc(C.invitationVideo)}" width="100%" height="220" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`:''}<div class="home-divider" aria-hidden="true"></div><p class="home-message">저희 두 사람의 새로운 시작에<br>함께하시어 축복해 주시기 바랍니다.</p>${button('참석 여부 알려주기 →','rsvp','button secondary')}</section>`}
function gallery(){return `<div class="center small muted" style="letter-spacing:3px">OUR MOMENTS</div><h1 class="heading">우리의 순간들</h1><div class="flourish">─ ✿ ─</div><p class="center intro muted">다래와 민우의 소중한 기록<br>사진을 누르면 크게 볼 수 있어요.</p>${C.galleryPhotos.length?`<div class="gallery-grid">${C.galleryPhotos.map((p,i)=>`<button type="button" class="gallery-item" data-photo="${esc(p)}" aria-label="사진 ${i+1} 크게 보기"><img src="${esc(p)}" alt="한복 스냅 ${i+1}" loading="lazy"></button>`).join('')}</div>`:'<div class="panel center">사진을 준비하고 있습니다.</div>'}`}
const rsvpClosed=()=>Date.now()>new Date(C.rsvpDeadline+'T23:59:59+09:00').getTime();
const routeFields=(key,label)=>`<div class="panel shuttle-route"><b>${label} 셔틀버스 이용</b><div class="chips">${chip('이용 안 함',key,'no',!state[key])}${chip('이용함',key,'yes',state[key])}</div>${state[key]?`<div class="field"><label>이용 구간</label><div class="chips">${chip('왕복',key+'Trip','round',state[key+'Trip']==='round')}${chip('서울행 편도',key+'Trip','out',state[key+'Trip']==='out')}${chip('귀가 편도',key+'Trip','back',state[key+'Trip']==='back')}</div></div>${count(key+'Count','이용 인원')}`:''}</div>`;
const pinField=()=>`<div class="field"><label for="guest-pin">숫자 4자리 비밀번호</label><input id="guest-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" minlength="4" required autocomplete="off" value="${esc(state.pin)}" placeholder="숫자 4자리"><p class="small muted">나중에 응답을 수정할 때 필요합니다. 잊지 않도록 기억해 주세요.</p></div>`;
function rsvp(){
  const closed=rsvpClosed(), edit=state.rsvpMode==='edit', lookup=state.rsvpMode==='lookup';
  if(state.rsvpMode==='done')return `<div class="center" style="padding:55px 0"><div class="flower" style="font-size:42px">✿</div><h1>감사합니다</h1><p class="intro">${state.editSaved?'수정된 참석 정보가 저장되었습니다.':'참석 여부가 접수되었습니다.'}<br>11월 6일까지 이름과 비밀번호로 다시 수정하실 수 있습니다.</p>${button('기존 응답 수정하기','editLookup','button secondary')}</div>`;
  const head=`<h1 class="heading">참석 여부를 알려주세요</h1><div class="flourish">─ ✿ ─</div><p class="center intro">귀한 걸음 준비에 참고하고자<br>참석 여부를 여쭙습니다.</p><p class="center small muted">응답 및 수정 마감: 2026년 11월 6일 (금) 23:59</p>`;
  if(closed)return head+'<div class="panel center">응답 및 수정 기간이 마감되었습니다.<br>변경이나 추가 참석은 신랑·신부에게 직접 연락해 주세요.</div>';
  const tabs=`<div class="chips rsvp-tabs">${chip('새로 응답하기','rsvpMode','new',!lookup&&!edit)}${chip('기존 응답 수정하기','rsvpMode','lookup',lookup||edit)}</div>`;
  const name=`<div class="field"><label for="guest-name">성함</label><input id="guest-name" name="name" required maxlength="60" autocomplete="name" value="${esc(state.name)}" placeholder="성함을 입력해 주세요"></div>`;
  const verify=`<div id="turnstile-widget"></div><p id="form-error" class="error" role="alert"></p>`;
  if(lookup)return head+tabs+`<form id="rsvp-lookup-form">${name}${pinField()}<p class="small muted">최초 응답 당시 설정한 이름과 비밀번호를 입력해 주세요.</p>${verify}<button class="button" type="submit">내 응답 불러오기</button></form>`;
  const relationship=`<div class="field"><label>우리와의 인연</label><div class="chips">${['가족','직장','학교','친구','기타'].map(v=>chip(v,'relationship',v,state.relationship===v)).join('')}</div></div>`;
  const attendance=`<div class="field"><label>참석 여부</label><div class="chips">${chip('참석합니다','attendance','참석',state.attendance==='참석')}${chip('참석이 어렵습니다','attendance','불참',state.attendance==='불참')}</div></div>`;
  const mealChoice=`<div class="panel meal-choice"><b>식사 시간 선택</b><p class="small muted">식사하실 시간대를 선택해 주세요. 단체버스 이용객께는 2부를 권장합니다.</p><div class="chips">${chip('1부 · 15:30~17:30','mealSlot','first',state.mealSlot==='first')}${chip('2부 · 18:30~20:30','mealSlot','second',state.mealSlot==='second')}${chip('미정','mealSlot','undecided',state.mealSlot==='undecided')}</div><p class="small muted">식사 인원이 0명이면 시간대 선택은 적용되지 않습니다. 참석 인원과 식사 인원은 별도로 입력해 주세요.</p></div>`;
  const details=state.attendance==='참석'?
    count('guests','함께 오시는 분 포함 참석 인원')+count('meals','아미드호텔 피로연 식사 인원',0)+(state.meals>0?mealChoice:'')+routeFields('gumi','구미 출발')+routeFields('gimcheon','김천 출발'):'';
  const notice='<div class="panel notice">11월 6일까지 이름과 숫자 4자리 비밀번호로 응답을 수정할 수 있습니다. 마감 후에는 신랑·신부에게 따로 연락해 주세요.<br>연락처는 수집하지 않으며 참석 확인과 행사 운영 목적으로만 정보를 사용합니다. 비밀번호는 암호화된 검증값으로 보관합니다.</div>';
  const disabled=!db||state.loading?'disabled':'';
  const submit=state.loading?'전송 중…':edit?'수정 내용 저장하기':'참석 여부 전달하기';
  return head+tabs+`<form id="rsvp-form">${name}${pinField()}${relationship}${attendance}${details}${notice}${!db?'<p class="error">현재 데모 모드입니다. Supabase 연결 전에는 응답을 제출할 수 없습니다.</p>':''}${verify}<button class="button" type="submit" ${disabled}>${submit}</button></form>`;
}
const maplinks=name=>`<div class="mapbuttons"><a href="https://map.naver.com/p/search/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a href="https://map.kakao.com/?q=${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">카카오맵 ↗</a></div>`;
const navAddress=place=>encodeURIComponent(place.address);
const mapFrame=place=>`<div class="directions-map"><iframe title="${esc(place.name)} 위치 지도" src="https://maps.google.com/maps?q=${navAddress(place)}&amp;z=16&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
const venueMapLinks=place=>`<div class="directions-actions"><a href="https://map.naver.com/p/search/${navAddress(place)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(place.name)} 네이버지도에서 열기">네이버지도 <span aria-hidden="true">↗</span></a><a href="https://map.kakao.com/?q=${navAddress(place)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(place.name)} 카카오맵에서 열기">카카오맵 <span aria-hidden="true">↗</span></a></div>`;
const routeUrl=()=>`https://www.google.com/maps/dir/?api=1&origin=${navAddress(C.ceremony)}&destination=${navAddress(C.reception)}&travelmode=walking`;
const venueSection=(n,label,place)=>`<section class="directions-venue" aria-labelledby="directions-venue-${n}"><div class="directions-venue-head"><span class="directions-index">${n}</span><div><p class="directions-caption">${label}</p><h2 id="directions-venue-${n}">${esc(place.name)}</h2></div></div><p class="directions-time">${esc(C.date)}<br><strong>${esc(place.time)}</strong></p><p class="directions-address">${esc(place.address)}</p>${mapFrame(place)}${venueMapLinks(place)}</section>`;
function guide(){
  const shuttleMessage=C.shuttleDetails||'탑승 장소와 시간은 확정 후 안내해 드립니다.';
  const notices=(C.notices||[]).map(n=>`<details class="guest-notice"><summary><span>${esc(n.title)}</span><time>${esc(n.date)}</time></summary><p>${esc(n.body)}</p></details>`).join('');
  const schedule=`<section class="guest-section"><div class="directions-mini-label">WEDDING DAY</div><h2>당일 일정</h2><div class="guest-schedule"><p><b>13:00</b> 김천 검역본부 · 구미시청 셔틀 출발</p><p><b>15:30–17:30</b> 아미드호텔 1부 식사</p><p><b>17:50</b> 운현궁 사물놀이</p><p><b>18:00</b> 운현궁 전통혼례</p><p><b>18:30–20:30</b> 아미드호텔 2부 식사</p><p><b>20:30</b> 김천 · 구미 귀가 셔틀 출발</p></div></section>`;
  return `<section class="directions-page"><div class="directions-overline">THE WAY TO OUR WEDDING</div><h1 class="directions-title">오시는 길</h1><p class="directions-intro">소중한 걸음, 편안히 오실 수 있도록<br>두 장소를 안내해 드립니다.</p><div class="directions-rule" aria-hidden="true"></div>
  <section class="guest-section"><div class="directions-mini-label">LATEST UPDATES</div><h2>공지사항</h2><p class="directions-note">본 모바일 청첩장은 계속 업데이트됩니다. 방문 전 공지사항을 다시 확인해 주세요.</p>${notices}</section>
  ${schedule}
  <div class="directions-journey" aria-label="결혼식 장소 안내"><div class="directions-journey-stop"><span class="directions-journey-mark" aria-hidden="true">01</span><div><span class="directions-journey-type">CEREMONY · 오후 6시</span><strong>${esc(C.ceremony.name)}</strong></div></div><div class="directions-journey-path" aria-hidden="true"><span></span><span>↔</span><span></span></div><div class="directions-journey-stop"><span class="directions-journey-mark" aria-hidden="true">02</span><div><span class="directions-journey-type">RECEPTION · 1부 15:30 / 2부 18:30</span><strong>${esc(C.reception.name)}</strong></div></div></div>
  ${venueSection('01','WEDDING CEREMONY · 혼례',C.ceremony)}
  <section class="directions-transfer" aria-labelledby="transfer-title"><div class="directions-mini-label">FROM CEREMONY TO RECEPTION</div><h2 id="transfer-title">운현궁에서 아미드호텔까지</h2><p>식사는 <strong>아미드호텔 서울</strong>에서<br>1부(15:30~17:30)·2부(18:30~20:30)로 나누어 진행됩니다.</p><a class="directions-primary-link" href="${routeUrl()}" target="_blank" rel="noopener noreferrer">두 장소 사이 도보 경로 확인 <span aria-hidden="true">↗</span></a><p class="directions-note">두 장소 사이 도보 약 10분이며, 약 15분 간격의 순환 셔틀 운행 예정입니다.<br>셔틀 정류장·첫차·막차는 확정 후 공지합니다.</p></section>
  ${venueSection('02','WEDDING RECEPTION · 피로연',C.reception)}
  <section class="directions-info" aria-labelledby="travel-info-heading"><div class="directions-mini-label">TRAVEL INFORMATION</div><h2 id="travel-info-heading">교통 안내</h2><div class="directions-info-row"><span class="directions-info-icon" aria-hidden="true">✦</span><div><h3>구미 · 김천 출발 셔틀버스</h3><p>${esc(shuttleMessage)}</p><p>이용 여부와 왕복·편도는 ‘참석’ 메뉴에서 알려주세요.</p></div></div><div class="directions-info-row"><span class="directions-info-icon" aria-hidden="true">✦</span><div><h3>주차 안내</h3><p>호텔과 운현궁 모두 무료 주차 지원이 없습니다. 아미드호텔 주차장과 운현궁 인근 주차장은 유료입니다. 추천 주차장과 요금은 확인 후 공지합니다.</p></div></div></section><section class="guest-section guest-heritage"><h2>운현궁 관람 안내</h2><p>사진은 해가 지기 전 촬영하시면 좋습니다. 오후 5시 50분 사물놀이를 시작할 예정입니다.</p><p>일반 관람석은 약 20석으로 제한되어 있어 대부분 서서 관람하거나 마루에 걸터앉을 수 있습니다. 11월 야외 혼례이므로 따뜻한 외투와 편안한 신발을 권합니다.</p><p><strong>문화유적지 보존을 위해 음식물 및 꽃·꽃다발·화환 반입이 금지됩니다.</strong></p></section><p class="directions-end">We look forward to seeing you.</p></section>`;
}
function more(){return `<h1 class="heading">마음 전하실 곳</h1><div class="flourish">─ ✿ ─</div><p class="center intro">축하해 주시는 따뜻한 마음에<br>진심으로 감사드립니다.</p>${C.accounts.map((a,i)=>`<div class="panel"><b>${esc(a.label)}</b>${a.number?`<p class="small">${esc(a.bank)} ${esc(a.number)}<br>예금주 ${esc(a.holder)}</p>${button('계좌번호 복사','copy:'+i,'button secondary')}`:'<p class="muted small">계좌 정보는 추후 안내됩니다.</p>'}</div>`).join('')}<div class="panel center"><div class="flower" style="font-size:29px">✿</div><h2>Wedding Archive</h2><p class="intro muted">결혼식이 끝난 뒤 이곳에서<br>사진과 영상을 함께 보실 수 있습니다.</p></div>`}
function admin(){if(!db)return '<h1>관리자</h1><p>Supabase 연결 후 관리자 기능을 사용할 수 있습니다.</p>';if(!state.session)return `<div class="admin"><h1 class="heading">관리자 로그인</h1><p class="center small muted">사전에 Supabase에서 생성한 관리자 계정으로 로그인하세요.</p><form id="login-form"><div class="field"><label>이메일</label><input name="email" type="email" required></div><div class="field"><label>비밀번호</label><input name="password" type="password" required></div><p id="login-error" class="error"></p><button class="button">로그인</button></form></div>`;const rows=state.rows,att=rows.filter(x=>x.attendance==='참석');return `<div class="admin"><h1>하객 관리</h1><div class="actions">${button('새로고침','refresh','button secondary')}${button('CSV 다운로드','csv','button secondary')}${button('로그아웃','logout','button secondary')}</div><div class="stats"><div>응답 <b>${rows.length}</b></div><div>참석 인원 <b>${att.reduce((n,r)=>n+r.guests,0)}</b></div><div>식사 인원 <b>${att.reduce((n,r)=>n+r.meals,0)}</b></div><div>셔틀 인원 <b>${att.reduce((n,r)=>n+r.shuttle_count,0)}</b></div><div>도착 처리 <b>${att.filter(r=>r.checked_in).reduce((n,r)=>n+r.guests,0)}</b></div></div><div class="field"><label>하객 검색</label><input id="admin-search" placeholder="이름 또는 인연"></div><div class="tablewrap"><table><thead><tr><th>성함</th><th>인연</th><th>참석</th><th>인원</th><th>식사</th><th>식사 시간</th><th>셔틀 합계</th><th>구미 서울행</th><th>구미 귀가</th><th>김천 서울행</th><th>김천 귀가</th><th>도착</th></tr></thead><tbody id="admin-body">${rowHtml(rows)}</tbody></table></div><h2 style="margin-top:30px">현장 미등록 하객</h2><form id="walkin-form"><div class="field"><label>성함</label><input name="name" required maxlength="60"></div><div class="field"><label>우리와의 인연</label><select name="relationship"><option>가족</option><option>직장</option><option>학교</option><option>친구</option><option>기타</option></select></div><div class="field"><label>참석 인원</label><input name="guests" type="number" min="1" max="30" value="1" required></div><div class="field"><label>식사 인원</label><input name="meals" type="number" min="0" max="30" value="1" required></div><p id="walkin-error" class="error"></p><button class="button">현장 하객 등록</button></form></div>`}
function rowHtml(rows){return rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.relationship)}</td><td>${esc(r.attendance)}</td><td>${r.guests}</td><td>${r.meals}</td><td>${esc(({first:'1부',second:'2부',undecided:'미정',none:'식사 없음'})[r.meal_slot]||'미정')}</td><td>${r.shuttle_count}</td><td>${r.gumi_outbound??0}</td><td>${r.gumi_return??0}</td><td>${r.gimcheon_outbound??0}</td><td>${r.gimcheon_return??0}</td><td><button class="chip ${r.checked_in?'active':''}" data-check="${esc(r.id)}" ${r.attendance!=='참석'?'disabled':''}>${r.checked_in?'도착 ✓':'체크인'}</button></td></tr>`).join('')}

function render(){
  const adminMode=state.admin||location.pathname.startsWith('/admin');

  app.innerHTML=`<div class="shell"><header class="top"><span>DA-RAE &amp; MINWOO</span><span class="flower" style="font-size:25px">✿</span><span>2026.11.14</span></header><main class="main">${adminMode?admin():C.postWedding?`<h1 class="heading">함께해주셔서 감사합니다</h1><div class="flourish">─ ✿ ─</div>${C.photos.length?`<div class="photo-grid">${C.photos.map(p=>`<img src="${esc(p)}" alt="혼례 사진" loading="lazy" data-photo="${esc(p)}">`).join('')}</div>`:''}${C.archiveVideo?`<iframe title="혼례 영상" width="100%" height="220" src="${esc(C.archiveVideo)}" allowfullscreen></iframe>`:''}`:({home,gallery,rsvp,guide,more}[state.tab]())}</main>${!adminMode&&!C.postWedding?`<nav class="nav">${[['home','초대'],['gallery','갤러리'],['rsvp','참석'],['guide','안내'],['more','더보기']].map(([v,t])=>`<button data-tab="${v}" class="${state.tab===v?'selected':''}">${t}</button>`).join('')}</nav>`:''}</div>`;

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

      window.turnstile.render(widget,{
        sitekey:siteKey,
        callback:(token)=>{
          state.turnstileToken=token;
        },
        'expired-callback':()=>{
          state.turnstileToken=null;
        },
        'error-callback':()=>{
          state.turnstileToken=null;
        }
      });
    };

    if(window.turnstile){
      showTurnstile();
    }else{
      turnstileScript.addEventListener('load',showTurnstile,{once:true});
    }
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
app.addEventListener('click',async e=>{const b=e.target.closest('button');if(b){if(b.dataset.tab){state.tab=b.dataset.tab;render();window.scrollTo(0,0);return}if(b.dataset.group){const group=b.dataset.group,val=b.dataset.value;if(group==='gumi'||group==='gimcheon')state[group]=val==='yes';else if(group==='rsvpMode'){state.rsvpMode=val;state.submitted=false;}else state[group]=val;render();return}if(b.dataset.counter){const k=b.dataset.counter;state[k]=Math.max(k==='meals'?0:1,Math.min(30,state[k]+Number(b.dataset.delta)));if(k==='guests'){state.meals=Math.min(state.meals,state.guests);state.shuttleCount=Math.min(state.shuttleCount,state.guests);state.gumiCount=Math.min(state.gumiCount,state.guests);state.gimcheonCount=Math.min(state.gimcheonCount,state.guests)}if(k==='meals')state.meals=Math.min(state.meals,state.guests);if(k==='shuttleCount')state.shuttleCount=Math.min(state.shuttleCount,state.guests);if(k==='gumiCount')state.gumiCount=Math.min(state.gumiCount,state.guests);if(k==='gimcheonCount')state.gimcheonCount=Math.min(state.gimcheonCount,state.guests);render();return}if(b.dataset.check){const row=state.rows.find(x=>x.id===b.dataset.check);if(!row)return;const {error}=await db.from('rsvps').update({checked_in:!row.checked_in}).eq('id',row.id);if(error)alert(error.message);else await loadRows();return}if(b.dataset.action){const a=b.dataset.action;if(a==='rsvp'){state.tab='rsvp';render()}else if(a==='editLookup'){state.rsvpMode='lookup';render()}else if(a==='video')alert('초대영상이 준비되면 이곳에서 재생됩니다.');else if(a.startsWith('copy:')){const acc=C.accounts[Number(a.split(':')[1])];if(acc.number)navigator.clipboard.writeText(acc.number)}else if(a==='refresh')await loadRows();else if(a==='csv')csv();else if(a==='logout'){await db.auth.signOut();state.session=null;render()}}}const img=e.target.closest('[data-photo]');if(img){openPhotoLightbox(img.dataset.photo)}});
app.addEventListener('input',e=>{if(e.target.id==='guest-name')state.name=e.target.value;if(e.target.id==='guest-pin')state.pin=e.target.value});
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
    meal_slot:state.attendance==='참석'&&state.meals>0?state.mealSlot:'none',
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
    Object.assign(state,{name:r.name,pin,relationship:r.relationship,attendance:r.attendance,guests:r.guests||1,meals:r.meals||0,mealSlot:r.meal_slot||(r.meals>0?'undecided':'none'),
      gumi:!!(r.gumi_outbound||r.gumi_return),gimcheon:!!(r.gimcheon_outbound||r.gimcheon_return),
      gumiCount:Math.max(r.gumi_outbound,r.gumi_return,1),gimcheonCount:Math.max(r.gimcheon_outbound,r.gimcheon_return,1),
      gumiTrip:r.gumi_outbound&&r.gumi_return?'round':r.gumi_outbound?'out':'back',
      gimcheonTrip:r.gimcheon_outbound&&r.gimcheon_return?'round':r.gimcheon_outbound?'out':'back',rsvpMode:'edit'});
  }else{state.editSaved=action==='update';state.rsvpMode='done'}
  render();window.scrollTo(0,0);
}else if(form.id==='login-form'){const fd=new FormData(form);const {data,error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){form.querySelector('#login-error').textContent='로그인 실패: 이메일 또는 비밀번호를 확인해 주세요.';return}state.session=data.session;await loadRows()}else if(form.id==='walkin-form'){const fd=new FormData(form);const guests=Number(fd.get('guests')),meals=Number(fd.get('meals'));if(meals>guests){form.querySelector('#walkin-error').textContent='식사 인원은 참석 인원보다 많을 수 없습니다.';return}const {error}=await db.from('rsvps').insert({name:String(fd.get('name')).trim(),relationship:fd.get('relationship'),attendance:'참석',guests,meals,shuttle_count:0,checked_in:true});if(error){form.querySelector('#walkin-error').textContent='등록 실패: '+error.message;return}await loadRows()}});
async function init(){state.admin=location.pathname.startsWith('/admin');if(db){const {data}=await db.auth.getSession();state.session=data.session;db.auth.onAuthStateChange((_event,session)=>{state.session=session});if(state.admin&&state.session){await loadRows();return}}render()};init();
