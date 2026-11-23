// The registry is local to this installation. Server data stays keyed by user ID.
export function createParticipantStore({storage,createUser}){
 const key='explorexp_participants_v1';
 let statePromise=null,creating=null;
 const load=()=>{
  if(!statePromise)statePromise=(async()=>{
   const saved=await storage.getItemAsync(key);
   if(saved)return JSON.parse(saved);
   const existing=await storage.getItemAsync('explorexp_demo_user');
   const userId=existing||await createUser();
   const state={currentId:userId,people:[{id:userId,number:1}]};
   await storage.setItemAsync(key,JSON.stringify(state));
   return state;
  })().catch(error=>{statePromise=null;throw error});
  return statePromise;
 };
 const current=state=>({...state.people.find(person=>person.id===state.currentId),total:state.people.length});
 return {
  async getCurrent(){return current(await load())},
  createNext(){
   if(!creating)creating=(async()=>{
    const previous=await load();
    const id=await createUser();
    if(previous.people.some(person=>person.id===id))throw new Error('Den nye profil fik ikke et unikt ID. Prøv igen.');
    const person={id,number:Math.max(...previous.people.map(p=>p.number))+1};
    const next={currentId:id,people:[...previous.people,person]};
    // Publish the new identity only after it has been saved successfully.
    await storage.setItemAsync(key,JSON.stringify(next));
    statePromise=Promise.resolve(next);
    return current(next);
   })().finally(()=>{creating=null});
   return creating;
  }
 };
}
