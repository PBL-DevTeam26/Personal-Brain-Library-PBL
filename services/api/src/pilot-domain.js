import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateQuizAnswers } from './domain.js';

export const PILOT = 'pilot-2-v1';
export const QUOTAS = { restaurant: 8, museum: 7 };
export const TOTAL = 15;
export const DOMAINS = {
  restaurant: ['cuisine_asian', 'cuisine_italian', 'plant_based'],
  museum: ['art_modern', 'art_classical', 'history', 'interactive', 'science'],
};
const topics = {
  cuisine_asian: 'asiatiske retter',
  cuisine_italian: 'italienske retter',
  plant_based: 'muligheden for at vælge en vegetarisk eller vegansk ret',
  art_modern: 'udstillinger med samtidskunst',
  art_classical: 'udstillinger med ældre europæiske malerier',
  history: 'udstillinger om historie',
  interactive: 'udstillinger, hvor du selv kan prøve aktiviteter',
  science: 'udstillinger om videnskab eller teknologi',
};
const quizPacks = [
  ['food-style', 'Din madstil', ['cuisine_asian', 'cuisine_italian']],
  ['food-discovery', 'Smag og nysgerrighed', ['plant_based']],
  ['culture-art', 'Din kunstsmag', ['art_modern', 'art_classical']],
  ['culture-discovery', 'Kultur og opdagelser', ['history', 'interactive', 'science']],
];
export const definition = {
  version: PILOT,
  consent: 'Dine quizsvar og stedvurderinger bruges til at undersøge anbefalinger i et eksamensprojekt. Deltagelse er frivillig. Svar gemmes under et tilfældigt profil-ID. Du kan springe stedvurderinger over eller stoppe undervejs. Spørg forsøgslederen, hvis du vil have din deltagelse fjernet.',
  quizzes: quizPacks.map(([id, title, codes]) => ({
    id, title, questions: codes.map(code => ({
      id: code, prompt: 'Når du vælger et sted, hvor attraktivt er det for dig med ' + topics[code] + '?',
      options: [
        { id: 'prefer', label: 'Det gør stedet mere attraktivt', signals: { [code]: 1 } },
        { id: 'avoid', label: 'Det gør stedet mindre attraktivt', signals: { [code]: -1 } },
        { id: 'neutral', label: 'Ingen præference / ved ikke', signals: {} },
      ],
    })),
  })),
};

export const manifest = JSON.parse(readFileSync(new URL('../../../database/seeds/pilot-2-places.json', import.meta.url), 'utf8'));

export function quizAnswers(quiz, input) {
  if (!validateQuizAnswers(quiz.questions, input)) return null;
  const selected = new Map(input.map(answer => [answer.questionId, answer.optionId]));
  return Object.fromEntries(quiz.questions.map(question => [question.id, selected.get(question.id)]));
}

export function preferenceProfile(quizzes, answers) {
  return Object.fromEntries(quizzes.flatMap(quiz => quiz.questions.flatMap(question =>
    Object.entries(question.options.find(option => option.id === answers[quiz.id]?.[question.id])?.signals ?? {}),
  )));
}

export function catalogProblems(places) {
  const errors = [];
  if (new Set(places.map(place => place.place_id)).size !== places.length) errors.push('Dublerede pilotsteder');
  for (const [kind, codes] of Object.entries(DOMAINS)) {
    const group = places.filter(place => place.kind === kind);
    if (group.length < 12) errors.push('Mindst 12 steder kræves for ' + kind);
    if (group.filter(place => place.anchor).length !== 3) errors.push('Tre fælles steder kræves for ' + kind);
    for (const code of codes) {
      if (!group.some(place => place.features?.[code] === 1)) errors.push('Mangler dækning for ' + code);
    }
  }
  for (const place of places) {
    const codes = Object.keys(place.features ?? {});
    if (!place.place_id || !place.name?.trim() || !place.description?.trim() || !codes.length ||
        Object.keys(place.evidence ?? {}).length !== codes.length ||
        codes.some(code => !DOMAINS[place.kind]?.includes(code) || place.features[code] !== 1 ||
          !place.evidence?.[code]?.detail?.trim() || !/^https:\/\//.test(place.evidence[code].url))) {
      errors.push('Ufuldstændig dokumentation for ' + (place.source_id ?? place.place_id));
    }
  }
  return errors;
}

export function selectPilotPlaces(places, userId) {
  const rank = place => createHash('sha256').update(PILOT + ':' + userId + ':' + place.place_id).digest('hex');
  const ordered = items => items.map(place => [rank(place), place])
    .sort(([left], [right]) => left.localeCompare(right)).map(([, place]) => place);
  const groups = Object.entries(QUOTAS).map(([kind, quota]) => {
    const candidates = places.filter(place => place.kind === kind);
    const anchors = candidates.filter(place => place.anchor);
    return [...anchors, ...ordered(candidates.filter(place => !place.anchor)).slice(0, quota - anchors.length)];
  });
  return ordered(groups.flat());
}
