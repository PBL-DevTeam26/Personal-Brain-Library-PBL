"""Offline, user-disjoint comparison of three binary interest classifiers."""

from importlib.metadata import version

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score,
    precision_score, recall_score,
)
from sklearn.model_selection import LeaveOneGroupOut

from features import BASELINE_INPUT_NAMES, CODES, PLACE_KINDS, samples

SEED = 42
MLP_UNITS = 4
MLP_STEPS = 80
MODEL_NAMES = ('majority', 'logistic', 'mlp')


def classification_metrics(actual, predicted):
    return {
        'accuracy': accuracy_score(actual, predicted),
        'precision': precision_score(actual, predicted, zero_division=0),
        'recall': recall_score(actual, predicted, zero_division=0),
        'f1': f1_score(actual, predicted, zero_division=0),
        'balanced_accuracy': balanced_accuracy_score(actual, predicted) if len(set(actual)) == 2 else None,
        'confusion_matrix': confusion_matrix(actual, predicted, labels=[0, 1]).tolist(),
    }


def mlp_predictions(tf, x_train, y_train, x_test):
    tf.keras.backend.clear_session()
    tf.keras.utils.set_random_seed(SEED)
    with tf.device('/CPU:0'):
        model = tf.keras.Sequential([
            tf.keras.Input(shape=(x_train.shape[1],)),
            tf.keras.layers.Dense(MLP_UNITS, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
            tf.keras.layers.Dense(1, activation='sigmoid'),
        ])
        model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.01), loss='binary_crossentropy')
        for _ in range(MLP_STEPS):
            model.train_on_batch(x_train, y_train)
        return (model(x_test, training=False).numpy().ravel() >= 0.5).astype(int)


def evaluation_samples(rows):
    for row in rows:
        if type(row['label']) is not bool:
            raise ValueError('Expected boolean interest labels from ml:export.')
        if row.get('kind') not in PLACE_KINDS:
            raise ValueError('Missing or unsupported place kind. Re-export with ml:export.')
    rows = sorted(rows, key=lambda row: (row['user_id'], row['place_id']))
    x, y, groups = samples(rows, with_place_context=True)
    return rows, x, y, groups


def evaluate_baseline(rows):
    rows, x, y, groups = evaluation_samples(rows)
    if len(y) < 50 or len(set(groups)) < 5 or min(np.bincount(y, minlength=2)) < 10:
        raise ValueError('Need at least 50 ratings, 5 users, and 10 ratings per class.')
    folds = list(LeaveOneGroupOut().split(x, y, groups))
    if any(len(set(y[train])) < 2 for train, _ in folds):
        raise ValueError('Each training fold needs both classes. Collect ratings from more users.')

    import tensorflow as tf

    tf.config.experimental.enable_op_determinism()
    oof = {name: np.empty_like(y) for name in MODEL_NAMES}
    places = np.asarray([row['place_id'] for row in rows])
    kinds = np.asarray([row['kind'] for row in rows])
    known_place = x[:, 3 * len(CODES):4 * len(CODES)].any(axis=1)
    per_user = []
    coefficients = []
    for number, (train, test) in enumerate(folds, start=1):
        majority = DummyClassifier(strategy='most_frequent').fit(x[train], y[train])
        logistic = LogisticRegression(C=1.0, max_iter=1000, random_state=SEED).fit(x[train], y[train])
        oof['majority'][test] = majority.predict(x[test])
        oof['logistic'][test] = logistic.predict(x[test])
        oof['mlp'][test] = mlp_predictions(tf, x[train], y[train], x[test])
        coefficients.append(logistic.coef_[0])
        per_user.append({
            'user': f'U{number}',
            'train_ratings': len(train),
            'train_positives': int(y[train].sum()),
            'ratings': len(test),
            'positives': int(y[test].sum()),
            'places_also_in_training': len(set(places[test]) & set(places[train])),
            'models': {name: classification_metrics(y[test], pred[test]) for name, pred in oof.items()},
        })

    segments = {
        'restaurant': kinds == 'restaurant', 'museum': kinds == 'museum',
        'with_place_features': known_place, 'without_place_features': ~known_place,
    }
    weights = zip(BASELINE_INPUT_NAMES, np.mean(coefficients, axis=0).tolist())
    return {
        'evaluation': 'leave_one_user_out',
        'seed': SEED,
        'versions': {name: version(name) for name in ('numpy', 'scikit-learn', 'tensorflow', 'keras')},
        'input_features': BASELINE_INPUT_NAMES,
        'ratings': len(y),
        'positives': int(y.sum()),
        'users': len(folds),
        'rated_places': len(set(places)),
        'models': {name: classification_metrics(y, predicted) for name, predicted in oof.items()},
        'per_user': per_user,
        'segments': {
            segment: {
                'ratings': int(mask.sum()),
                'positives': int(y[mask].sum()),
                'models': {name: classification_metrics(y[mask], pred[mask]) for name, pred in oof.items()},
            }
            for segment, mask in segments.items() if mask.any()
        },
        'largest_mean_logistic_coefficients': dict(sorted(weights, key=lambda item: -abs(item[1]))[:8]),
    }
