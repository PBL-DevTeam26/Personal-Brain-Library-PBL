// Planned projection; not executed automatically by the bootstrap.
CREATE CONSTRAINT pbl_user_id IF NOT EXISTS FOR (n:UserRef) REQUIRE n.userId IS UNIQUE;
CREATE CONSTRAINT pbl_fact_id IF NOT EXISTS FOR (n:KnowledgeFact) REQUIRE n.factId IS UNIQUE;
CREATE CONSTRAINT pbl_topic_id IF NOT EXISTS FOR (n:Topic) REQUIRE n.topicId IS UNIQUE;
// Vector index intentionally deferred until model dimension is validated in Ollama.
