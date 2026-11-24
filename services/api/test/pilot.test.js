import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogProblems, definition, manifest, preferenceProfile, quizAnswers, selectPilotPlaces } from '../src/pilot-domain.js';

const catalog = manifest.map(place => ({ ...place, place_id: place.source_id,
  features: Object.fromEntries(Object.keys(place.evidence).map(code => [code, 1])) }));

test('pilot quiz answers require valid choices and neutral adds no signal', () => {
  const quiz = definition.quizzes[0];
  const [first, second] = quiz.questions;
  const valid = [{ questionId: first.id, optionId: 'avoid' }, { questionId: second.id, optionId: 'neutral' }];
  assert.equal(quizAnswers(quiz, [valid[0], valid[0]]), null);
  assert.equal(quizAnswers(quiz, [valid[0], { questionId: second.id, optionId: 'wrong' }]), null);
  assert.equal(quizAnswers(quiz, valid.slice(0, 1)), null);
  assert.deepEqual(preferenceProfile(definition.quizzes, { [quiz.id]: quizAnswers(quiz, valid) }), { [first.id]: -1 });
});

test('place selection has stable order, unique IDs, balanced quotas and six common places', () => {
  const first = selectPilotPlaces(catalog, 'one');
  const second = selectPilotPlaces(catalog, 'two');
  assert.deepEqual(first, selectPilotPlaces([...catalog].reverse(), 'one'));
  assert.notDeepEqual(first, second);
  assert.equal(new Set(first.map(place => place.place_id)).size, 15);
  assert.equal(first.filter(place => place.kind === 'restaurant').length, 8);
  assert.equal(first.filter(place => place.kind === 'museum').length, 7);
  assert.deepEqual(first.filter(place => place.anchor).map(place => place.place_id).sort(),
    second.filter(place => place.anchor).map(place => place.place_id).sort());
  assert.equal(first.filter(place => place.anchor).length, 6);
});

test('catalog rejects incomplete evidence, missing descriptions and inadequate coverage', () => {
  assert.deepEqual(catalogProblems(catalog), []);
  assert.match(catalogProblems(catalog.slice(0, 12)).join(), /museum/);
  assert.match(catalogProblems([{ ...catalog[0], description: '', evidence: {} }, ...catalog.slice(1)]).join(), /Ufuldstændig/);
  assert.match(catalogProblems([catalog[0], ...catalog]).join(), /Dublerede/);
});
