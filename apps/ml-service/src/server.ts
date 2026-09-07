import express from 'express'; import crypto from 'node:crypto'; import {errorHandler} from '@aibi/http'; import {requestContext} from '@aibi/observability'; import {logger} from '@aibi/logger'; import {connectBus} from '@aibi/messaging';
const app=express(); app.use(express.json({limit:'10mb'})); app.use(requestContext); app.get('/health',(req,res)=>res.json({status:'ok',service:'ml-service'})); app.get('/ready',(req,res)=>res.json({status:'ready'})); 
app.post('/api/v1/ml/jobs',(req,res)=>res.status(202).json({data:{job_id:crypto.randomUUID(),type:req.body?.type??'ANOMALY_DETECTION',status:'QUEUED'}}));
app.get('/api/v1/ml/jobs/:jobId',(req,res)=>res.json({data:{job_id:req.params.jobId,status:'COMPLETED',result:{}}}));
 app.use(errorHandler); connectBus().catch(()=>{}); app.listen(3006,()=>logger.info('ml-service listening on 3006'));
