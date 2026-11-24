# ExploreXP M1 · ML Baseline v1

## 1. Problem

Forudsig, om en deltager er interesseret i et restaurant- eller museumsbesøg, ud fra deltagerens quizpræferencer og stedets kendte egenskaber. Målet i denne pilot er at se, om en model gør det bedre end at vælge den hyppigste klasse for en ny deltager i det eksisterende stedkatalog.

## 2. Data

Databasen har 50 steder, hvoraf 17 har strukturerede features. Fem deltagere har tilsammen 100 quizsvar og 75 eksplicitte interessevurderinger, 15 pr. deltager. 53 vurderinger er positive og 22 negative. To deltagere gav kun positive vurderinger. Alle 75 havde et præferencesnapshot ved seneste vurdering. Stedfeatures afspejler databasens indhold ved eksporten.

| Stedtype | Vurderinger | Positive | Negative | Vurderinger med stedfeatures |
|---|---:|---:|---:|---:|
| Restaurant | 40 | 27 | 13 | 24 |
| Museum | 35 | 26 | 9 | 2 |
| I alt | 75 | 53 | 22 | 26 |

## 3. Input og preprocessing

Hver række har præferencesnapshot, stedfeatures, stedtype, boolean interesse-label, bruger-ID og sted-ID. Bruger-ID grupperer folds, og sted-ID bruges til sporbarhed og til at måle overlap mellem folds.

Modellerne får 62 input i fast rækkefølge. For de 15 koder i `database/seeds/features.json` opbygges fire blokke med præference `u`, stedvægt `p`, produktet `u × p` og en indikator for, om stedvægten er observeret. De sidste to kolonner er one-hot for restaurant og museum. En ukendt stedvægt udfyldes med 0 og har indikator 0. En eksplicit stedvægt på 0 har indikator 1. Et negativt produkt kræver både en negativ præference og en positiv stedvægt. Præferencer ligger i [−1, 1], stedvægte i [0, 1]. Preprocessing anvender faste regler pr. række, så der estimeres ingen skalering eller imputering på tværs af kandidater eller folds.

## 4. Træning

| Model | Metode |
|---|---|
| A · Majority class | Vælger den hyppigste klasse i træningsfoldet. |
| B · Logistisk regression | Sigmoid af en vægtet sum af input plus bias. L2-regularisering med `C=1`, som begrænser store koefficienter. |
| C · Keras MLP | 62 input → 4 ReLU-enheder → 1 sigmoid-output. 257 parametre, L2 på det skjulte lags vægte (`0,01`), 80 fulde træningstrin med Adam (`0,01`) og binary cross-entropy. |

Binary cross-entropy straffer sikre, forkerte sandsynligheder. Begge lærte modeller bruger beslutningsgrænsen 0,5. Seed 42 og deterministiske TensorFlow-operationer bruges på CPU. Hyperparametre og antal træningstrin blev fastlagt før evalueringen.

## 5. Evaluering

I hvert af fem leave-one-user-out folds trænes tre nye modeller på fire deltagere (60 vurderinger). De forudsiger alle 15 vurderinger fra den holdt-ude deltager. De 75 out-of-fold-forudsigelser samles derefter pr. model. Klassernes rækkefølge i confusion matrix er `[negativ, positiv]` for både faktiske rækker og forudsagte kolonner. Balanced accuracy er gennemsnittet af recall for de to klasser og rapporteres kun, når begge faktiske klasser er til stede. Med interesse som positiv klasse er precision `TP/(TP+FP)`, recall `TP/(TP+FN)` og F1 deres harmoniske gennemsnit.

Evalueringen måler generalisering til nye deltagere i kataloget. Steder kan optræde i trænings- og testfoldet for forskellige deltagere. [LeaveOneGroupOut i scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.LeaveOneGroupOut.html)

## 6. Resultater

### Samlet, 75 holdt-ude vurderinger

| Model | Accuracy | Precision | Recall | F1 | Balanced accuracy | Confusion matrix |
|---|---:|---:|---:|---:|---:|---|
| A · Majority class | 70,7 % | 70,7 % | 100,0 % | 82,8 % | 50,0 % | `[[0,22],[0,53]]` |
| B · Logistisk regression | 69,3 % | 72,1 % | 92,5 % | 81,0 % | 53,0 % | `[[3,19],[4,49]]` |
| C · Keras MLP | 69,3 % | 71,4 % | 94,3 % | 81,3 % | 51,7 % | `[[2,20],[3,50]]` |

### Pr. testdeltager

