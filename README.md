# ExploreXP · M1 foundation

**React Native + Expo (JavaScript), Express, PostgreSQL + pgvector, Python MLP and Leaflet WebView.**

M1 prototype: 4 preference quiz packs (20 questions), anonymous local test profiles, XP, OSM place import, a Leaflet map, interest/not-interest feedback, structured recommendation baseline, and a supervised MLP training/evaluation pipeline. **The ML model is not yet validated on real user data.**

## Prerequisites

**Ny laptop / samme telefon:** følg [vejledningen til separat database og profiler](docs/laptop-setup.md). Den beskriver også opdatering af den eksisterende PC uden tab af svar.

- Node.js 22.13+ (Expo SDK 58), npm, Docker Desktop, Python 3.11+.
- PC and Android phone on same Wi-Fi; Expo Go compatible with Expo SDK 58.
- Internet connection for npm/Expo, Overpass and Leaflet map tiles.

## Start on Windows PowerShell

Run each set in its own terminal. Commands assume you're in the extracted `explorexp-m1` folder.

**1. Database:**

```powershell
docker compose up -d --wait db
```

**2. REST API and quiz seed:**

```powershell
cd services/api
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run places:import
npm test
npm run dev
```

Try `http://localhost:3101/health`. `places:import` fetches up to 25 restaurants and 25 museums from a small Copenhagen bounding box. If the public Overpass service is busy, retry later; the quiz API can still run.

**3. React Native app:**

```powershell
cd apps/mobile
Copy-Item .env.example .env
```

Edit `.env`: replace `192.168.1.100` with your PC's actual local IPv4 address (`ipconfig`). **Do not use `localhost` on a physical Android phone.** Then:

```powershell
npm install
npx expo install --fix
npx expo-doctor
npm run start
```

Scan the QR code in Expo Go. In Windows Firewall, permit inbound TCP 3101 **only for the trusted private LAN** as needed. Never expose this demo API to the public internet: it intentionally has no real authentication.

**4. Optional Python ML service (a second terminal):**

```powershell
cd services/ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m unittest -v test_features
python train.py --demo
$env:ALLOW_SYNTHETIC_MODEL="1"
python app.py
```

`--demo` trains on **synthetic** feedback for a pipeline smoke test. Its metrics do not measure real recommendation quality. If the Python service is offline or synthetic mode isn't explicitly enabled, the API falls back to a named **baseline** recommender, not a pretend ML model.

## Flere testpersoner på samme telefon

Forsiden viser den aktive person. Den eksisterende profil bliver automatisk Person 1 med samme bruger-ID, quizsvar, XP og stedbedømmelser som før.

Når en ny deltager får telefonen, tryk **Opret ny person** på forsiden. Hver oprettelse giver et nyt bruger-ID, tomme quizzer, 0 XP og egne stedbedømmelser. Den nye person bliver aktiv; tidligere personers data bevares i databasen. Appen husker den aktive person efter genstart. Personnumre gælder denne installation; de er lokale etiketter for de separate bruger-ID'er. Der er endnu ingen knap til at skifte tilbage til tidligere personer.

Lad hver deltager besvare quizzerne og derefter bedømme steder. Spring over gemmer ikke et fravalg. Disse er menneskelige besvarelser; eventuelle syntetiske profiler skal senere genereres og mærkes særskilt.

Mobilens profiltests: kør `npm test` i `apps/mobile`.

## Collect real supervised feedback

1. Each tester installs/opens the app and receives a **separate randomly generated local demo identity** (stored with Expo SecureStore). No email or account is needed.
2. Complete at least one quiz (preferably all four); the answers update the user's `user_preferences` vector.
3. Open `Udforsk kortet` and rate different places from the `Hjælp modellen med at lære` card. Each explicit interest rating is a **label**; the preference vector is stored as a point-in-time snapshot.
4. Aim for **10+ testers × 10-15 different ratings** each and some positive **and** negative examples. The training script enforces a lower technical minimum of 5 testers, 50 labels, and 10 examples per class, but more diversity is preferable.
5. With API dependencies installed:

```powershell
cd services/api
npm run ml:export
cd ../ml
python train.py
python app.py
```

The training set is saved to `services/ml/data/feedback.json` (gitignored). Models and metrics are written to `services/ml/artifacts/` (gitignored). The training pipeline uses a **user-disjoint train/test split** and compares an MLP to a majority-class baseline. Real-data evaluation should also account for small-sample uncertainty and feedback exposure bias.

**Do not treat quiz answers as labels.** They are features. Explicit place ratings are labels. Do not train on model-generated pseudo-labels and then claim a trustworthy evaluation.

## Endpoints

- `GET /health` (public diagnostic)
- `POST /api/v1/demo-users` (create test profile)
- `GET /api/v1/quizzes`, `GET /api/v1/quizzes/:id`, `POST /api/v1/quizzes/:id/submit`
- `GET /api/v1/me/progress`
- `GET /api/v1/places`, `GET /api/v1/survey`, `GET /api/v1/recommendations`
- `POST /api/v1/places/:id/feedback` with `{"interested": true|false}`

All `/api/v1` endpoints except demo user creation expect `X-Explore-User` containing the random demo UUID. This is **NOT production authentication**.

## Important limitations

- User identity is pseudonymous and intentionally unsecured; **development only**.
- No live database, npm installation, device build or Overpass request was performed in the artifact-building environment. Those must be verified on the user's Windows machine.
- OSM tags are sparse and do not imply atmosphere, price or detailed artistic interests; do not fabricate these as facts.
- pgvector is installed and schema supports 384-dimensional embeddings. **Embeddings and RAG are deferred**, as agreed for the exam MVP.
- n8n workflows are not deployed; the import script demonstrates the initial ingestion logic. See `workflows/n8n/README.md` for the integration boundary.
- OpenStreetMap data: © OpenStreetMap contributors, ODbL. Attribution is included on the map. Respect Overpass public-instance and OSM tile usage policies.
- The teacher must approve the exam topic.

## Architecture

```text
React Native (Expo + JSX) -> Express REST API -> PostgreSQL + pgvector
                                           \-> Python ML HTTP service (optional)
Overpass API -> Node import script --------> PostgreSQL
n8n (later) -> scheduled import/enrichment/quiz generation
```

Read `docs/data-architecture.md` and `docs/m1-checklist.md` before extending the system.
