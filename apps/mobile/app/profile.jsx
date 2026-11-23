import React,{useEffect,useState} from 'react';
import {Text} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {request} from '../src/api';
import {Page,Panel,Loading,ErrorText,s,colors} from '../src/ui';
export default function Profile(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useFocusEffect(React.useCallback(()=>{let active=true;request('/api/v1/me/progress').then(x=>{if(active)setData(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]));
 return <Page><Text style={s.heading}>Min profil</Text><ErrorText message={error}/>
 {!data?<Loading/>:<>
 <Panel><Text style={s.title}>Level {data.level}</Text><Text style={{fontSize:26,fontWeight:'bold',color:colors.accent}}>{data.xp} XP</Text><Text style={s.subtitle}>{data.completedQuizIds.length} gennemførte quizpakker</Text></Panel>
 <Text style={s.title}>Dine præferencesignaler</Text>
 {data.preferences.length===0?<Text style={s.subtitle}>Gennemfør en quiz for at begynde.</Text>:data.preferences.map(p=><Panel key={p.code}><Text style={s.title}>{p.code.replace(/_/g,' ')}</Text><Text style={s.subtitle}>Score {Number(p.score).toFixed(2)} · {p.observations} observation(er)</Text></Panel>)}
 </>}
 </Page>
}
