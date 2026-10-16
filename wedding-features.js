import {createClient} from '@supabase/supabase-js';
let db,config,mode='guestbook',notices=[],messages=[],archive=[],loaded=false,replyTo=null,token=null;
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Date(v).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
const btn=(label,attr,id)=>'<button type="button" class="chip" '+attr+'="'+e(id)+'">'+label+'</button>';
export function initFeatures(client,c){db=client;config=c;document.addEventListener('click',featureClick);document.addEventListener('submit',featureSubmit);}
export async function refreshFeatures(admin=false){
 if(!db)return;
 const all=await Promise.all(['wedding_notices','wedding_messages','wedding_archive'].map(t=>db.from(t).select('*').order('created_at',{ascending:t==='wedding_messages'})));
 if(all.some(x=>x.error)){console.warn('Feature data not loaded',all.map(x=>x.error?.code));return}
 notices=all[0].data;messages=all[1].data;archive=all[2].data;loaded=true;
}
export function noticeSection(){
 const ns=loaded?notices:config.notices;
 return ns.map(n=>'<details class="guest-notice"><summary><span>'+e(n.title)+'</span><time>'+e(n.date||fmt(n.created_at))+'</time></summary><p>'+e(n.body)+'</p></details>').join('');
}
export function pageFeature(which){
 mode=which;
 if(which==='archive')return '<section class="wedding-extras"><h1 class="heading">우리의 기록</h1><p class="center intro">결혼식 후 사진과 영상을 모아둘게요.</p>'+(archive.length?archive.filter(x=>x.published).map(x=>'<div class="panel"><b>'+e(x.title)+'</b><p><a class="archive-link" target="_blank" rel="noopener noreferrer" href="'+e(x.url)+'">사진·영상 보기 ↗</a></p></div>').join(''):'<div class="panel center">아직 공개된 기록이 없습니다.</div>')+'</section>';
 const roots=messages.filter(x=>x.approved&&!x.parent_id),replies=messages.filter(x=>x.approved&&x.parent_id);
 return '<section class="wedding-extras"><h1 class="heading">축하 메시지</h1><p class="center intro">따뜻한 마음을 남겨주세요.<br>메시지는 확인 후 공개됩니다.</p><form id="guestbook-form"><label>이름 또는 별명</label><input name="author" maxlength="30" required><label>축하의 한마디</label><textarea name="body" maxlength="500" minlength="2" required></textarea>'+ (replyTo?'<p class="small">답글 작성 중 '+btn('취소','data-cancel-reply','yes')+'</p>':'')+'<div id="guestbook-turnstile"></div><p id="guestbook-error" class="error"></p><button class="button" type="submit">메시지 남기기</button></form><h2 class="section-heading">우리에게 보내주신 마음</h2>'+(roots.length?roots.map(m=>'<div class="guestbook-card"><div class="guestbook-author"><b>'+e(m.author)+'</b><small>'+fmt(m.created_at)+'</small></div><p>'+e(m.body)+'</p><div class="guestbook-actions">'+btn('♡ '+(m.likes||0),'data-like',m.id)+btn('답글','data-reply',m.id)+'</div>'+replies.filter(r=>r.parent_id===m.id).map(r=>'<div class="guestbook-reply"><b>'+e(r.author)+'</b><p>'+e(r.body)+'</p>'+btn('♡ '+(r.likes||0),'data-like',r.id)+'</div>').join('')+'</div>').join(''):'<div class="panel center">첫 축하 메시지를 남겨 주세요.</div>')+'</section>';
}
export function adminFeatures(){
 return '<section class="admin-extras"><h2>공지사항 관리</h2><form id="notice-editor"><input name="id" type="hidden"><label>제목</label><input name="title" maxlength="100" required><label>내용</label><textarea name="body" maxlength="2000" required></textarea><label class="check-label"><input type="checkbox" name="published" checked> 하객에게 공개</label><button class="button" type="submit">공지 저장</button></form>'+notices.map(n=>'<div class="admin-extra-item"><b>'+e(n.title)+'</b><div>'+btn('수정','data-notice-edit',n.id)+btn('삭제','data-notice-delete',n.id)+'</div></div>').join('')+
 '<h2>축하 메시지 승인</h2><p class="small muted">승인 전에는 하객에게 표시되지 않습니다.</p>'+messages.filter(m=>!m.approved).map(m=>'<div class="admin-extra-item"><b>'+e(m.author)+'</b><p>'+e(m.body)+'</p><div>'+btn('승인','data-message-approve',m.id)+btn('삭제','data-message-delete',m.id)+'</div></div>').join('')+
 '<h2>공개 메시지 관리</h2>'+messages.filter(m=>m.approved).map(m=>'<div class="admin-extra-item"><b>'+e(m.author)+'</b><p>'+e(m.body)+'</p>'+btn('삭제','data-message-delete',m.id)+'</div>').join('')+
 '<h2>사진·영상 아카이브</h2><p class="small muted">결혼식 후 공유 링크 등록. 기본값은 비공개입니다.</p><form id="archive-editor"><label>제목</label><input name="title" maxlength="100" required><label>앨범 또는 영상 주소</label><input name="url" type="url" placeholder="https://" required><label>종류</label><select name="kind"><option value="album">앨범</option><option value="photo">사진</option><option value="video">영상</option></select><label class="check-label"><input name="published" type="checkbox"> 공개</label><button class="button" type="submit">기록 추가</button></form>'+archive.map(a=>'<div class="admin-extra-item"><b>'+e(a.title)+'</b><div>'+btn(a.published?'공개':'비공개','data-archive-toggle',a.id)+btn('삭제','data-archive-delete',a.id)+'</div></div>').join('')+'</section>';
}
export function renderFeatureCaptcha(){
 const el=document.querySelector('#guestbook-turnstile');if(!el)return;
 token=null;
 const key=import.meta.env.VITE_TURNSTILE_SITE_KEY;
 const draw=()=>{if(!el.isConnected||!window.turnstile)return;try{window.turnstile.render(el,{sitekey:key,callback:t=>token=t,'expired-callback':()=>token=null,'error-callback':()=>{token=null;el.textContent='보안 인증이 실패했습니다. Safari에서 다시 열어주세요.'}})}catch{el.textContent='보안 인증을 열 수 없습니다.'}};
 if(window.turnstile)draw();else {const check=setInterval(()=>{if(window.turnstile||!el.isConnected){clearInterval(check);draw()}},300);setTimeout(()=>clearInterval(check),12000)}
}
const isAdmin=async()=>{if(!db)return false;const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();return !!data};
const refresh=async()=>{await refreshFeatures();window.dispatchEvent(new CustomEvent('wedding-features-changed'))};
async function mutate(table,operation,id,values){
 if(!await isAdmin()){alert('관리자만 수정할 수 있습니다.');return}
 let q=db.from(table),result;
 if(operation==='delete')result=await q.delete().eq('id',id);
 if(operation==='update')result=await q.update(values).eq('id',id);
 if(operation==='insert')result=await q.insert(values);
 if(result?.error)alert('처리 실패: '+result.error.message);else await refresh();
}
async function featureClick(event){
 const b=event.target.closest('button');if(!b||!db)return;
 if(b.hasAttribute('data-cancel-reply')){replyTo=null;window.dispatchEvent(new CustomEvent('wedding-features-changed'));return}
 if(b.dataset.reply){replyTo=b.dataset.reply;window.dispatchEvent(new CustomEvent('wedding-features-changed'));window.scrollTo(0,0);return}
 if(b.dataset.like){
  const {data}=await db.auth.getSession(); // Guests do not need to sign in.
  const widget=document.querySelector('#guestbook-turnstile');
  if(!token){alert('좋아요를 누르려면 먼저 위의 보안 인증을 완료해 주세요.');return}
  const {data:r,error}=await db.functions.invoke('wedding-guestbook',{body:{action:'like',message_id:b.dataset.like,turnstileToken:token}});
  token=null;if(error||r?.error){alert(r?.error||'다시 시도해 주세요.');return}await refresh();return;
 }
 if(b.dataset.noticeEdit){const n=notices.find(x=>x.id===b.dataset.noticeEdit),f=document.querySelector('#notice-editor');if(n&&f){f.elements.id.value=n.id;f.elements.title.value=n.title;f.elements.body.value=n.body;f.elements.published.checked=n.published;f.scrollIntoView({behavior:'smooth'})}return}
 if(b.dataset.noticeDelete){if(confirm('이 공지를 삭제할까요?'))await mutate('wedding_notices','delete',b.dataset.noticeDelete);return}
 if(b.dataset.messageApprove){await mutate('wedding_messages','update',b.dataset.messageApprove,{approved:true});return}
 if(b.dataset.messageDelete){if(confirm('이 메시지를 삭제할까요? 답글도 함께 삭제됩니다.'))await mutate('wedding_messages','delete',b.dataset.messageDelete);return}
 if(b.dataset.archiveToggle){const x=archive.find(a=>a.id===b.dataset.archiveToggle);if(x)await mutate('wedding_archive','update',x.id,{published:!x.published});return}
 if(b.dataset.archiveDelete){if(confirm('이 기록을 삭제할까요?'))await mutate('wedding_archive','delete',b.dataset.archiveDelete);return}
 if(b.dataset.deleteRsvp){if(!await isAdmin())return alert('관리자만 삭제할 수 있습니다.');if(!confirm('이 하객의 응답을 영구 삭제할까요? 되돌릴 수 없습니다.'))return;const {error}=await db.from('rsvps').delete().eq('id',b.dataset.deleteRsvp);if(error)alert('삭제 실패: '+error.message);else window.dispatchEvent(new CustomEvent('wedding-rsvp-deleted'));return}
}
async function featureSubmit(event){
 const f=event.target;if(!['guestbook-form','notice-editor','archive-editor'].includes(f.id))return;
 event.preventDefault();const fd=new FormData(f);
 if(f.id==='guestbook-form'){
  const err=f.querySelector('#guestbook-error');if(!token){err.textContent='보안 인증을 완료해 주세요.';return}
  const submit=f.querySelector('[type=submit]');submit.disabled=true;
  const {data,error}=await db.functions.invoke('wedding-guestbook',{body:{action:'post',author:String(fd.get('author')||'').trim(),message:String(fd.get('body')||'').trim(),parent_id:replyTo,turnstileToken:token}});
  submit.disabled=false;token=null;if(error||data?.error){err.textContent=data?.error||'보내지 못했습니다. 다시 인증해 주세요.';renderFeatureCaptcha();return}
  replyTo=null;alert('축하 메시지가 접수됐어요. 관리자 확인 후 공개됩니다.');f.reset();renderFeatureCaptcha();return;
 }
 if(!await isAdmin())return alert('관리자만 수정할 수 있습니다.');
 if(f.id==='notice-editor'){
  const values={title:String(fd.get('title')).trim(),body:String(fd.get('body')).trim(),published:fd.has('published'),updated_at:new Date().toISOString()};
  await mutate('wedding_notices',fd.get('id')?'update':'insert',fd.get('id'),values);
 }else if(f.id==='archive-editor'){
  const addr=String(fd.get('url')||'');if(!/^https:\\/\\//i.test(addr))return alert('HTTPS 주소를 입력해 주세요.');
  await mutate('wedding_archive','insert',null,{title:String(fd.get('title')).trim(),url:addr,kind:fd.get('kind'),published:fd.has('published')});
 }
}
