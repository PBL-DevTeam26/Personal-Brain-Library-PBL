import { createApp } from './app.js';
const port=Number(process.env.PORT)||3101;
createApp().listen(port,'0.0.0.0',()=>console.log(`ExploreXP API listening on ${port} (DEMO MODE; no auth)`));
