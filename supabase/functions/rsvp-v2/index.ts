import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
const deadline=Date.parse('2026-11-06T23:59:59.999+09:00');
const encoder=new TextEncoder();
const byteHex=arr=>Array.from(new Uint8Array(arr),b=>b.toString(16).padStart(2,'0')).join('');
// Until an RSVP-specific secret is configured, use the existing server-only Turnstile secret with domain separation.
// Rotate to a dedicated RSVP_PIN_PEPPER only with a planned PIN migration: changing the key invalidates all existing PINs.
const secret=Deno.env.get('RSVP_PIN_PEPPER')||Deno.env.get('TURNSTILE_SECRET_KEY')||'';
async function digest(v) {
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return byteHex(await crypto.subtle.sign('HMAC',key,encoder.encode('wedding-rsvp-pin-v2:'+v)));
}
const validInt=n=>Number.isInteger(n)&&n>=0&&n<=30;
const fields=['gumi_outbound','gumi_return','gimcheon_outbound','gimcheon_return'];
function validate(input) {
  const name=String(input?.name||'').trim();
  const pin=String(input?.pin||'');
  if(name.length<1||name.length>60||!/^[0-9]{4}$/.test(pin))throw Error('성함과 숫자 4자리 비밀번호를 확인해 주세요.');
  return {name,pin};
}
function guestData(input){
  const relationship=input.relationship,attendance=input.attendance;
  if(!['가족','직장','학교','친구','기타'].includes(relationship)||!['참석','불참'].includes(attendance))throw Error('참석 정보가 올바르지 않습니다.');
  const guests=Number(input.guests),meals=Number(input.meals);
  const counts=Object.fromEntries(fields.map(k=>[k,Number(input[k]??0)]));
  if(![guests,meals,...Object.values(counts)].every(validInt))throw Error('인원 정보를 확인해 주세요.');
  if(attendance==='불참'){
    if(guests||meals||Object.values(counts).some(Boolean))throw Error('불참 인원 정보가 올바르지 않습니다.');
  }else{
    if(guests<1||meals>guests||counts.gumi_outbound+counts.gimcheon_outbound>guests||counts.gumi_return+counts.gimcheon_return>guests)throw Error('참석 인원과 셔틀 인원을 확인해 주세요.');
  }
  const mealSlot=attendance==='불참'||meals===0?'none':String(input.meal_slot||'undecided');
  if(!['first','second','undecided','none'].includes(mealSlot)||(meals>0&&mealSlot==='none'))throw Error('식사 시간 선택을 확인해 주세요.');
  return {relationship,attendance,guests,meals,meal_slot:mealSlot,...counts,
    shuttle_count:Math.max(counts.gumi_outbound+counts.gimcheon_outbound,counts.gumi_return+counts.gimcheon_return)};
}
async function verifyTurnstile(token,ip) {
  const key=Deno.env.get('TURNSTILE_SECRET_KEY');
  if(!key||!token)return false;
  const body=new URLSearchParams({secret:key,response:String(token)});
  if(ip)body.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
  const data=await response.json();
  const host=String(data.hostname||'');
  const allowed=new Set(['darae-minwoo.vercel.app','wedding-app-3doy.vercel.app','wedding-app-3doy-git-feature-elegan-fe8d16-da-rae-lims-projects.vercel.app']);
  return !!data.success && allowed.has(host);
}
serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return respond({error:'허용되지 않는 요청입니다.'},405);
  if(!secret||!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||!Deno.env.get('SUPABASE_URL'))return respond({error:'서버 설정이 완료되지 않았습니다.'},503);
  if(Date.now()>deadline)return respond({error:'11월 6일 접수가 마감되었습니다. 변경은 신랑·신부에게 연락해 주세요.'},403);
  try{
    const body=await req.json();
    const action=body.action;
    if(!['create','lookup','update','delete'].includes(action))return respond({error:'요청이 올바르지 않습니다.'},400);
    const {name,pin}=validate(body);
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'';
    if(!await verifyTurnstile(body.turnstileToken,ip))return respond({error:'보안 인증을 다시 완료해 주세요.'},403);
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const pinHash=await digest(name+'\u0000'+pin);
    const attemptKey=await digest('attempt\u0000'+name);
    if(action==='create'){
      const record=guestData(body);
      const {error}=await db.from('rsvps').insert({name,pin_hash:pinHash,...record});
      if(error){
        if(error.code==='23514'||error.message?.includes('RECEPTION_CAPACITY_EXCEEDED'))return respond({error:'피로연 정원 120명이 마감되었거나 신청 인원이 잔여 좌석을 초과했습니다. 식사 인원을 줄여 주세요.'},409);
        if(error.code==='23505')return respond({error:'동일한 이름과 비밀번호로 등록된 응답이 있습니다. 기존 응답 수정하기를 이용해 주세요.'},409);
        console.error('RSVP create failed',error.code);
        return respond({error:'저장하지 못했습니다. 다시 시도해 주세요.'},500);
      }
      return respond({ok:true});
    }
    const {data:allowed,error:rateError}=await db.rpc('rsvp_pin_attempt',{p_key:attemptKey,p_success:false});
    if(rateError||!allowed)return respond({error:'인증 시도 횟수를 초과했습니다. 한 시간 후 다시 시도하거나 신랑·신부에게 연락해 주세요.'},429);
    const {data:record,error:lookError}=await db.from('rsvps').select('id,name,relationship,attendance,guests,meals,meal_slot,gumi_outbound,gumi_return,gimcheon_outbound,gimcheon_return').eq('name',name).eq('pin_hash',pinHash).maybeSingle();
    if(lookError||!record)return respond({error:'이름 또는 비밀번호가 일치하지 않습니다.'},401);
    await db.rpc('rsvp_pin_attempt',{p_key:attemptKey,p_success:true});
    if(action==='lookup')return respond({ok:true,record});
    if(action==='delete'){
      // Only the record authenticated by the matching name + PIN can be deleted.
      const {data:removed,error:deleteError}=await db.from('rsvps').delete().eq('id',record.id).eq('pin_hash',pinHash).select('id');
      if(deleteError||!removed?.length){console.error('RSVP self delete failed',deleteError?.code);return respond({error:'응답을 삭제하지 못했습니다. 다시 시도해 주세요.'},500)}
      return respond({ok:true,deleted:true});
    }
    const edits=guestData(body);
    const {error}=await db.from('rsvps').update({...edits,updated_at:new Date().toISOString()}).eq('id',record.id).eq('pin_hash',pinHash);
    if(error){if(error.code==='23514'||error.message?.includes('RECEPTION_CAPACITY_EXCEEDED'))return respond({error:'피로연 신청 인원이 120명 정원을 초과합니다. 식사 인원을 줄여 주세요.'},409);console.error('RSVP update failed',error.code);return respond({error:'수정 내용을 저장하지 못했습니다.'},500)}
    return respond({ok:true});
  }catch(e){
    if(e instanceof Error&&(/성함|참석|인원/.test(e.message)))return respond({error:e.message},400);
    console.error('RSVP handler error',e);
    return respond({error:'요청을 처리하지 못했습니다.'},500);
  }
});