| Deltager | Model | Accuracy | Precision | Recall | F1 | Balanced accuracy | Confusion matrix |
|---|---|---:|---:|---:|---:|---:|---|
| U1 (6/15 positive) | A | 40,0 % | 40,0 % | 100,0 % | 57,1 % | 50,0 % | `[[0,9],[0,6]]` |
|  | B | 40,0 % | 40,0 % | 100,0 % | 57,1 % | 50,0 % | `[[0,9],[0,6]]` |
|  | C | 40,0 % | 40,0 % | 100,0 % | 57,1 % | 50,0 % | `[[0,9],[0,6]]` |
| U2 (15/15 positive) | A | 100,0 % | 100,0 % | 100,0 % | 100,0 % | — | `[[0,0],[0,15]]` |
|  | B | 100,0 % | 100,0 % | 100,0 % | 100,0 % | — | `[[0,0],[0,15]]` |
|  | C | 100,0 % | 100,0 % | 100,0 % | 100,0 % | — | `[[0,0],[0,15]]` |
| U3 (15/15 positive) | A | 100,0 % | 100,0 % | 100,0 % | 100,0 % | — | `[[0,0],[0,15]]` |
|  | B | 73,3 % | 100,0 % | 73,3 % | 84,6 % | — | `[[0,0],[4,11]]` |
|  | C | 80,0 % | 100,0 % | 80,0 % | 88,9 % | — | `[[0,0],[3,12]]` |
| U4 (10/15 positive) | A | 66,7 % | 66,7 % | 100,0 % | 80,0 % | 50,0 % | `[[0,5],[0,10]]` |
|  | B | 66,7 % | 66,7 % | 100,0 % | 80,0 % | 50,0 % | `[[0,5],[0,10]]` |
|  | C | 66,7 % | 66,7 % | 100,0 % | 80,0 % | 50,0 % | `[[0,5],[0,10]]` |
| U5 (7/15 positive) | A | 46,7 % | 46,7 % | 100,0 % | 63,6 % | 50,0 % | `[[0,8],[0,7]]` |
|  | B | 66,7 % | 58,3 % | 100,0 % | 73,7 % | 68,8 % | `[[3,5],[0,7]]` |
|  | C | 60,0 % | 53,8 % | 100,0 % | 70,0 % | 62,5 % | `[[2,6],[0,7]]` |

Flertallet var positivt i alle fem træningsfolds (38–47 af 60). Logistisk regression genkendte 3 af 22 negative vurderinger og MLP’en 2 af 22. Alle de korrekte negative forudsigelser kom fra U5. Begge modeller forudsagde interesse for alle 35 museumsvurderinger og for alle 49 vurderinger uden stedfeatures. De to lærte modeller klassificerede 52 af 75 korrekt, én færre end flertalsmodellen.

I logistisk regression var de største gennemsnitlige koefficienter på tværs af folds præferencen for streetfood (+0,86) og de to sammenfaldende kolonner for asiatisk stedkategori (−0,64 hver). Koefficienterne beskriver associationer i denne pilot. Den sammenfaldende stedvægt og indikator gør deres individuelle bidrag svære at adskille. Det lille antal deltagere begrænser, hvad vi kan udlede om deres præferencer.

## 7. Begrænsninger og næste forbedring

De 75 vurderinger dækker 43 forskellige steder. Mellem 8 og 12 af de 15 teststeder pr. fold var også vurderet af træningsdeltagerne. Resultaterne afhænger af de steder, deltagerne blev præsenteret for. De fem profiler og den skæve labelfordeling giver et usikkert estimat for nye deltagere.

Prioritér flere uafhængige deltagere, der tilsammen giver flere positive og negative vurderinger af begge stedtyper. Kun én deltager fik korrekt genkendt negative svar, og 30 af de 53 positive svar kom fra to deltagere. Planlæg næste runde, så flere af de vurderede steder har dokumenterede features. Især museer trænger til bedre dækning, da kun 2 af 35 museumsvurderinger havde sådanne features. Gentag evalueringen med samme modeller og metode, før hyperparametrene justeres.

## Reproduktion

Kørslen brugte Python 3.13.11, TensorFlow 2.21.0 og Keras 3.15.1. Kommandoerne bruger `uv` og den lokale `explorexp`-database med pilotdata efter OSM-backfill. Kør fra projektroden i PowerShell. [TensorFlow-installation og Python-versioner](https://www.tensorflow.org/install/pip)

```powershell
cd services/api
npm.cmd run ml:export -- ../ml/artifacts/baseline-v1/feedback.json
cd ../ml
$mlPython = '.\artifacts\baseline-v1\venv\Scripts\python.exe'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $PWD 'artifacts/baseline-v1/python'
$env:UV_CACHE_DIR = Join-Path $PWD 'artifacts/baseline-v1/uv-cache'
if (!(Test-Path $mlPython)) {
    uv python install 3.13.11
    uv venv artifacts/baseline-v1/venv --python 3.13.11 --managed-python
}
uv pip install --python $mlPython -r requirements-baseline.txt
$env:TF_ENABLE_ONEDNN_OPTS = '0'
& $mlPython -m unittest discover -v
& $mlPython train.py --input artifacts/baseline-v1/feedback.json
```

Eksport og `metrics.json` ligger under `services/ml/artifacts/baseline-v1/`, som er Git-ignoreret. Med samme eksport og softwaremiljø kan kørslen gentages offline. Rapporten indeholder kun aggregerede resultater og deltageretiketterne U1–U5. API'en bruger fortsat sin eksisterende anbefalingsfunktion, mens denne kørsel gemmer evalueringsresultater offline.
