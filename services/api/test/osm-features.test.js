import assert from 'node:assert/strict';
import test from 'node:test';
import { osmTagFeatures } from '../src/osm-features.js';

test('maps complete, normalized cuisine values from multi-value tags', () => {
  assert.deepEqual(osmTagFeatures('restaurant', { cuisine: ' Italian ; SUSHI, pizza ' }), {
    cuisine_italian: 1,
    cuisine_asian: 1,
  });
  assert.deepEqual(osmTagFeatures('restaurant', { cuisine: 'north_vietnamese' }), {
    cuisine_asian: 1,
  });
  assert.deepEqual(osmTagFeatures('restaurant', { cuisine: 'caucasian; not_italian; fusion' }), {});
});

test('recognizes explicit vegan or vegetarian availability and exclusivity', () => {
  for (const key of ['diet:vegan', 'diet:vegetarian']) {
    for (const value of ['yes', ' ONLY ']) {
      assert.deepEqual(osmTagFeatures('restaurant', { [key]: value }), { plant_based: 1 });
    }
  }
  assert.deepEqual(osmTagFeatures('restaurant', {
    'diet:vegan': 'no', 'diet:vegetarian': 'unknown', name: 'Vegan Cafe',
  }), {});
});

test('recognizes explicit museum topics in the subject and museum tags', () => {
  assert.deepEqual(osmTagFeatures('museum', { subject: 'art; History ' }), { history: 1 });
  assert.deepEqual(osmTagFeatures('museum', { museum: 'history' }), { history: 1 });
  assert.deepEqual(osmTagFeatures('museum', { 'museum:type': 'archaeological' }), { history: 1 });
});

test('ignores ambiguous museum tags, unrelated place kinds and invalid values', () => {
  assert.deepEqual(osmTagFeatures('museum', {
    name: 'History Museum', description: 'Local history', museum: 'local', historic: 'yes',
    subject: 'natural_history', cuisine: 'italian', 'diet:vegan': 'yes',
  }), {});
  assert.deepEqual(osmTagFeatures('restaurant', { subject: 'history', cuisine: 42 }), {});
  assert.deepEqual(osmTagFeatures('cafe', { cuisine: 'sushi' }), {});
  assert.deepEqual(osmTagFeatures('museum', null), {});
});
