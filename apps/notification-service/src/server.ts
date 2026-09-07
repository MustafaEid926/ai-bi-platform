import express from 'express'; import {errorHandler} from '@aibi/http'; import {requestContext} from '@aibi/observability'; import {logger} from '@aibi/logger'; import {connectBus} from '@aibi/messaging';
const app=express(); app.use(express.json({limit:'10mb'})); app.use(requestContext); app.get('/health',(req,res)=>res.json({status:'ok',service:'notification-service'})); app.get('/ready',(req,res)=>res.json({status:'ready'})); 
app.get('/api/v1/notifications',(req,res)=>res.json({data:[]}));
app.patch('/api/v1/notifications/:notificationId/read',(req,res)=>res.json({data:{id:req.params.notificationId,read:true}}));
 app.use(errorHandler); connectBus().catch(()=>{}); app.listen(3008,()=>logger.info('notification-service listening on 3008'));
