import json
import os
from pathlib import Path
import joblib
from flask import Flask, jsonify, request
from features import vector

app=Flask(__name__)
ROOT=Path(__file__).resolve().parent
model_path=ROOT/'artifacts/model.joblib'
meta_path=ROOT/'artifacts/metadata.json'
MODEL=joblib.load(model_path) if model_path.exists() else None
META=json.loads(meta_path.read_text()) if meta_path.exists() else None

@app.get('/health')
def health():
    return jsonify({'ready':MODEL is not None,'mode':META.get('mode') if META else None})

@app.post('/predict')
def predict():
    if MODEL is None:return jsonify({'error':'No trained model available'}),503
    if META.get('mode')=='synthetic_demo' and os.environ.get('ALLOW_SYNTHETIC_MODEL')!='1':
        return jsonify({'error':'Synthetic model disabled unless explicitly enabled for local demos'}),503
    body=request.get_json(silent=True) or {}
    places=body.get('places');preferences=body.get('preferences')
    if not isinstance(places,list) or not isinstance(preferences,dict) or len(places)>100:
        return jsonify({'error':'Invalid prediction request'}),400
    if not places:return jsonify({'source':'trained_model','scores':[]})
    try:
        X=[vector(preferences,p['features']) for p in places]
        pindex=list(MODEL.classes_).index(1)
        probabilities=MODEL.predict_proba(X)[:,pindex]
        return jsonify({'source':'trained_model','scores':[{'id':p['id'],'score':float(score)} for p,score in zip(places,probabilities)]})
    except (KeyError,ValueError,TypeError) as e:return jsonify({'error':str(e)}),400

if __name__=='__main__':app.run(host='127.0.0.1',port=int(os.environ.get('ML_PORT','8101')))
