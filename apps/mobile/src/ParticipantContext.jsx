import React,{createContext,useContext,useEffect,useState} from 'react';
import {getCurrentPerson,createNextPerson} from './api';
import {Page,Action,Loading,ErrorText} from './ui';
const Context=createContext(null);
export const useParticipant=()=>useContext(Context);
export function ParticipantProvider({children}){
 const [person,setPerson]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>{setError('');getCurrentPerson().then(setPerson).catch(e=>setError(e.message))};
 useEffect(()=>{load()},[]);
 const startNext=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{setPerson(await createNextPerson())}catch(e){setError(e.message)}finally{setBusy(false)}
 };
 if(!person)return <Page><ErrorText message={error}/>{error?<Action title="Prøv igen" onPress={load}/>:<Loading/>}</Page>;
 return <Context.Provider value={{person,busy,error,startNext}}>{children}</Context.Provider>;
}
