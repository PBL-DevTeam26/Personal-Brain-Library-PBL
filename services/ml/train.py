"""Evaluate real ratings offline or train the existing synthetic serving demo."""
import argparse
import json
from pathlib import Path
import warnings
import joblib
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.exceptions import ConvergenceWarning
from evaluate import evaluate_baseline
from features import CODES, samples

ROOT=Path(__file__).resolve().parent
ARTIFACT=ROOT/'artifacts/model.joblib'
META=ROOT/'artifacts/metadata.json'

def make_synthetic_demo():
    rng=np.random.default_rng(42)
    result=[]
    for user in range(16):
        u=rng.uniform(-1,1,size=len(CODES))
        for place in range(20):
            p=(rng.random(len(CODES)) < 0.3).astype(float)
            latent=float(np.dot(u,p)/(np.sum(p)+1e-9))
            label=int(latent+rng.normal(0,0.18)>0.03)
            result.append({'user_id':f'demo-{user}','place_id':f'demo-place-{place}',
                'preferences':dict(zip(CODES,u.tolist())),
                'place_features':dict(zip(CODES,p.tolist())), 'label':bool(label)})
    return result

def train_demo(rows):
    if len(rows)<50 or len(set(str(x['user_id']) for x in rows))<5:
        raise ValueError('Need >=50 explicit place ratings from >=5 users. Quiz answers alone are not labels.')
    X,y,groups=samples(rows)
    if len(set(y))<2 or min(np.bincount(y))<10:
        raise ValueError('Need at least 10 interested and 10 not-interested labels.')
    split=None
    for seed in range(42,142):
        tr,te=next(GroupShuffleSplit(test_size=0.25,random_state=seed).split(X,y,groups))
        if len(set(y[tr]))==2 and len(set(y[te]))==2:
            split=(tr,te);break
    if split is None:raise ValueError('Cannot form a valid user-disjoint test set with both classes.')
    tr,te=split
    baseline=DummyClassifier(strategy='most_frequent').fit(X[tr],y[tr])
    clf=make_pipeline(StandardScaler(),MLPClassifier(hidden_layer_sizes=(32,16),random_state=42,max_iter=500,alpha=0.01))
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore',category=ConvergenceWarning)
        clf.fit(X[tr],y[tr])
    pred=clf.predict(X[te]);positive_index=list(clf.classes_).index(1)
    prob=clf.predict_proba(X[te])[:,positive_index]
    result={'mode':'synthetic_demo','n_samples':len(rows),'n_users':len(set(groups)),
        'train_samples':len(tr),'test_samples':len(te),
        'baseline_accuracy':round(float(accuracy_score(y[te],baseline.predict(X[te]))),4),
        'model_accuracy':round(float(accuracy_score(y[te],pred)),4),
        'model_balanced_accuracy':round(float(balanced_accuracy_score(y[te],pred)),4),
        'model_roc_auc':round(float(roc_auc_score(y[te],prob)),4),
        'feature_codes':CODES, 'split':'disjoint_users', 'seed':seed}
    ARTIFACT.parent.mkdir(parents=True,exist_ok=True)
    joblib.dump(clf,ARTIFACT)
    META.write_text(json.dumps(result,indent=2))
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    source=parser.add_mutually_exclusive_group()
    source.add_argument('--demo',action='store_true',help='Train only on synthetic demonstration data')
    source.add_argument('--input',type=Path,help='Real feedback JSON exported by ml:export')
    args=parser.parse_args()
    if args.demo:
        print(json.dumps(train_demo(make_synthetic_demo()), indent=2))
        print('WARNING: Synthetic demo metrics are NOT evidence of real recommendation quality.')
    else:
        path = args.input or ROOT / 'data/feedback.json'
        metrics = evaluate_baseline(json.loads(path.read_text(encoding='utf-8')))
        report = ROOT / 'artifacts/baseline-v1/metrics.json'
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(json.dumps(metrics, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(metrics, indent=2))
