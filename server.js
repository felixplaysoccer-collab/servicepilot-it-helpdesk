import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashToken, newToken, verifyPassword, sessionCookie, expireCookie } from './lib/security.js';
import { id, text, choice, optionalId, checkTicket, checkAsset, priorities, ticketStatuses, assetStatuses } from './lib/validation.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const secureCookies = process.env.NODE_ENV === 'production';
const dir = path.dirname(fileURLToPath(import.meta.url));
const db = mysql.createPool({host:process.env.DB_HOST || '127.0.0.1',port:Number(process.env.DB_PORT || 3306),
  user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',database:process.env.DB_NAME || 'servicepilot',
  connectionLimit:6,waitForConnections:true,dateStrings:true});

app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:secureCookies ? [] : null}}}));
app.use(express.json({limit:'24kb'}));
app.use(express.static(path.join(dir,'public'),{extensions:['html']}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
const fail = (res,message,status=400)=>res.status(status).json({error:message});

// Custom header plus SameSite cookie prevents cross-site HTML forms from modifying records.
app.use('/api',(req,res,next)=>{
  if (!['POST','PATCH','PUT','DELETE'].includes(req.method)) return next();
  if (req.get('X-ServicePilot-Request') !== '1') return fail(res,'Missing request header.',403);
  const origin = req.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host') || new URL(origin).protocol !== (secureCookies ? 'https:' : 'http:')) return fail(res,'Cross-origin request rejected.',403);
    } catch { return fail(res,'Invalid request origin.',403); }
  }
  next();
});

const parseCookie = req => {
  const cookie = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('sp_session='));
  const token = cookie?.slice('sp_session='.length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
};
async function auth(req,res,next) {
  const token = parseCookie(req);
  if (!token) return fail(res,'Sign in to continue.',401);
  try {
    const [rows] = await db.execute(`SELECT u.id,u.name,u.email,u.role FROM sessions s
      JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > NOW() LIMIT 1`,[hashToken(token)]);
    if (!rows.length) return fail(res,'Session expired. Sign in again.',401);
    req.user=rows[0];req.token=token;next();
  } catch(err){ next(err); }
}
const admin = (req,res,next) => req.user.role==='admin' ? next() : fail(res,'Only administrators can change inventory.',403);

app.get('/api/health',async(_req,res)=>{
  try {await db.query('SELECT 1');res.json({ok:true,database:'connected'});}
  catch {res.status(503).json({ok:false,error:'Cannot connect to MySQL. Check your database and .env file.'});}
});

// Small in-memory login throttle for LOCAL use; production should use shared rate limiting.
const failures=new Map();
app.post('/api/login',async(req,res,next)=>{
  const email = text(req.body?.email,160).toLowerCase();const password=req.body?.password;
  const key=`${req.ip}:${email}`;const now=Date.now();const previous=failures.get(key);
  if(previous?.until>now && previous.count>=5) return fail(res,'Too many attempts. Try again in 15 minutes.',429);
  if(!email || typeof password!=='string' || password.length>128) return fail(res,'Invalid sign-in details.');
  try {
    const [rows]=await db.execute('SELECT id,name,email,role,password_hash FROM users WHERE email=? LIMIT 1',[email]);
    const good=rows.length && await verifyPassword(password,rows[0].password_hash);
    if(!good){const count=previous?.until>now ? previous.count+1 : 1;failures.set(key,{count,until:now+900000});return fail(res,'Incorrect email or password.',401);}
    failures.delete(key);
    const token=newToken();await db.execute('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))',[hashToken(token),rows[0].id]);
    res.set('Set-Cookie',sessionCookie(token,secureCookies));
    res.json({user:{id:rows[0].id,name:rows[0].name,email:rows[0].email,role:rows[0].role}});
  } catch(err){next(err);}
});
app.post('/api/logout',auth,async(req,res,next)=>{
  try{await db.execute('DELETE FROM sessions WHERE token_hash=?',[hashToken(req.token)]);
    res.set('Set-Cookie',expireCookie(secureCookies));res.json({ok:true});}
  catch(err){next(err);}
});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));
app.get('/api/staff',auth,async(req,res,next)=>{
  try{const [rows]=await db.query('SELECT id,name,role FROM users ORDER BY name');res.json(rows);}catch(err){next(err);}
});

