import * as SecureStore from 'expo-secure-store';
import {createParticipantStore} from './participants';
const BASE=(process.env.EXPO_PUBLIC_API_BASE_URL||'').replace(/\/$/,'');
async function createUser(){
 if(!BASE)throw new Error('EXPO_PUBLIC_API_BASE_URL mangler. Se apps/mobile/.env.example');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(BASE+'/api/v1/demo-users',{method:'POST',signal:controller.signal});
  if(!response.ok)throw new Error('Kunne ikke oprette en ny person. Prøv igen.');
  const data=await response.json();
  if(typeof data.userId!=='string'||!data.userId)throw new Error('API returnerede ikke et bruger-ID');
  return data.userId;
 }catch(error){
  if(error.name==='AbortError')throw new Error('API timeout. Kontrollér forbindelsen til din PC.');
  throw error;
 }finally{clearTimeout(timeout)}
}
let participantsPromise=null;
async function connectionRequest(path,options={}){
 if(!BASE)throw new Error('EXPO_PUBLIC_API_BASE_URL mangler. Se apps/mobile/.env.example');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{return await fetch(BASE+path,{...options,signal:controller.signal})}
 catch(error){
  if(error.name==='AbortError')throw new Error('API timeout. Kontrollér forbindelsen til din PC.');
  throw error;
 }finally{clearTimeout(timeout)}
}
function getParticipants(){
 if(!participantsPromise)participantsPromise=(async()=>{
  const response=await connectionRequest('/api/v1/instance');
  if(!response.ok)throw new Error('Kunne ikke identificere databasen. Kør npm run db:migrate på API-projektet.');
  const {instanceId}=await response.json();
  if(typeof instanceId!=='string'||!instanceId)throw new Error('Databasen mangler en gyldig identifikation');
  return createParticipantStore({storage:SecureStore,createUser,instanceId,validateLegacyUser:async id=>{
   const result=await connectionRequest('/api/v1/me/progress',{headers:{'X-Explore-User':id}});
   if(result.ok)return true;
   const body=await result.json();
   if(result.status===401&&body.error?.code==='UNKNOWN_USER')return false;
   throw new Error('Kunne ikke kontrollere den eksisterende profil. Prøv igen.');
  }});
 })().catch(error=>{participantsPromise=null;throw error});
 return participantsPromise;
}
export const getCurrentPerson=async()=>(await getParticipants()).getCurrent();
export const createNextPerson=async()=>(await getParticipants()).createNext();
export async function request(path,options={}){
 if(!BASE)throw new Error('EXPO_PUBLIC_API_BASE_URL mangler. Se apps/mobile/.env.example');
 const {id:userId}=await getCurrentPerson();
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const res=await fetch(BASE+path,{
   ...options,headers:{'Content-Type':'application/json','X-Explore-User':userId,...(options.headers||{})},signal:controller.signal
  });
  const body=await res.json();
  if(!res.ok)throw new Error(body.error?.message||`HTTP ${res.status}`);
  return body;
 }catch(error){
  if(error.name==='AbortError')throw new Error('API timeout. Kontrollér at telefon og PC er på samme netværk.');
  throw error;
 }finally{clearTimeout(timeout)}
}
