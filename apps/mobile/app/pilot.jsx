import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { request } from '../src/api';
import { Action, ErrorText, Loading, Page, Panel, s } from '../src/ui';

const path = '/api/v1/pilot-2';
const minimumRatingInterval = 450;
const write = (route, method, data) => request(path + route, { method, body: JSON.stringify(data) });

export default function Pilot() {
  const [state, setState] = useState(null);
  const [choices, setChoices] = useState({});
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const lastRating = useRef(0);

  async function run(operation) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      setState(await operation());
      setChoices({});
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  useEffect(() => { run(() => request(path)); }, []);

  let content;
  if (!state) {
    content = busy ? <Loading /> : <Action title="Prøv igen" onPress={() => run(() => request(path))} />;
  } else if (!state.consented) {
    content = <Panel>
      <Text style={s.title}>Information og samtykke</Text>
      <Text style={s.subtitle}>{state.consent}</Text>
      <Action title="Jeg vil gerne deltage" disabled={busy}
        onPress={() => run(() => write('/consent', 'POST', { accepted: true, version: state.version }))} />
      <Action title="Tilbage" onPress={() => router.back()} />
    </Panel>;
  } else if (state.completedQuizIds.length < state.quizzes.length) {
    const quiz = state.quizzes.find(item => !state.completedQuizIds.includes(item.id));
    content = <>
      <Text style={s.title}>{quiz.title}</Text>
      <Text style={s.subtitle}>Quiz {state.completedQuizIds.length + 1} af {state.quizzes.length}</Text>
      {quiz.questions.map(question => <Panel key={question.id}>
        <Text style={s.text}>{question.prompt}</Text>
        {question.options.map(option => {
          const selected = choices[question.id] === option.id;
          return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected, disabled: busy }}
            disabled={busy} onPress={() => setChoices(old => ({ ...old, [question.id]: option.id }))}
            style={[s.choice, selected && s.choiceSelected]}><Text style={s.choiceText}>{option.label}</Text></Pressable>;
        })}
      </Panel>)}
      <Action title="Gem quiz" disabled={busy || quiz.questions.some(question => !choices[question.id])}
        onPress={() => run(() => write('/quizzes/' + quiz.id, 'PUT', {
          answers: quiz.questions.map(question => ({ questionId: question.id, optionId: choices[question.id] })),
        }))} />
    </>;
  } else if (!state.nextPlace) {
    content = <Panel><Text style={s.title}>Tak for din deltagelse</Text>
      <Text style={s.subtitle}>Du har gennemgået alle {state.total} steder.</Text>
      <Action title="Til forsiden" onPress={() => router.replace('/')} /></Panel>;
  } else if (!started && state.answered === 0) {
    content = <Panel><Text style={s.title}>Din præferenceprofil</Text>
      {state.quizzes.flatMap(quiz => quiz.questions).filter(question => Object.hasOwn(state.preferences, question.id))
        .map(question => <Text key={question.id} style={s.text}>{question.prompt}{'\n'}
          {state.preferences[question.id] > 0 ? 'Mere attraktivt' : 'Mindre attraktivt'}</Text>)}
      {!Object.keys(state.preferences).length && <Text style={s.subtitle}>Du har valgt neutrale svar. Du kan se og springe steder over.</Text>}
      <Action title="Se steder" onPress={() => setStarted(true)} />
    </Panel>;
  } else {
    const place = state.nextPlace;
    const rated = Object.keys(state.preferences).length > 0;
    const respond = response => {
      const now = Date.now();
      if (pending.current || now - lastRating.current < minimumRatingInterval) return;
      lastRating.current = now;
      run(() => write('/ratings/' + place.position, 'PUT', { response }));
    };
    content = <Panel>
      <Text style={s.subtitle}>Sted {place.position} af {state.total} · {place.kind === 'museum' ? 'Museum' : 'Restaurant'}</Text>
      <Text style={s.title}>{place.name}</Text>
      <Text style={s.text}>{place.description}</Text>
      <Action title="Interesseret" disabled={busy || !rated} onPress={() => respond('yes')} />
      <Action title="Ikke interesseret" disabled={busy || !rated} onPress={() => respond('no')} />
      <Action title="Ved ikke / spring over" disabled={busy} onPress={() => respond('skip')} />
    </Panel>;
  }

  return <Page>{content}<ErrorText message={error} /></Page>;
}
