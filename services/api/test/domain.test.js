import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateQuizAnswers, calculateBaseline, quizLevel } from '../src/domain.js';
const quizzes = JSON.parse(readFileSync(new URL('../../../database/seeds/quizzes.json',import.meta.url)));
const features = JSON.parse(readFileSync(new URL('../../../database/seeds/features.json',import.meta.url)));
test('Four quiz packs, five questions each, three options each',()=>{
 assert.equal(quizzes.length,4);
 for(const q of quizzes){ assert.equal(q.questions.length,5);for(const question of q.questions) assert.equal(question.options.length,3); }
});
test('All signals refer to controlled features and weights are bounded',()=>{
 const valid = new Set(features.map(x=>x.code));
 for(const q of quizzes) for(const question of q.questions) for(const option of question.options)
   for(const [code,weight] of Object.entries(option.signals)){assert(valid.has(code));assert(weight>=-1&&weight<=1);}
});
test('Only complete unique valid answers accepted',()=>{
 const qs=quizzes[0].questions;
 const answers=qs.map(q=>({questionId:q.id,optionId:q.options[0].id}));
 assert.equal(validateQuizAnswers(qs,answers),true);
 assert.equal(validateQuizAnswers(qs,answers.slice(1)),false);
 assert.equal(validateQuizAnswers(qs,[...answers.slice(1),answers[1]]),false);
 assert.equal(validateQuizAnswers(qs,[...answers.slice(1),{questionId:qs[0].id,optionId:'bad'}]),false);
});
test('Baseline is neutral when no preferences and bounded for mismatches',()=>{
 assert.equal(calculateBaseline({},{}),0.5);
 assert.equal(calculateBaseline({cuisine_asian:1},{cuisine_asian:1}),1);
 assert.equal(calculateBaseline({cuisine_asian:-1},{cuisine_asian:1}),0);
});
test('Levels cannot be inflated by negative XP',()=>{assert.equal(quizLevel(0),1);assert.equal(quizLevel(200),2);assert.equal(quizLevel(-10),1);});
