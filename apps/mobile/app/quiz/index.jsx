import React,{useEffect,useState} from 'react';
import {Text,Pressable} from 'react-native';
import {router} from 'expo-router';
import {request} from '../../src/api';
import {Page,Panel,Loading,ErrorText,s,colors} from '../../src/ui';
export default function Quizzes(){
 const [quizzes,setQuizzes]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let live=true;request('/api/v1/quizzes').then(x=>{if(live)setQuizzes(x)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 return <Page><Text style={s.heading}>Quizpakker</Text><Text style={s.subtitle}>Vælg en pakke. Dine svar gemmes og bruges til at bygge din præferenceprofil.</Text>
 {loading?<Loading/>:<ErrorText message={error}/>}
 {quizzes.map(q=><Pressable key={q.id} disabled={q.completed} onPress={()=>router.push({pathname:'/quiz/[id]',params:{id:q.id}})}>
 <Panel><Text style={s.title}>{q.title}</Text><Text style={s.subtitle}>{q.description}</Text><Text style={{color:colors.accent}}>{q.completed?'Gennemført':`${q.xpReward} XP · 5 spørgsmål`}</Text></Panel>
 </Pressable>)}
 </Page>
}
