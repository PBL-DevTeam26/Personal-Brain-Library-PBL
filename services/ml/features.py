import json
from pathlib import Path
import numpy as np

CODES = [x['code'] for x in json.loads((Path(__file__).resolve().parents[2] / 'database/seeds/features.json').read_text())]

def vector(preferences, place_features):
    u = np.asarray([float(preferences.get(code, 0)) for code in CODES], dtype=float)
    p = np.asarray([float(place_features.get(code, 0)) for code in CODES], dtype=float)
    return np.concatenate([u, p, u * p])


def samples(rows):
    X = np.asarray([vector(row['preferences'], row['place_features']) for row in rows], dtype=float)
    y = np.asarray([int(row['label']) for row in rows], dtype=int)
    groups = np.asarray([str(row['user_id']) for row in rows])
    return X, y, groups
