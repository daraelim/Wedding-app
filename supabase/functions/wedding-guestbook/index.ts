import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const hosts=new Set(['darae-minwoo.vercel.app','wedding-app-3doy.vercel.app']);
const enc=new TextEncoder();
const valid=(v,max)=>typeof v==='string' && v.trim().length>0 && v.trim().length<=max;
const uuid=(v)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
async function sha(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function verify(token,ip){
 const secret=Deno.env.get('TURNSTILE_SECRET_KEY');if(!secret||!token)return false;
 const params=new URLSearchParams({secret,response:String(token)});if(ip)params.set('remoteip',ip);
 const resp=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:params});
 if(!resp.ok)return false;
 const result=await resp.json();return result.success===true&&hosts.has(String(result.hostname||''));
}
serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'허용되지 않는 요청입니다.'},405);
 const origin=req.headers.get('origin')||'';
 if(origin && !['https://darae-minwoo.vercel.app','https://wedding-app-3doy.vercel.app'].includes(origin))return reply({error:'허용되지 않는 사이트입니다.'},403);
 if(!Deno.env.get('SUPABASE_URL')||!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))return reply({error:'설정 오류입니다.'},503);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const body=await req.json();
  const action=body?.action;
  if(!['post','like'].includes(action))return reply({error:'요청이 올바르지 않습니다.'},400);
  const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'').split(',')[0];
  const salt=Deno.env.get('WEDDING_GUESTBOOK_SALT')||Deno.env.get('TURNSTILE_SECRET_KEY')||'';
  if(!salt)return reply({error:'서버 인증 설정이 없습니다.'},503);
  if(!await verify(body?.turnstileToken,ip))return reply({error:'보안 인증을 완료해 주세요.'},403);
  const agent=(req.headers.get('user-agent')||'').slice(0,180);
  const actor=await sha(salt+':'+ip+':'+agent);
  const {data:rate,error:re}=await db.from('wedding_post_limits').select('attempts,window_start').eq('actor_hash',actor).maybeSingle();
  if(re)return reply({error:'잠시 후 다시 시도해 주세요.'},500);
  const now=Date.now(),recent=rate&&(now-new Date(rate.window_start).getTime())<3600000;
  if(recent&&rate.attempts>=(action==='post'?4:25))return reply({error:'잠시 후 다시 시도해 주세요.'},429);
  const {error:limitErr}=await db.from('wedding_post_limits').upsert({actor_hash:actor,window_start:recent?rate.window_start:new Date().toISOString(),attempts:recent?rate.attempts+1:1});
  if(limitErr)return reply({error:'잠시 후 다시 시도해 주세요.'},500);
  if(action==='post'){
   const author=String(body.author||'').trim(),message=String(body.message||'').trim();
   const parent=body.parent_id||null;
   if(!valid(author,30)||!valid(message,500)||message.length<2||/https?:\/\/|www\./i.test(message))return reply({error:'이름과 축하 메시지를 확인해 주세요. 링크는 작성할 수 없습니다.'},400);
   if(parent){if(!uuid(parent))return reply({error:'잘못된 답글입니다.'},400);const {data:p}=await db.from('wedding_messages').select('id,parent_id,approved').eq('id',parent).maybeSingle();if(!p||!p.approved||p.parent_id)return reply({error:'답글을 작성할 수 없습니다.'},400)}
   const {error}=await db.from('wedding_messages').insert({author,body:message,parent_id:parent,approved:false});
   if(error)return reply({error:'등록하지 못했습니다.'},500);
   return reply({ok:true,message:'메시지가 접수되었습니다. 확인 후 공개됩니다.'});
  }
  if(!uuid(body.message_id))return reply({error:'메시지를 확인해 주세요.'},400);
  const {data:row}=await db.from('wedding_messages').select('id,approved').eq('id',body.message_id).maybeSingle();
  if(!row||!row.approved)return reply({error:'공개된 메시지만 좋아요를 누를 수 있습니다.'},400);
  const {error}=await db.from('wedding_reactions').insert({message_id:row.id,actor_hash:actor});
  if(error?.code==='23505')return reply({ok:true,alreadyLiked:true});
  if(error)return reply({error:'좋아요를 반영하지 못했습니다.'},500);
  // Increment using database RPC to prevent lost updates.
  const {error:inc}=await db.rpc('wedding_increment_like',{p_message_id:row.id});
  if(inc)return reply({error:'좋아요 집계에 문제가 있습니다.'},500);
  return reply({ok:true});
 }catch(err){console.error('Guestbook error',err);return reply({error:'요청을 처리하지 못했습니다.'},500)}
});
