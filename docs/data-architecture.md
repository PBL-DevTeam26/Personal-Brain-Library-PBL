# ExploreXP · Data architecture

## Primary entities

- `users`: local pseudonymous test profiles.
- `places`: real OSM-sourced restaurant or museum records with coordinates, original tags and source identifiers.
- `features`: controlled 15-code preference taxonomy; stable codes are shared across place enrichment and quiz answers.
- `place_features`: evidence-backed tags for each place (`origin` distinguishes OSM, curated and LLM-derived).
- `quizzes`, `questions`, `options`, `option_signals`: curated preference questionnaires. No factual quiz scoring.
- `quiz_submissions`, `user_answers`: append-once completed answers. One XP award per quiz per user.
- `user_preferences`: AVG of signed signals per feature across all submitted answers; absence means unobserved, not dislike.
- `place_feedback`: one explicit binary interest label per user/place, with the profile snapshot at rating time.
- `xp_events`: idempotent ledger, XP is engagement, **not** confidence or data quality.
- `place_embeddings`: optional pgvector(384) storage, currently unused.

## Quiz -> feedback -> model

```
question + selected option
       | option_signals
       v
user_preferences (features)
       |          place_features <--- OSM / curated enrichment
       |               |
       +-------> user-place training example
                          |
             explicit user interested?  <-- ground-truth label
                          |
               supervised MLP training
```

No implicit label is created merely because a user clicked a recommendation. A click can be exploratory, not approval. The yes/no feedback question means *interest*, not necessarily attendance or satisfaction.

## Training and validation policy

- Training examples require a non-empty preference snapshot and an explicit human label.
- Use leave-one-user-out splits. Each participant's feedback is evaluated by models fitted on the other participants.
- Report accuracy, balanced accuracy, precision, recall, F1 and confusion matrices for the majority-class baseline and both learned models. See [ML Baseline v1](ml-baseline-v1.md).
- A small sample of volunteer users is **pilot evidence**, not proof of a generalizable production recommendation system.
- If more than one person is involved, obtain consent for anonymous feedback collection and keep the exported feedback file private.
- Scraped descriptions and LLM-added features need provenance and auditing before training.

## Scope protection

Initial `places.kind`: `restaurant` or `museum`. Temporary exhibitions belong in a later `exhibitions` entity with dates and hosting museum. They are not incorrectly represented as permanent museums.
