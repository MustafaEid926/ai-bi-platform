import express from 'express'; import crypto from 'node:crypto'; import {errorHandler} from '@aibi/http'; import {requestContext} from '@aibi/observability'; import {logger} from '@aibi/logger'; import {connectBus} from '@aibi/messaging';
const app=express(); app.use(express.json({limit:'10mb'})); app.use(requestContext); app.get('/health',(req,res)=>res.json({status:'ok',service:'reporting-service'})); app.get('/ready',(req,res)=>res.json({status:'ready'})); 
app.post('/api/v1/reports',(req,res)=>res.status(201).json({data:{id:crypto.randomUUID(),status:'DRAFT',configuration:req.body??{}}}));
app.post('/api/v1/reports/:id/generate',(req,res)=>res.status(202).json({data:{execution_id:crypto.randomUUID(),report_id:req.params.id,status:'QUEUED'}}));
 app.use(errorHandler); connectBus().catch(()=>{}); app.listen(3007,()=>logger.info('reporting-service listening on 3007'));
