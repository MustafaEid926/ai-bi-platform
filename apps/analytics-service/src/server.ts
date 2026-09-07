import express from 'express'; import crypto from 'node:crypto'; import {errorHandler} from '@aibi/http'; import {requestContext} from '@aibi/observability'; import {logger} from '@aibi/logger'; import {connectBus} from '@aibi/messaging';
const app=express(); app.use(express.json({limit:'10mb'})); app.use(requestContext); app.get('/health',(req,res)=>res.json({status:'ok',service:'analytics-service'})); app.get('/ready',(req,res)=>res.json({status:'ready'})); 
app.post('/api/v1/analytics/query',(req,res)=>{const q=req.body??{}; const rows=[{dimension:'Demo Product A',total_revenue:125000},{dimension:'Demo Product B',total_revenue:98000},{dimension:'Demo Product C',total_revenue:72000}]; res.json({data:{query_id:crypto.randomUUID(),definition:q,rows,execution_time_ms:3,source:'demo-analytics-adapter'}})});
app.get('/api/v1/analytics/queries/:id',(req,res)=>res.json({data:{id:req.params.id,status:'COMPLETED'}}));
app.post('/api/v1/kpis',(req,res)=>res.status(201).json({data:{id:crypto.randomUUID(),...req.body}}));
 app.use(errorHandler); connectBus().catch(()=>{}); app.listen(3003,()=>logger.info('analytics-service listening on 3003'));