app.get('/api/stats',auth,async(req,res,next)=>{
  try{
    const [[tickets]]=await db.query(`SELECT COUNT(*) total,
      COALESCE(SUM(status='Open'),0) open,
      COALESCE(SUM(status='In Progress'),0) inProgress,
      COALESCE(SUM(status='Resolved'),0) resolved,
      COALESCE(SUM(priority IN ('High','Critical') AND status!='Resolved'),0) urgent FROM tickets`);
    const [[assets]]=await db.query(`SELECT COUNT(*) total,COALESCE(SUM(status='Active'),0) active,
      COALESCE(SUM(status='Maintenance'),0) maintenance,COALESCE(SUM(status='Retired'),0) retired FROM assets`);
    const [categories]=await db.query(`SELECT category,COUNT(*) total FROM tickets GROUP BY category ORDER BY total DESC`);
    res.json({tickets,assets,categories});
  } catch(err){next(err);}
});

const ticketQuery=`SELECT t.id,t.title,t.requester,t.requester_email,t.category,t.priority,t.status,t.description,
    t.created_at,t.updated_at,t.resolved_at,t.asset_id,t.assignee_id,u.name AS assignee_name,
    a.asset_tag,a.device_name AS asset_name
  FROM tickets t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN assets a ON t.asset_id=a.id`;
app.get('/api/tickets',auth,async(req,res,next)=>{
  try{const [rows]=await db.query(`${ticketQuery} ORDER BY t.created_at DESC,t.id DESC LIMIT 500`);res.json(rows);}
  catch(err){next(err);}
});
app.get('/api/tickets/:id/activity',auth,async(req,res,next)=>{
  if(!id(req.params.id))return fail(res,'Invalid ticket number.');
  try{
    const [[ticket]]=await db.execute('SELECT id FROM tickets WHERE id=?',[req.params.id]);
    if(!ticket)return fail(res,'Ticket not found.',404);
    const [events]=await db.execute(`SELECT a.id,a.action,a.description,a.created_at,u.name AS author
      FROM ticket_activity a LEFT JOIN users u ON a.user_id=u.id
      WHERE a.ticket_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 100`,[req.params.id]);res.json(events);
  }catch(err){next(err);}
});
app.post('/api/tickets',auth,async(req,res,next)=>{
  const parsed=checkTicket(req.body);if(parsed.error)return fail(res,parsed.error);
  const t=parsed.value;const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const [r]=await connection.execute(`INSERT INTO tickets
      (title,requester,requester_email,category,priority,description,asset_id,created_by)
      VALUES (?,?,?,?,?,?,?,?)`,[t.title,t.requester,t.requester_email,t.category,t.priority,t.description,t.asset_id,req.user.id]);
    await connection.execute(`INSERT INTO ticket_activity (ticket_id,user_id,action,description) VALUES (?,?, 'created',?)`,
      [r.insertId,req.user.id,'Support request created']);
    await connection.commit();res.status(201).json({id:r.insertId,message:'Ticket created.'});
  }catch(err){await connection.rollback();next(err);}finally{connection.release();}
});
app.patch('/api/tickets/:id',auth,async(req,res,next)=>{
  if(!id(req.params.id))return fail(res,'Invalid ticket number.');
  const allowed=['status','priority','assignee_id','asset_id'];const fields=Object.keys(req.body || {});
  if(fields.length!==1 || !allowed.includes(fields[0]))return fail(res,'Update one ticket field at a time.');
  const field=fields[0];let value=req.body[field];
  if(field==='status'&&!choice(value,ticketStatuses))return fail(res,'Invalid status.');
  if(field==='priority'&&!choice(value,priorities))return fail(res,'Invalid priority.');
  if(field==='assignee_id'||field==='asset_id'){
    value=optionalId(value);if(Number.isNaN(value))return fail(res,'Invalid assignment.');
  }
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const [[old]]=await connection.execute(`SELECT status,priority,assignee_id,asset_id FROM tickets WHERE id=? FOR UPDATE`,[req.params.id]);
    if(!old){await connection.rollback();return fail(res,'Ticket not found.',404);}
    if(old[field]===value){await connection.rollback();return res.json({message:'No change needed.'});}
    const names={status:'status',priority:'priority',assignee_id:'assigned',asset_id:'asset'};
    const label=field==='assignee_id'?(value===null?'Unassigned':`Technician #${value}`):field==='asset_id'?(value===null?'No linked asset':`Asset #${value}`):value;
    const extra=field==='status'?", resolved_at = IF(? = 'Resolved', NOW(), NULL)":'';
    const params=field==='status'?[value,value,req.params.id]:[value,req.params.id];
    await connection.execute(`UPDATE tickets SET ${field}=? ${extra} WHERE id=?`,params);
    await connection.execute('INSERT INTO ticket_activity (ticket_id,user_id,action,description) VALUES (?,?,?,?)',
      [req.params.id,req.user.id,names[field],`${field==='status'?'Status':field==='priority'?'Priority':field==='assignee_id'?'Assignment':'Linked asset'} changed to ${label}`]);
    await connection.commit();res.json({message:'Ticket updated.'});
  }catch(err){await connection.rollback();next(err);}finally{connection.release();}
});
app.post('/api/tickets/:id/notes',auth,async(req,res,next)=>{
  if(!id(req.params.id))return fail(res,'Invalid ticket number.');
  const note=text(req.body?.note,500);
  if(note.length<3)return fail(res,'Enter a troubleshooting note of at least 3 characters.');
  try{
    const [[ticket]]=await db.execute('SELECT id FROM tickets WHERE id=?',[req.params.id]);
    if(!ticket)return fail(res,'Ticket not found.',404);
    await db.execute(`INSERT INTO ticket_activity (ticket_id,user_id,action,description) VALUES (?,?,'note',?)`,[req.params.id,req.user.id,note]);
    res.status(201).json({message:'Note added.'});
  }catch(err){next(err);}
});

