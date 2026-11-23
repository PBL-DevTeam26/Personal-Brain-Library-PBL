import React from 'react';
import {Stack} from 'expo-router';
import {colors} from '../src/ui';
import {ParticipantProvider,useParticipant} from '../src/ParticipantContext';
function Screens(){
 const {person}=useParticipant();
 return <Stack key={person.id} initialRouteName="index" screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.bg}}}>
  <Stack.Screen name="index" options={{title:`ExploreXP · Person ${person.number}`}}/>
  <Stack.Screen name="quiz/index" options={{title:'Quizpakker'}}/>
  <Stack.Screen name="quiz/[id]" options={{title:'Quiz'}}/>
  <Stack.Screen name="explore" options={{title:'Udforsk kortet'}}/>
  <Stack.Screen name="profile" options={{title:`Person ${person.number} · Min profil`}}/>
 </Stack>;
}
export default function RootLayout(){return <ParticipantProvider><Screens/></ParticipantProvider>}
