import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { calculateBaseline, validateQuizAnswers, quizLevel } from './domain.js';

const PLACE_FIELDS = `SELECT p.id,p.name,p.kind,p.latitude,p.longitude,p.description,p.raw_tags,
 COALESCE(jsonb_object_agg(pf.feature_code,pf.weight) FILTER (WHERE pf.feature_code IS NOT NULL),'{}'::jsonb) AS features
 FROM places p LEFT JOIN place_features pf ON pf.place_id=p.id GROUP BY p.id`;
const sendError = (res, status, code, message) => res.status(status).json({error:{code,message}});

export function createApp() {
 const app=express();
 app.use(cors()); // Local demo only. Configure origin and authentication before production.
 app.use(express.json({limit:'64kb'}));
 app.get('/health',(_req,res)=>res.json({status:'ok',service:'explorexp-api'}));

 app.post('/api/v1/demo-users',async(_req,res,next)=>{
  try {
   const r=await pool.query("INSERT INTO users(display_name) VALUES('Explorer') RETURNING id");
   res.status(201).json({userId:r.rows[0].id,mode:'anonymous_demo'});
  }catch(e){next(e)}
 });
 app.use('/api/v1',async(req,res,next)=>{
  const id=req.header('X-Explore-User');
  if(!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return sendError(res,401,'USER_REQUIRED','Create a demo user before calling this endpoint');
  try{
   const r=await pool.query('SELECT id FROM users WHERE id=$1',[id]);
   if(!r.rowCount)return sendError(res,401,'UNKNOWN_USER','Demo user not found');
   req.userId=id;next();
  }catch(e){next(e)}
 });
 app.get('/api/v1/quizzes',async(req,res,next)=>{
  try {
   const r=await pool.query(`SELECT q.id,q.title,q.description,q.domain,q.xp_reward AS "xpReward",
      (s.user_id IS NOT NULL) AS completed
      FROM quizzes q LEFT JOIN quiz_submissions s ON s.quiz_id=q.id AND s.user_id=$1
      WHERE q.is_published=true ORDER BY q.domain,q.id`,[req.userId]);
   res.json(r.rows);
  } catch(e){next(e)}
 });
 app.get('/api/v1/quizzes/:id',async(req,res,next)=>{
  try {
   const quiz=await pool.query('SELECT id,title,description,domain,xp_reward AS "xpReward" FROM quizzes WHERE id=$1 AND is_published=true',[req.params.id]);
   if(!quiz.rows.length)return sendError(res,404,'NOT_FOUND','Quiz not found');
   const questions=await pool.query(`SELECT q.id AS "questionId",q.prompt,o.id AS "optionId",o.label
      FROM questions q JOIN options o ON o.question_id=q.id
      WHERE q.quiz_id=$1 ORDER BY q.position,o.position`,[req.params.id]);
   const grouped=[];
   for(const x of questions.rows){let q=grouped.find(y=>y.id===x.questionId);if(!q){q={id:x.questionId,prompt:x.prompt,options:[]};grouped.push(q)}q.options.push({id:x.optionId,label:x.label});}
   res.json({...quiz.rows[0],questions:grouped});
  }catch(e){next(e)}
 });
 app.post('/api/v1/quizzes/:id/submit',async(req,res,next)=>{
  const c=await pool.connect();
  try {
   await c.query('BEGIN');
   const quiz=await c.query('SELECT id,xp_reward FROM quizzes WHERE id=$1 AND is_published=true',[req.params.id]);
   if(!quiz.rows.length){await c.query('ROLLBACK');return sendError(res,404,'NOT_FOUND','Quiz not found')}
   const qRows=await c.query(`SELECT q.id,ARRAY_AGG(o.id ORDER BY o.position) AS options
     FROM questions q JOIN options o ON o.question_id=q.id WHERE q.quiz_id=$1 GROUP BY q.id`,[req.params.id]);
   const questions=qRows.rows.map(q=>({id:q.id,options:q.options.map(id=>({id}))}));
   if(!validateQuizAnswers(questions,req.body?.answers)){await c.query('ROLLBACK');return sendError(res,400,'INVALID_ANSWERS','Exactly one valid answer per question required')}
   const done=await c.query('INSERT INTO quiz_submissions(user_id,quiz_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quiz_id',[req.userId,req.params.id]);
   if(!done.rowCount){await c.query('ROLLBACK');return sendError(res,409,'ALREADY_COMPLETED','Quiz already completed. XP cannot be earned twice.')}
   for(const a of req.body.answers){await c.query('INSERT INTO user_answers(user_id,question_id,option_id) VALUES($1,$2,$3)',[req.userId,a.questionId,a.optionId]);}
   await c.query(`INSERT INTO user_preferences(user_id,feature_code,score,observations)
     SELECT ua.user_id,s.feature_code,AVG(s.strength)::real,COUNT(*)::int
     FROM user_answers ua JOIN option_signals s ON s.option_id=ua.option_id
     WHERE ua.user_id=$1 GROUP BY ua.user_id,s.feature_code
     ON CONFLICT(user_id,feature_code) DO UPDATE SET score=EXCLUDED.score,
      observations=EXCLUDED.observations,updated_at=now()`,[req.userId]);
   await c.query('INSERT INTO xp_events(user_id,event_key,amount) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.userId,`quiz:${req.params.id}`,quiz.rows[0].xp_reward]);
   const xp=await c.query('SELECT COALESCE(SUM(amount),0)::int AS xp FROM xp_events WHERE user_id=$1',[req.userId]);
   await c.query('COMMIT');
   res.status(201).json({completed:true,xp:xp.rows[0].xp,level:quizLevel(xp.rows[0].xp),earnedXp:quiz.rows[0].xp_reward});
  }catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}
 });
 app.get('/api/v1/me/progress',async(req,res,next)=>{
  try{
   const [xp,prefs,done]=await Promise.all([
    pool.query('SELECT COALESCE(SUM(amount),0)::int AS xp FROM xp_events WHERE user_id=$1',[req.userId]),
    pool.query('SELECT feature_code AS code,score,observations FROM user_preferences WHERE user_id=$1 ORDER BY feature_code',[req.userId]),
    pool.query('SELECT quiz_id FROM quiz_submissions WHERE user_id=$1',[req.userId])
   ]);
   res.json({xp:xp.rows[0].xp,level:quizLevel(xp.rows[0].xp),completedQuizIds:done.rows.map(r=>r.quiz_id),preferences:prefs.rows});
  }catch(e){next(e)}
 });
 app.get('/api/v1/places',async(_req,res,next)=>{
  try {const r=await pool.query(`${PLACE_FIELDS} ORDER BY p.name LIMIT 100`);res.json(r.rows)}catch(e){next(e)}
 });
 app.get('/api/v1/survey',async(req,res,next)=>{
  try{
   const r=await pool.query(`SELECT q.* FROM (${PLACE_FIELDS}) q
     WHERE NOT EXISTS(SELECT 1 FROM place_feedback f WHERE f.place_id=q.id AND f.user_id=$1)
     ORDER BY md5(q.id::text || $1::text) LIMIT 15`,[req.userId]);
   res.json(r.rows);
  }catch(e){next(e)}
 });
 app.get('/api/v1/recommendations',async(req,res,next)=>{
  try{
   const [pr,pf]=await Promise.all([
     pool.query('SELECT feature_code,score FROM user_preferences WHERE user_id=$1',[req.userId]),
     pool.query(`${PLACE_FIELDS} ORDER BY p.name LIMIT 100`)
   ]);
   const prefs=Object.fromEntries(pr.rows.map(x=>[x.feature_code,Number(x.score)]));
   let items=pf.rows.map(place=>({...place,matchScore:calculateBaseline(prefs,place.features),feedback:null}));
   let source='baseline';
   try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),2000);
    try{
     const response=await fetch(`${process.env.ML_URL ?? 'http://localhost:8101'}/predict`,{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({preferences:prefs,places:items.map(p=>({id:p.id,features:p.features}))})});
     if(response.ok){const result=await response.json();
       if(result.scores && result.source==='trained_model'){
         const scores=new Map(result.scores.map(r=>[r.id,r.score]));
         items=items.map(p=>({...p,matchScore:scores.has(p.id)?scores.get(p.id):p.matchScore}));source='trained_model';
       }
     }
    }finally{clearTimeout(timeout)}
   }catch{} // Unavailable ML service explicitly falls back to baseline.
   items.sort((a,b)=>b.matchScore-a.matchScore);
   res.json({source,items:items.slice(0,30)});
  }catch(e){next(e)}
 });
 app.post('/api/v1/places/:id/feedback',async(req,res,next)=>{
  if(typeof req.body?.interested!=='boolean') return sendError(res,400,'INVALID_FEEDBACK','interested must be boolean');
  try{
   const r=await pool.query(`INSERT INTO place_feedback(user_id,place_id,interested,preference_snapshot)
      SELECT $1,id,$3,(SELECT COALESCE(jsonb_object_agg(feature_code,score),'{}'::jsonb)
       FROM user_preferences WHERE user_id=$1) FROM places WHERE id=$2
      ON CONFLICT(user_id,place_id) DO UPDATE SET interested=EXCLUDED.interested,
        preference_snapshot=EXCLUDED.preference_snapshot,updated_at=now()
      RETURNING interested`,[req.userId,req.params.id,req.body.interested]);
   if(!r.rowCount)return sendError(res,404,'NOT_FOUND','Place not found');
   res.json({saved:true,interested:r.rows[0].interested});
  }catch(e){next(e)}
 });
 app.use((err,_req,res,_next)=>{console.error(err);sendError(res,500,'INTERNAL_ERROR','An internal error occurred')});
 return app;
}
