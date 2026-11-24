import React from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Page,Panel,Action,ErrorText,s} from '../src/ui';
import {useParticipant} from '../src/ParticipantContext';
export default function Home(){
 const {person,busy,error,startNext}=useParticipant();
 if(process.env.EXPO_PUBLIC_PILOT2==='1')return <Page>
  <Text style={s.heading}>ExploreXP · Pilot 2</Text>
  <Panel><Text style={s.title}>Aktiv profil: Person {person.number}</Text>
   <Action title="Åbn Pilot 2" disabled={busy} onPress={()=>router.push('/pilot')}/>
   <Action title={busy?'Opretter...':'Opret profil til næste deltager'} disabled={busy} onPress={startNext}/>
   <ErrorText message={error}/>
  </Panel>
 </Page>;
 return <Page>
 <Text style={s.heading}>ExploreXP</Text>
 <Panel><Text style={s.title}>Aktiv profil: Person {person.number}</Text>
 <Text style={s.subtitle}>{person.total} person(er) oprettet på denne telefon. Svar gemmes separat for hver person.</Text>
 <Text style={s.subtitle}>Ræk telefonen til næste deltager og opret en ny person. Den nye person starter med tomme quizzer og 0 XP. Tidligere svar bevares.</Text>
 <Action title={busy?'Opretter...':`Opret ny person · Person ${person.total+1}`} disabled={busy} onPress={startNext}/>
 <ErrorText message={error}/></Panel>
 <Text style={s.subtitle}>Opdag restauranter og museer, der matcher dine interesser. Quizzerne hjælper os med at lære dine præferencer.</Text>
 <Panel><Text style={s.title}>1. Lær mig at kende</Text><Text style={s.subtitle}>Fire quizpakker med fem spørgsmål. 100 XP pr. gennemført quiz.</Text><Action title="Start quizzer" onPress={()=>router.push('/quiz')}/></Panel>
 <Panel><Text style={s.title}>2. Udforsk steder</Text><Text style={s.subtitle}>Se steder på kortet, og vurder om de interesserer dig.</Text><Action title="Åbn kort og anbefalinger" onPress={()=>router.push('/explore')}/></Panel>
 <Panel><Text style={s.title}>3. Følg din profil</Text><Text style={s.subtitle}>Se XP, level og de præferencer dine svar har tilføjet.</Text><Action title="Se profil" onPress={()=>router.push('/profile')}/></Panel>
 </Page>;
}
