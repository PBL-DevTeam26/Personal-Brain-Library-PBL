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
const participants=createParticipantStore({storage:SecureStore,createUser});
export const getCurrentPerson=()=>participants.getCurrent();
export const createNextPerson=()=>participants.createNext();
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
