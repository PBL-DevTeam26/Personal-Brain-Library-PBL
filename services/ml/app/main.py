from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="PBL ML integration scaffold", version="0.1.0")

class Candidate(BaseModel):
    topicId: str
    priorSelections: int = Field(0, ge=0)
    priorSkips: int = Field(0, ge=0)

class RankRequest(BaseModel):
    candidates: list[Candidate]

@app.get('/internal/ml/health')
def health():
    return {'status': 'ok', 'trainedModelAvailable': False}

@app.post('/internal/ml/rank')
def rank(request: RankRequest):
    # Explicit heuristic placeholder. Never describe as trained Machine Learning.
    rows = [{'topicId': c.topicId, 'interestScore': (c.priorSelections+1)/(c.priorSelections+c.priorSkips+2)} for c in request.candidates]
    return {'strategy': 'heuristic-placeholder', 'modelVersion': None, 'results': sorted(rows,key=lambda x:-x['interestScore'])}
