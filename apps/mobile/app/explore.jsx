import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import {WebView} from 'react-native-webview';
import {request} from '../src/api';
import {mapHtml} from '../src/mapHtml';
import {PlaceDetails} from '../src/PlaceDetails';
import {Panel,Action,ErrorText,s,colors} from '../src/ui';
export default function Explore(){
 const [survey,setSurvey]=useState([]),[items,setItems]=useState([]),[source,setSource]=useState(''),[selected,setSelected]=useState(null),[error,setError]=useState(''),[note,setNote]=useState('');
 useEffect(()=>{let active=true;request('/api/v1/survey').then(rows=>{if(active)setSurvey(rows)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;request('/api/v1/recommendations').then(r=>{if(active){setItems(r.items);setSource(r.source)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 const feedbackScroll=useRef(null);
 const mapSource=useMemo(()=>({html:mapHtml(items)}),[items]);
 const skip=place=>{setSurvey(old=>old.filter(p=>p.id!==place.id));setSelected(null);setNote('Sprunget over — intet svar er gemt');feedbackScroll.current?.scrollTo({y:0,animated:true})};
 const rate=async (place,interested)=>{if(!place)return;try{await request(`/api/v1/places/${place.id}/feedback`,{method:'POST',body:JSON.stringify({interested})});setNote(interested?'Interesse gemt':'Fravalgt og gemt');setSurvey(old=>old.filter(p=>p.id!==place.id))}catch(e){setError(e.message)}};
 return <View style={s.screen}>
  <View style={{padding:16,gap:6}}><Text style={s.heading}>Udforsk København</Text><Text style={s.subtitle}>Rangering: {source==='trained_model'?'Trænet ML-model':'Regelbaseret baseline (ikke trænet)'}</Text><ErrorText message={error}/></View>
  {items.length>0?<WebView key={items.length} style={{flex:1,minHeight:220}} originWhitelist={['*']} source={mapSource} javaScriptEnabled onMessage={ev=>{setNote('');setSelected(items.find(x=>x.id===ev.nativeEvent.data)||null);feedbackScroll.current?.scrollTo({y:0,animated:true})}}/>:<View style={{padding:16}}><Text style={s.subtitle}>Ingen steder endnu. Importér OSM-data fra API-projektet.</Text></View>}
  <View style={{flex:1,minHeight:220}}><ScrollView ref={feedbackScroll} style={s.screen} contentContainerStyle={s.pad}>
   {note?<Text accessibilityLiveRegion="polite" style={{color:colors.accent}}>{note}</Text>:null}
   {selected?<Panel><Text style={s.title}>{selected.name}</Text><Text style={s.subtitle}>Matchscore {Math.round(selected.matchScore*100)} / 100</Text>
    <PlaceDetails place={selected} onError={setError}/>
    <Action title="Ved ikke / spring over" onPress={()=>skip(selected)}/><Action title="Tilbage til stedundersøgelsen" onPress={()=>setSelected(null)}/><Action title="Interesseret" onPress={()=>rate(selected,true)}/><Action title="Ikke interesseret" onPress={()=>rate(selected,false)}/></Panel>:
    null}
   {survey.length>0?<Panel><Text style={s.title}>Hjælp modellen med at lære</Text><Text style={s.subtitle}>Vurdér et sted, uafhængigt af anbefalingernes rækkefølge ({survey.length} tilbage i denne runde).</Text>
    <Text style={s.title}>{survey[0].name}</Text><PlaceDetails place={survey[0]} onError={setError}/>
    <Action title="Det interesserer mig" onPress={()=>rate(survey[0],true)}/>
    <Action title="Ikke interessant for mig" onPress={()=>rate(survey[0],false)}/>
    <Action title="Ved ikke / spring over" onPress={()=>skip(survey[0])}/></Panel>:<Text style={s.subtitle}>Ingen flere steder i denne runde. Åbn kortet igen for at hente en ny runde. Steder, du sprang over, kan dukke op igen.</Text>}

   {!selected && items.slice(0,5).map((p,i)=><Pressable key={p.id} onPress={()=>setSelected(p)}><Panel><Text style={s.title}>{i+1}. {p.name}</Text><Text style={s.subtitle}>{Math.round(p.matchScore*100)} / 100 · Tryk for at vurdere</Text></Panel></Pressable>)}
  </ScrollView></View>
 </View>;
}
