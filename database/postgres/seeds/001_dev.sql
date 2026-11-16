INSERT INTO users(id,email,status) VALUES ('00000000-0000-4000-8000-000000000001','synthetic.user@pbl.invalid','active') ON CONFLICT DO NOTHING;
INSERT INTO categories(id,canonical_key,display_name) VALUES
('10000000-0000-4000-8000-000000000001','entertainment','Underholdning'),
('10000000-0000-4000-8000-000000000002','daily-life','Hverdag') ON CONFLICT DO NOTHING;
INSERT INTO topics(id,category_id,canonical_key,display_name) VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','movies','Film'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','music','Musik'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','food','Mad') ON CONFLICT DO NOTHING;
INSERT INTO questions(id,topic_id,canonical_intent,question_type,prompt) VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','favorite-movie-genre','text','Hvilken filmgenre foretrækker du?'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','favorite-music-genre','text','Hvilken musikgenre lytter du mest til?'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','favorite-food','text','Hvad er din yndlingsret?') ON CONFLICT DO NOTHING;
