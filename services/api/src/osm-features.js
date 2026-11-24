const italianCuisine = new Set(['italian', 'pizza', 'pasta']);
const asianCuisine = new Set([
  'asian', 'chinese', 'indian', 'japanese', 'korean', 'sushi', 'thai', 'vietnamese',
  'north_vietnamese',
]);
const historyTopics = new Set([
  'history', 'historical', 'local_history', 'archaeology', 'archaeological',
  'archeology', 'archeological',
]);

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function tagValues(value) {
  return normalize(value).split(/[;,]/).map(normalize);
}

export function osmTagFeatures(kind, tags) {
  const features = {};
  if (kind === 'restaurant') {
    const cuisine = tagValues(tags?.cuisine);
    if (cuisine.some(value => italianCuisine.has(value))) features.cuisine_italian = 1;
    if (cuisine.some(value => asianCuisine.has(value))) features.cuisine_asian = 1;

    const diets = [tags?.['diet:vegan'], tags?.['diet:vegetarian']].map(normalize);
    if (diets.some(value => value === 'yes' || value === 'only')) features.plant_based = 1;
  }
  if (kind === 'museum') {
    const topics = [tags?.museum, tags?.['museum:type'], tags?.subject].flatMap(tagValues);
    if (topics.some(value => historyTopics.has(value))) features.history = 1;
  }
  return features;
}
