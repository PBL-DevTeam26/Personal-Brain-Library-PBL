import React,{useEffect,useState} from 'react';
import {Text,Pressable} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {request} from '../../src/api';
import {Page,Panel,Action,Loading,ErrorText,s} from '../../src/ui';
export default function Quiz(){
 const {id}=useLocalSearchParams();
 const [quiz,setQuiz]=useState(null),[current,setCurrent]=useState(0),[answers,setAnswers]=useState({}),[error,setError]=useState(''),[sending,setSending]=useState(false);
 useEffect(()=>{let active=true;request(`/api/v1/quizzes/${encodeURIComponent(id)}`).then(q=>{if(active)setQuiz(q)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[id]);
 if(!quiz)return <Page><ErrorText message={error}/><Loading/></Page>;
 const q=quiz.questions[current];const selected=answers[q.id];const last=current===quiz.questions.length-1;
 const submit=async()=>{
  setError('');setSending(true);
  try{await request(`/api/v1/quizzes/${id}/submit`,{method:'POST',body:JSON.stringify({answers:quiz.questions.map(question=>({questionId:question.id,optionId:answers[question.id]}))})});router.replace('/profile')}
  catch(e){setError(e.message)}finally{setSending(false)}
 };
 return <Page><Text style={s.heading}>{quiz.title}</Text><Text style={s.subtitle}>Spørgsmål {current+1} af {quiz.questions.length}</Text>
 <Panel><Text style={s.title}>{q.prompt}</Text>
 {q.options.map(o=><Pressable key={o.id} accessibilityRole="radio" accessibilityState={{selected:selected===o.id}} onPress={()=>setAnswers(old=>({...old,[q.id]:o.id}))} style={[s.choice,selected===o.id&&s.choiceSelected]}><Text style={s.choiceText}>{o.label}</Text></Pressable>)}
 </Panel>
 <ErrorText message={error}/>
 <Action title={sending?'Gemmer...':last?'Afslut quiz · +100 XP':'Næste spørgsmål'} disabled={!selected||sending} onPress={()=>last?submit():setCurrent(n=>n+1)}/>
 {current>0?<Action title="Forrige" onPress={()=>setCurrent(n=>n-1)}/>:null}
 </Page>
}
