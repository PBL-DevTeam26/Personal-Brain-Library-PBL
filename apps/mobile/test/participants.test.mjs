import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/participants.js',import.meta.url),'utf8');
const {createParticipantStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(existing='original-person'){
 const data=new Map(existing?[['explorexp_demo_user',existing]]:[]);
 let count=0,failCreate=false,failSave=false;
 const storage={getItemAsync:async key=>data.get(key)||null,setItemAsync:async(key,value)=>{if(failSave)throw new Error('storage failed');data.set(key,value)}};
 const createUser=async()=>{if(failCreate)throw new Error('offline');return `new-person-${++count}`};
 return {data,storage,createUser,store:createParticipantStore({storage,createUser}),get count(){return count},set failCreate(value){failCreate=value},set failSave(value){failSave=value}};
}
test('Existing identity becomes person 1 without replacing it',async()=>{
 const f=fixture();assert.deepEqual(await f.store.getCurrent(),{id:'original-person',number:1,total:1});assert.equal(f.count,0);
});
test('New person has a distinct ID; original remains stored; restart keeps active person',async()=>{
 const f=fixture();await f.store.getCurrent();const next=await f.store.createNext();
 assert.deepEqual(next,{id:'new-person-1',number:2,total:2});
 assert.equal(JSON.parse(f.data.get('explorexp_participants_v1')).people[0].id,'original-person');
 const restart=createParticipantStore(f);assert.deepEqual(await restart.getCurrent(),next);
 assert.equal((await restart.createNext()).number,3);
});
test('Failed API call preserves current identity and can be retried',async()=>{
 const f=fixture();await f.store.getCurrent();f.failCreate=true;
 await assert.rejects(f.store.createNext(),/offline/);assert.equal((await f.store.getCurrent()).id,'original-person');
 f.failCreate=false;assert.equal((await f.store.createNext()).number,2);
});
test('Failed storage write never activates the new person',async()=>{
 const f=fixture();await f.store.getCurrent();f.failSave=true;
 await assert.rejects(f.store.createNext(),/storage failed/);assert.equal((await f.store.getCurrent()).id,'original-person');
 assert.equal(JSON.parse(f.data.get('explorexp_participants_v1')).people.length,1);
});
test('Double taps create only one new identity',async()=>{
 const f=fixture();await f.store.getCurrent();
 const [a,b]=await Promise.all([f.store.createNext(),f.store.createNext()]);assert.deepEqual(a,b);assert.equal(f.count,1);
});
test('First installation creates person 1 only once across concurrent requests',async()=>{
 const f=fixture(null);const [a,b]=await Promise.all([f.store.getCurrent(),f.store.getCurrent()]);
 assert.deepEqual(a,b);assert.equal(a.number,1);assert.equal(f.count,1);
});

test('API requests use the active person after creation and preserve person 1',async t=>{
 const f=fixture();
 const token='__explorexpParticipantTest';
 globalThis[token]=f;
 t.after(()=>delete globalThis[token]);
 const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 const storageUrl=moduleUrl('export const getItemAsync=(...args)=>globalThis.'+token+'.storage.getItemAsync(...args);export const setItemAsync=(...args)=>globalThis.'+token+'.storage.setItemAsync(...args)');
 const participantsUrl=moduleUrl(source);
 let apiSource=await readFile(new URL('../src/api.js',import.meta.url),'utf8');
 apiSource=apiSource.replace("'expo-secure-store'",JSON.stringify(storageUrl)).replace("'./participants'",JSON.stringify(participantsUrl)).replace("process.env.EXPO_PUBLIC_API_BASE_URL","'http://test.invalid'");
 const headers=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url.endsWith('/demo-users'))return {ok:true,json:async()=>({userId:'second-person'})};
  headers.push(options.headers['X-Explore-User']);return {ok:true,json:async()=>({})};
 });
 const api=await import(moduleUrl(apiSource));
 await api.request('/api/v1/me/progress');
 assert.equal((await api.createNextPerson()).number,2);
 await api.request('/api/v1/quizzes');
 assert.deepEqual(headers,['original-person','second-person']);
 assert.equal(JSON.parse(f.data.get('explorexp_participants_v1')).people[0].id,'original-person');
});
