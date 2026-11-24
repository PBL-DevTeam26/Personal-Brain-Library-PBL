import unittest

import numpy as np

from evaluate import classification_metrics, evaluate_baseline, evaluation_samples
from features import BASELINE_INPUT_NAMES, CODES, vector


def rating(user, place, *, label=True, kind='museum', features=None):
    return {
        'user_id': user, 'place_id': place, 'label': label, 'kind': kind,
        'preferences': {'history': -0.5},
        'place_features': features if features is not None else {},
    }


class BaselineTests(unittest.TestCase):
    def test_unknown_feature_differs_from_explicit_zero(self):
        missing = vector({'history': -0.5}, {}, kind='museum')
        known_zero = vector({'history': -0.5}, {'history': 0}, kind='museum')
        index = BASELINE_INPUT_NAMES.index('known.history')
        self.assertEqual(len(missing), 4 * len(CODES) + 2)
        self.assertEqual(missing[index], 0)
        self.assertEqual(known_zero[index], 1)
        np.testing.assert_array_equal(missing[:index], known_zero[:index])
        np.testing.assert_array_equal(missing[-2:], [0, 1])

    def test_input_uses_fixed_order_and_excludes_identifiers(self):
        rows = [rating('b', 'p1', label=False), rating('a', 'p2', features={'history': 1})]
        _, x, y, users = evaluation_samples(rows)
        np.testing.assert_array_equal(users, ['a', 'b'])
        np.testing.assert_array_equal(y, [1, 0])
        self.assertEqual(x[0, BASELINE_INPUT_NAMES.index('match.history')], -0.5)
        renamed = [dict(row, user_id='new-' + row['user_id'], place_id='new-' + row['place_id']) for row in rows]
        np.testing.assert_array_equal(x, evaluation_samples(renamed)[1])

    def test_rejects_old_exports_and_non_boolean_labels(self):
        with self.assertRaisesRegex(ValueError, 'Re-export'):
            evaluation_samples([rating('a', 'p', kind=None)])
        with self.assertRaisesRegex(ValueError, 'boolean'):
            evaluation_samples([rating('a', 'p', label='false')])

    def test_metrics_for_user_with_only_positive_labels(self):
        metrics = classification_metrics([1, 1], [0, 1])
        self.assertEqual(metrics['confusion_matrix'], [[0, 0], [1, 1]])
        self.assertEqual(metrics['recall'], 0.5)
        self.assertIsNone(metrics['balanced_accuracy'])

    def test_all_three_models_predict_each_held_out_rating_once(self):
        positives = [10, 1, 3, 5, 9]
        rows = [
            rating(f'u{user}', f'p{place}', label=place < count,
                   kind='restaurant' if place % 2 else 'museum',
                   features={'history': 1} if place % 3 == 0 else {})
            for user, count in enumerate(positives) for place in range(10)
        ]
        result = evaluate_baseline(rows)
        self.assertEqual([fold['positives'] for fold in result['per_user']], positives)
        self.assertEqual([fold['train_ratings'] for fold in result['per_user']], [40] * 5)
        first, second, *_ = result['per_user']
        self.assertEqual(first['models']['majority']['confusion_matrix'], [[0, 0], [10, 0]])
        self.assertEqual(second['models']['majority']['confusion_matrix'], [[0, 9], [0, 1]])
        for name in ['majority', 'logistic', 'mlp']:
            pooled = np.asarray(result['models'][name]['confusion_matrix'])
            np.testing.assert_array_equal(pooled.sum(axis=1), [22, 28])
            np.testing.assert_array_equal(pooled, np.sum([
                fold['models'][name]['confusion_matrix'] for fold in result['per_user']
            ], axis=0))
