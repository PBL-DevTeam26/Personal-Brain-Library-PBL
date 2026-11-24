import json
from pathlib import Path
import numpy as np

CODES = [x['code'] for x in json.loads((Path(__file__).resolve().parents[2] / 'database/seeds/features.json').read_text())]
PLACE_KINDS = ('restaurant', 'museum')
BASELINE_INPUT_NAMES = [f'{block}.{code}' for block in (
    'preference', 'place', 'match', 'known',
) for code in CODES] + [f'kind.{kind}' for kind in PLACE_KINDS]

def vector(preferences, place_features, *, kind=None):
    u = np.asarray([float(preferences.get(code, 0)) for code in CODES], dtype=float)
    p = np.asarray([float(place_features.get(code, 0)) for code in CODES], dtype=float)
    if kind is None:
        return np.concatenate([u, p, u * p])
    if kind not in PLACE_KINDS:
        raise ValueError(f'Unknown place kind: {kind}')
    known = [code in place_features for code in CODES]
    return np.concatenate([u, p, u * p, known, [kind == value for value in PLACE_KINDS]])


def samples(rows, *, with_place_context=False):
    X = np.asarray([
        vector(row['preferences'], row['place_features'], kind=row['kind'] if with_place_context else None)
        for row in rows
    ], dtype=float)
    y = np.asarray([int(row['label']) for row in rows], dtype=int)
    groups = np.asarray([str(row['user_id']) for row in rows])
    return X, y, groups
