export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export function validateQuizAnswers(questions, submitted) {
  if (!Array.isArray(submitted) || questions.length === 0 || submitted.length !== questions.length) return false;
  const ids = new Set();
  for (const answer of submitted) {
    if (!answer || typeof answer.questionId !== 'string' || typeof answer.optionId !== 'string' || ids.has(answer.questionId)) return false;
    const question = questions.find(q => q.id === answer.questionId);
    if (!question || !question.options.some(o => o.id === answer.optionId)) return false;
    ids.add(answer.questionId);
  }
  return true;
}

export function calculateBaseline(preferences, placeFeatures) {
  const known = Object.entries(preferences).filter(([_, value]) => typeof value === 'number' && value !== 0);
  if (!known.length) return 0.5;
  let dot = 0;
  let norm = 0;
  for (const [code, score] of known) {
    dot += score * (placeFeatures[code] ?? 0);
    norm += Math.abs(score);
  }
  return Math.min(1, Math.max(0, 0.5 + 0.5 * dot / norm));
}

export function quizLevel(xp) { return Math.floor(Math.max(0, xp) / 200) + 1; }