app.get('/api/assets',auth,async(req,res,next)=>{
  try{const [rows]=await db.query('SELECT * FROM assets ORDER BY id DESC LIMIT 500');res.json(rows);}
  catch(err){next(err);}
});
app.post('/api/assets',auth,admin,async(req,res,next)=>{
  const parsed=checkAsset(req.body);if(parsed.error)return fail(res,parsed.error);
  const a=parsed.value;
  try{
    const [r]=await db.execute(`INSERT INTO assets (asset_tag,device_name,asset_type,serial_number,assigned_to,location,status)
      VALUES (?,?,?,?,?,?,?)`,[a.asset_tag,a.device_name,a.asset_type,a.serial_number,a.assigned_to,a.location,a.status]);
    res.status(201).json({id:r.insertId,message:'Asset added.'});
  }catch(err){next(err);}
});
app.patch('/api/assets/:id',auth,admin,async(req,res,next)=>{
  if(!id(req.params.id))return fail(res,'Invalid asset number.');
  const parsed=checkAsset(req.body);if(parsed.error)return fail(res,parsed.error);
  const a=parsed.value;
  try{
    const [r]=await db.execute(`UPDATE assets SET asset_tag=?,device_name=?,asset_type=?,serial_number=?,assigned_to=?,location=?,status=? WHERE id=?`,
      [a.asset_tag,a.device_name,a.asset_type,a.serial_number,a.assigned_to,a.location,a.status,req.params.id]);
    if(!r.affectedRows)return fail(res,'Asset not found.',404);
    res.json({message:'Asset updated.'});
  }catch(err){next(err);}
});

app.use('/api',(_req,res)=>fail(res,'Unknown API endpoint.',404));
app.use((err,_req,res,_next)=>{
  if(err.code==='ER_DUP_ENTRY')return fail(res,'That asset tag or email already exists.',409);
  if(err.code==='ER_NO_REFERENCED_ROW_2')return fail(res,'The selected technician or asset does not exist.',400);
  if(err.type==='entity.parse.failed')return fail(res,'Invalid JSON.',400);
  console.error('[ServicePilot]',err.code || err.message);
  res.status(500).json({error:'Something went wrong on the server. Check your database connection.'});
});

app.listen(port,()=>console.log(`ServicePilot available at http://localhost:${port}`));
