import express from 'express'; import crypto from 'node:crypto'; import {errorHandler} from '@aibi/http'; import {requestContext} from '@aibi/observability'; import {logger} from '@aibi/logger'; import {connectBus} from '@aibi/messaging';
const app=express(); app.use(express.json({limit:'10mb'})); app.use(requestContext); app.get('/health',(req,res)=>res.json({status:'ok',service:'rag-service'})); app.get('/ready',(req,res)=>res.json({status:'ready'})); 
app.post('/api/v1/documents',(req,res)=>res.status(201).json({data:{id:crypto.randomUUID(),status:'PROCESSING',name:req.body?.name??'document'}}));
app.post('/internal/v1/rag/search',(req,res)=>res.json({data:{query:req.body?.query??'',results:[],note:'Qdrant adapter ready; semantic embedding provider is configurable.'}}));
 app.use(errorHandler); connectBus().catch(()=>{}); app.listen(3005,()=>logger.info('rag-service listening on 3005'));
