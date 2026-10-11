import {createClient} from '@supabase/supabase-js';
import {CONFIG as C} from './config.js';
import './style.css';
const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key):null;
const app=document.querySelector('#app');
const state={tab:'home',relationship:'가족',attendance:'참석',shuttle:false,guests:1,meals:1,shuttleCount:1,submitted:false,name:'',admin:false,session:null,rows:[],loading:false};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='button')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const chip=(label,group,value,selected)=>`<button type="button" class="chip ${selected?'active':''}" data-group="${group}" data-value="${esc(value)}">${esc(label)}</button>`;
const count=(key,label,min=1)=>`<div class="field"><label>${label}</label><div class="stepper"><button type="button" data-counter="${key}" data-delta="-1">−</button><span>${state[key]}명</span><button type="button" data-counter="${key}" data-delta="1">+</button></div></div>`;
function home(){return `<div class="center small muted" style="font-style:italic">Together, from now on</div><div class="flourish">─ ✿ ─</div>${C.photos.length?`<img class="hero" src="${esc(C.photos[0])}" alt="우리의 한복 스냅">`:'<div class="placeholder"><div style="font-size:45px">✿</div>우리의 한복 스냅사진이<br>이곳에 들어갑니다</div>'}<div class="center" style="padding:23px 0"><div class="small muted" style="letter-spacing:3px">INVITATION</div><h1 class="heading">우리, 혼례합니다</h1><div style="font-size:19px">${esc(C.names)}</div><p class="intro">${esc(C.date)} · ${esc(C.ceremony.time)}<br>${esc(C.ceremony.name)}</p></div>${C.invitationVideo?`<div class="panel"><iframe title="초대영상" src="${esc(C.invitationVideo)}" width="100%" height="220" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`:button('▷ 초대영상 준비 중','video')}<p class="center intro" style="margin:32px 0">소중한 분들을 모시고<br>우리의 새로운 시작을 함께하고자 합니다.<br>귀한 걸음으로 자리를 빛내주세요.</p>${C.photos.length>1?`<div class="photo-grid">${C.photos.slice(1).map(p=>`<img src="${esc(p)}" alt="한복 스냅" loading="lazy" data-photo="${esc(p)}">`).join('')}</div>`:''}${button('참석 여부 알려주기 →','rsvp','button secondary')}`}
function rsvp(){if(state.submitted)return `<div class="center" style="padding:75px 0"><div class="flower" style="font-size:48px">✿</div><h1>감사합니다</h1><p class="intro">참석 여부가 접수되었습니다.<br>변경이 필요한 경우 신랑·신부에게 연락해 주세요.</p></div>`;const deadline=C.rsvpDeadline&&new Date(C.rsvpDeadline+'T23:59:59+09:00').getTime()<Date.now();return `<h1 class="heading">참석 여부를 알려주세요</h1><div class="flourish">─ ✿ ─</div><p class="center intro">귀한 걸음 준비에 참고하고자<br>참석 여부를 여쭙습니다.</p>${C.rsvpDeadline?`<p class="center small muted">응답 마감: ${esc(C.rsvpDeadline)}</p>`:''}${deadline?'<div class="panel center">참석 여부 조사가 마감되었습니다.<br>변경이나 추가 참석은 신랑·신부에게 알려주세요.</div>':`<form id="rsvp-form"><div class="field"><label for="guest-name">성함</label><input id="guest-name" name="name" required maxlength="60" autocomplete="name" value="${esc(state.name)}" placeholder="성함을 입력해 주세요"></div><div class="field"><label>우리와의 인연</label><div class="chips">${['가족','직장','학교','친구','기타'].map(v=>chip(v,'relationship',v,state.relationship===v)).join('')}</div></div><div class="field"><label>참석 여부</label><div class="chips">${chip('참석합니다','attendance','참석',state.attendance==='참석')}${chip('참석이 어렵습니다','attendance','불참',state.attendance==='불참')}</div></div>${state.attendance==='참석'?`${count('guests','함께 오시는 분을 포함한 참석 인원')}${count('meals','아미드호텔 피로연 식사 인원',0)}<div class="field"><label>구미 출발 셔틀버스를 이용하시나요?</label><div class="chips">${chip('이용하지 않습니다','shuttle','no',!state.shuttle)}${chip('이용합니다','shuttle','yes',state.shuttle)}</div></div>${state.shuttle?count('shuttleCount','셔틀 이용 인원'):''}`:''}<div class="panel notice">제출 후 직접 수정할 수 없습니다. 연락처는 수집하지 않습니다. 입력 정보는 참석 확인 및 결혼식 운영에만 사용하며, 결혼 후 정리·삭제합니다.</div>${!db?'<p class="error">현재 데모 모드입니다. Supabase를 연결하기 전에는 응답을 제출할 수 없습니다.</p>':''}<p id="form-error" class="error" role="alert"></p><button class="button" type="submit" ${!db||state.loading?'disabled':''}>${state.loading?'전송 중…':'참석 여부 전달하기'}</button></form>`}`}
const maplinks=name=>`<div class="mapbuttons"><a href="https://map.naver.com/p/search/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a href="https://map.kakao.com/?q=${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">카카오맵 ↗</a></div>`;
function guide(){return `<h1 class="heading">오시는 길</h1><div class="flourish">─ ✿ ─</div><div class="panel"><div class="flower small">01 · WEDDING CEREMONY</div><h2>${esc(C.ceremony.name)}</h2><p class="intro">${esc(C.date)} · ${esc(C.ceremony.time)}<br>${esc(C.ceremony.address)}</p>${maplinks(C.ceremony.name)}</div><div class="center flower">↓</div><div class="panel"><div class="flower small">02 · WEDDING RECEPTION</div><h2>${esc(C.reception.name)}</h2><p class="intro">${esc(C.date)} · ${esc(C.reception.time)}<br>${esc(C.reception.address)}</p>${maplinks(C.reception.name)}</div><div class="panel" style="background:#f8eeeb"><b>주차 안내</b><p class="intro">결혼식 당일 주차공간이 부족하오니 가급적 대중교통을 이용해 주시기 바랍니다.</p></div><div class="panel"><b>구미 출발 셔틀버스</b><p class="intro">${esc(C.shuttleDetails)}</p></div>`}
function more(){return `<h1 class="heading">마음 전하실 곳</h1><div class="flourish">─ ✿ ─</div><p class="center intro">축하해 주시는 따뜻한 마음에<br>진심으로 감사드립니다.</p>${C.accounts.map((a,i)=>`<div class="panel"><b>${esc(a.label)}</b>${a.number?`<p class="small">${esc(a.bank)} ${esc(a.number)}<br>예금주 ${esc(a.holder)}</p>${button('계좌번호 복사','copy:'+i,'button secondary')}`:'<p class="muted small">계좌 정보는 추후 안내됩니다.</p>'}</div>`).join('')}<div class="panel center"><div class="flower" style="font-size:29px">✿</div><h2>Wedding Archive</h2><p class="intro muted">결혼식이 끝난 뒤 이곳에서<br>사진과 영상을 함께 보실 수 있습니다.</p></div>`}
function admin(){if(!db)return '<h1>관리자</h1><p>Supabase 연결 후 관리자 기능을 사용할 수 있습니다.</p>';if(!state.session)return `<div class="admin"><h1 class="heading">관리자 로그인</h1><p class="center small muted">사전에 Supabase에서 생성한 관리자 계정으로 로그인하세요.</p><form id="login-form"><div class="field"><label>이메일</label><input name="email" type="email" required></div><div class="field"><label>비밀번호</label><input name="password" type="password" required></div><p id="login-error" class="error"></p><button class="button">로그인</button></form></div>`;const rows=state.rows,att=rows.filter(x=>x.attendance==='참석');return `<div class="admin"><h1>하객 관리</h1><div class="actions">${button('새로고침','refresh','button secondary')}${button('CSV 다운로드','csv','button secondary')}${button('로그아웃','logout','button secondary')}</div><div class="stats"><div>응답 <b>${rows.length}</b></div><div>참석 인원 <b>${att.reduce((n,r)=>n+r.guests,0)}</b></div><div>식사 인원 <b>${att.reduce((n,r)=>n+r.meals,0)}</b></div><div>셔틀 인원 <b>${att.reduce((n,r)=>n+r.shuttle_count,0)}</b></div><div>도착 처리 <b>${att.filter(r=>r.checked_in).reduce((n,r)=>n+r.guests,0)}</b></div></div><div class="field"><label>하객 검색</label><input id="admin-search" placeholder="이름 또는 인연"></div><div class="tablewrap"><table><thead><tr><th>성함</th><th>인연</th><th>참석</th><th>인원</th><th>식사</th><th>셔틀</th><th>도착</th></tr></thead><tbody id="admin-body">${rowHtml(rows)}</tbody></table></div><h2 style="margin-top:30px">현장 미등록 하객</h2><form id="walkin-form"><div class="field"><label>성함</label><input name="name" required maxlength="60"></div><div class="field"><label>우리와의 인연</label><select name="relationship"><option>가족</option><option>직장</option><option>학교</option><option>친구</option><option>기타</option></select></div><div class="field"><label>참석 인원</label><input name="guests" type="number" min="1" max="30" value="1" required></div><div class="field"><label>식사 인원</label><input name="meals" type="number" min="0" max="30" value="1" required></div><p id="walkin-error" class="error"></p><button class="button">현장 하객 등록</button></form></div>`}
function rowHtml(rows){return rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.relationship)}</td><td>${esc(r.attendance)}</td><td>${r.guests}</td><td>${r.meals}</td><td>${r.shuttle_count}</td><td><button class="chip ${r.checked_in?'active':''}" data-check="${esc(r.id)}" ${r.attendance!=='참석'?'disabled':''}>${r.checked_in?'도착 ✓':'체크인'}</button></td></tr>`).join('')}
function render(){const adminMode=state.admin||location.pathname.startsWith('/admin');app.innerHTML=`<div class="shell"><header class="top"><span>DA-RAE &amp; MINWOO</span><span class="flower" style="font-size:25px">✿</span><span>2026.11.14</span></header><main class="main">${adminMode?admin():C.postWedding?`<h1 class="heading">함께해주셔서 감사합니다</h1><div class="flourish">─ ✿ ─</div>${C.photos.length?`<div class="photo-grid">${C.photos.map(p=>`<img src="${esc(p)}" alt="혼례 사진" loading="lazy" data-photo="${esc(p)}">`).join('')}</div>`:''}${C.archiveVideo?`<iframe title="혼례 영상" width="100%" height="220" src="${esc(C.archiveVideo)}" allowfullscreen></iframe>`:''}`:({home,rsvp,guide,more}[state.tab]())}</main>${!adminMode&&!C.postWedding?`<nav class="nav">${[['home','초대'],['rsvp','참석'],['guide','안내'],['more','더보기']].map(([v,t])=>`<button data-tab="${v}" class="${state.tab===v?'selected':''}">${t}</button>`).join('')}</nav>`:''}</div>`}
async function loadRows(){if(!db||!state.session)return;const {data,error}=await db.from('rsvps').select('*').order('created_at',{ascending:false});if(error){alert('목록 조회 실패: '+error.message);return}state.rows=data;render()}

function csv(){
  const fields = [
    ['name', '성함'],
    ['relationship', '관계'],
    ['attendance', '참석 여부'],
    ['guests', '참석 인원'],
    ['meals', '식사 인원'],
    ['shuttle_count', '셔틀 인원'],
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
  
app.addEventListener('click',async e=>{const b=e.target.closest('button');if(b){if(b.dataset.tab){state.tab=b.dataset.tab;render();window.scrollTo(0,0);return}if(b.dataset.group){const group=b.dataset.group,val=b.dataset.value;if(group==='shuttle')state.shuttle=val==='yes';else state[group]=val;render();return}if(b.dataset.counter){const k=b.dataset.counter;state[k]=Math.max(k==='meals'?0:1,Math.min(30,state[k]+Number(b.dataset.delta)));if(k==='guests'){state.meals=Math.min(state.meals,state.guests);state.shuttleCount=Math.min(state.shuttleCount,state.guests)}if(k==='meals')state.meals=Math.min(state.meals,state.guests);if(k==='shuttleCount')state.shuttleCount=Math.min(state.shuttleCount,state.guests);render();return}if(b.dataset.check){const row=state.rows.find(x=>x.id===b.dataset.check);if(!row)return;const {error}=await db.from('rsvps').update({checked_in:!row.checked_in}).eq('id',row.id);if(error)alert(error.message);else await loadRows();return}if(b.dataset.action){const a=b.dataset.action;if(a==='rsvp'){state.tab='rsvp';render()}else if(a==='video')alert('초대영상이 준비되면 이곳에서 재생됩니다.');else if(a.startsWith('copy:')){const acc=C.accounts[Number(a.split(':')[1])];if(acc.number)navigator.clipboard.writeText(acc.number)}else if(a==='refresh')await loadRows();else if(a==='csv')csv();else if(a==='logout'){await db.auth.signOut();state.session=null;render()}}}const img=e.target.closest('[data-photo]');if(img){const overlay=document.createElement('div');overlay.className='lightbox';const photo=document.createElement('img');photo.src=img.dataset.photo;photo.alt='사진 확대';const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','닫기');overlay.append(photo,close);overlay.addEventListener('click',()=>overlay.remove());document.body.append(overlay)}});
app.addEventListener('input',e=>{if(e.target.id==='guest-name')state.name=e.target.value});
app.addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(form.id==='rsvp-form'){const name=form.querySelector('[name=name]').value.trim();if(!name)return;const payload={name,relationship:state.relationship,attendance:state.attendance,guests:state.attendance==='참석'?state.guests:0,meals:state.attendance==='참석'?state.meals:0,shuttle_count:state.attendance==='참석'&&state.shuttle?state.shuttleCount:0};state.loading=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;const {error}=await db.from('rsvps').insert(payload);state.loading=false;if(error){submit.disabled=false;form.querySelector('#form-error').textContent='접수하지 못했습니다. 잠시 후 다시 시도해 주세요.';return}state.submitted=true;render()}else if(form.id==='login-form'){const fd=new FormData(form);const {data,error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){form.querySelector('#login-error').textContent='로그인 실패: 이메일 또는 비밀번호를 확인해 주세요.';return}state.session=data.session;await loadRows()}else if(form.id==='walkin-form'){const fd=new FormData(form);const guests=Number(fd.get('guests')),meals=Number(fd.get('meals'));if(meals>guests){form.querySelector('#walkin-error').textContent='식사 인원은 참석 인원보다 많을 수 없습니다.';return}const {error}=await db.from('rsvps').insert({name:String(fd.get('name')).trim(),relationship:fd.get('relationship'),attendance:'참석',guests,meals,shuttle_count:0,checked_in:true});if(error){form.querySelector('#walkin-error').textContent='등록 실패: '+error.message;return}await loadRows()}});
async function init(){state.admin=location.pathname.startsWith('/admin');if(db){const {data}=await db.auth.getSession();state.session=data.session;db.auth.onAuthStateChange((_event,session)=>{state.session=session});if(state.admin&&state.session){await loadRows();return}}render()};init();
