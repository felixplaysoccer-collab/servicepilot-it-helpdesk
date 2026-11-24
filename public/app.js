// ServicePilot front end. Vanilla JavaScript keeps the project easy to follow.
// API data comes from MySQL; this file does not use localStorage for records.
const state = { user:null, tickets:[], assets:[], staff:[], stats:null, selectedTicket:null, editingAsset:null };
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate = value => value ? new Date(String(value).replace(' ','T')).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—';
const code = id => `INC-${String(id).padStart(4,'0')}`;

async function api(url, options={}) {
  const response = await fetch(`/api${url}`, {
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-ServicePilot-Request':'1'},
    ...options
  });
  const data = await response.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if (!response.ok) {
    if (response.status===401 && !['/login','/me'].includes(url)) showLogin();
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}
function notice(message, isError=false) {
  const dialog = $('dialog[open]');
  if (dialog) {
    dialog.querySelector('.dialog-alert')?.remove();
    const p=document.createElement('p');p.className='field-error dialog-alert';p.textContent=message;
    const heading=dialog.querySelector('.dialog-header');heading?.after(p);
    return;
  }
  const banner=$('#banner');banner.hidden=false;banner.className=isError?'error':'';banner.textContent=message;
}
function showLogin() {
  state.user=null;$('#app-shell').hidden=true;$('#login-screen').hidden=false;
  $$('dialog[open]').forEach(d=>d.close());
}

function showApp(user) {
  state.user = user;

  $('#login-screen').hidden = true;
  $('#app-shell').hidden = false;

  const isAdmin = user.role === 'admin';
  const isViewer = user.role === 'viewer';

  $('#user-name').textContent = user.name;
  $('#user-role').textContent = isAdmin
    ? 'Administrator'
    : isViewer
      ? 'Read-only Viewer'
      : 'Technician';

  $('#user-initials').textContent = user.name
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Only administrators can add or edit equipment.
  $('#new-asset').hidden = !isAdmin;

  // Viewers cannot create support tickets.
  $$('[data-new-ticket]').forEach(button => {
    button.hidden = isViewer;
  });

  // Viewers can inspect ticket details but cannot change them.
  $$('[data-ticket-field]').forEach(select => {
    select.disabled = isViewer;
  });

  // Viewers can read existing notes but cannot add new ones.
  $('#note-form').style.display = isViewer ? 'none' : '';
}

function view(section) {
  const labels={dashboard:'Dashboard',tickets:'Support Tickets',assets:'Asset Inventory'};
  if(!labels[section])return;
  $$('.view').forEach(el=>el.classList.toggle('active',el.id===`${section}-view`));
  $$('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.section===section));
  $('#crumb').textContent=labels[section];$('#banner').hidden=true;
  window.scrollTo({top:0,behavior:'smooth'});
}
function pill(value){return `<span class="pill ${String(value).toLowerCase().replaceAll(' ','-')}">${safe(value)}</span>`;}
function ticketRows(items, isRecent=false) {
  if(!items.length)return `<tr><td class="empty" colspan="${isRecent?3:6}">No support tickets found.</td></tr>`;
  return items.map(t=>isRecent ? `<tr>
      <td><button type="button" class="table-title-button" data-ticket="${t.id}">${safe(t.title)}</button><small>${code(t.id)} · ${formatDate(t.created_at)}</small></td>
      <td>${pill(t.priority)}</td><td>${pill(t.status)}</td></tr>` : `<tr>
      <td><button type="button" class="table-title-button" data-ticket="${t.id}">${safe(t.title)}</button><small>${code(t.id)} · ${formatDate(t.created_at)}</small></td>
      <td>${safe(t.requester)}</td><td>${safe(t.assignee_name || 'Unassigned')}</td>
      <td>${pill(t.priority)}</td><td>${pill(t.status)}</td>
      <td><button type="button" class="row-action" data-ticket="${t.id}">Details</button></td></tr>`).join('');
}
function filteredTickets(){
  const q=$('#ticket-search').value.trim().toLowerCase(),filter=$('#ticket-filter').value;
  return state.tickets.filter(t=>(filter==='all'||t.status===filter) &&
    [t.title,t.requester,t.requester_email,t.category,t.assignee_name,code(t.id),t.asset_tag].some(v=>String(v||'').toLowerCase().includes(q)));
}
function renderTickets(){
  const items=filteredTickets();$('#tickets-table').innerHTML=ticketRows(items);
  $('#ticket-count').textContent=`Showing ${items.length} of ${state.tickets.length} tickets`;
  $('#recent-tickets').innerHTML=ticketRows(state.tickets.slice(0,5),true);
}
function filteredAssets(){
  const q=$('#asset-search').value.trim().toLowerCase(),filter=$('#asset-filter').value;
  return state.assets.filter(a=>(filter==='all'||a.status===filter) &&
    [a.asset_tag,a.device_name,a.asset_type,a.assigned_to,a.location].some(v=>String(v||'').toLowerCase().includes(q)));
}
function renderAssets(){
  const items=filteredAssets();
  $('#assets-table').innerHTML=items.length?items.map(a=>`<tr>
    <td><strong>${safe(a.device_name)}</strong><small>${safe(a.asset_tag)}</small></td><td>${safe(a.asset_type)}</td>
    <td>${safe(a.assigned_to)}</td><td>${safe(a.location)}</td><td>${pill(a.status)}</td>
    <td>${state.user?.role==='admin'?`<button type="button" class="row-action" data-asset="${a.id}">Edit</button>`:'—'}</td></tr>`).join(''):'<tr><td class="empty" colspan="6">No equipment matches your search.</td></tr>';
  $('#asset-count').textContent=`Showing ${items.length} of ${state.assets.length} assets`;
}
function renderDashboard(){
  const t=state.stats?.tickets||{},a=state.stats?.assets||{};
  const total=Number(t.total||0),resolved=Number(t.resolved||0),progress=Number(t.inProgress||0),open=Number(t.open||0);
  $('#stat-total').textContent=total;$('#stat-open').textContent=open;
  $('#stat-urgent').textContent=Number(t.urgent||0);$('#stat-assets').textContent=Number(a.active||0);
  $('#resolution-rate').textContent=`${total?Math.round(resolved/total*100):0}%`;
  $('#legend-open').textContent=open;$('#legend-progress').textContent=progress;$('#legend-resolved').textContent=resolved;
  $('#donut').style.background=total ? `conic-gradient(#35bf97 0 ${resolved/total*100}%, #efac5a ${resolved/total*100}% ${(resolved+progress)/total*100}%, #786cf3 ${(resolved+progress)/total*100}% 100%)` : '#edf0f7';
}
function options(select, items, placeholder, selected) {
  select.replaceChildren(new Option(placeholder,''));
  for(const row of items)select.add(new Option(row.label,String(row.id)));
  select.value=selected===null||selected===undefined?'':String(selected);
}
function reloadLists(){
  options($('#create-asset-select'),state.assets.map(a=>({id:a.id,label:`${a.asset_tag} — ${a.device_name}`})),'Not linked',null);
}
async function reload(){
  const [tickets,assets,stats,staff]=await Promise.all([api('/tickets'),api('/assets'),api('/stats'),api('/staff')]);
  Object.assign(state,{tickets,assets,stats,staff});
  renderTickets();renderAssets();renderDashboard();reloadLists();
}
function openTicket(id){
  const t=state.tickets.find(t=>t.id===Number(id));if(!t)return;
  state.selectedTicket=t.id;
  $('#detail-id').textContent=`${code(t.id)} · ${t.category}`;
  $('#ticket-detail-title').textContent=t.title;
  $('#detail-description').textContent=t.description;
  $('#detail-meta').innerHTML=`<span>Requester: ${safe(t.requester)}</span><span>Created: ${formatDate(t.created_at)}</span><span>Last updated: ${formatDate(t.updated_at)}</span>`;
  $('#detail-status').value=t.status;$('#detail-priority').value=t.priority;
  options($('#detail-assignee'),state.staff.map(x=>({id:x.id,label:x.name})),'Unassigned',t.assignee_id);
  options($('#detail-asset'),state.assets.map(x=>({id:x.id,label:`${x.asset_tag} — ${x.device_name}`})),'Not linked',t.asset_id);
  $('#note-form').reset();$('#activity-list').innerHTML='<li>Loading activity...</li>';
  const dialog=$('#ticket-detail-dialog');if(!dialog.open)dialog.showModal();
  loadActivity(t.id);
}
async function loadActivity(id){
  try{
    const activity=await api(`/tickets/${id}/activity`);
    if(state.selectedTicket!==id)return;
    $('#activity-list').innerHTML=activity.length?activity.map(item=>`<li><strong>${safe(item.description)}</strong><small>${safe(item.author||'Sample import')} · ${formatDate(item.created_at)}</small></li>`).join(''):'<li>No activity yet.</li>';
  }catch(err){notice(err.message,true);}
}
function openAsset(id=null){
  if(state.user.role!=='admin')return;
  const a=id?state.assets.find(row=>row.id===Number(id)):null;
  state.editingAsset=a?.id||null;
  const form=$('#asset-form');form.reset();
  $('#asset-dialog-title').textContent=a?'Edit equipment':'Add equipment';
  $('#asset-save').textContent=a?'Save changes':'Add equipment';
  if(a){for(const name of ['asset_tag','device_name','asset_type','status','assigned_to','location','serial_number'])form.elements[name].value=a[name]??'';}
  $('#asset-dialog').showModal();
}
function exportCsv(rows,columns,file){
  const clean=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`;};
  const lines=[columns.map(x=>clean(x[0])).join(','),...rows.map(row=>columns.map(x=>clean(row[x[1]])).join(','))];
  const blob=new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=file;
  document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();$('#login-error').hidden=true;
  const form=e.currentTarget;const button=form.querySelector('[type=submit]');button.disabled=true;
  try{
    const {user}=await api('/login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    showApp(user);form.reset();
    try {await reload();view('dashboard');}catch(error){notice(error.message,true);}
  }catch(err){$('#login-error').textContent=err.message;$('#login-error').hidden=false;}
  finally{button.disabled=false;}
});

$('#demo-login').addEventListener('click', async () => {
  const button = $('#demo-login');
  button.disabled = true;
  button.textContent = 'Opening demo...';
  $('#login-error').hidden = true;

  try {
    const { user } = await api('/demo-login', {
      method: 'POST'
    });

    showApp(user);
    await reload();
    view('dashboard');
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Explore Live Demo';
  }
});

$('#logout').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'});}catch{}showLogin();});
$$('[data-section]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.section)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.goto)));
$$('[data-new-ticket]').forEach(b=>b.addEventListener('click',()=>{$('#ticket-form').reset();reloadLists();$('#ticket-create-dialog').showModal();}));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>{$(`#${b.dataset.close}`).close();}));
$('#new-asset').addEventListener('click',()=>openAsset());
for(const field of ['ticket-search','ticket-filter'])$(`#${field}`).addEventListener('input',renderTickets);
for(const field of ['asset-search','asset-filter'])$(`#${field}`).addEventListener('input',renderAssets);
$('#export-tickets').addEventListener('click',()=>exportCsv(filteredTickets(),[['Ticket ID','id'],['Title','title'],['Requester','requester'],['Category','category'],['Priority','priority'],['Status','status'],['Assigned technician','assignee_name'],['Linked asset','asset_tag'],['Created','created_at']],'servicepilot-tickets.csv'));
$('#export-assets').addEventListener('click',()=>exportCsv(filteredAssets(),[['Asset Tag','asset_tag'],['Device','device_name'],['Type','asset_type'],['Assigned to','assigned_to'],['Location','location'],['Status','status'],['Serial','serial_number']],'servicepilot-assets.csv'));

document.addEventListener('click',e=>{
  const ticket=e.target.closest('[data-ticket]');if(ticket)openTicket(ticket.dataset.ticket);
  const asset=e.target.closest('[data-asset]');if(asset)openAsset(asset.dataset.asset);
});
$('#ticket-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  try{
    const data=Object.fromEntries(new FormData(form));
    const created=await api('/tickets',{method:'POST',body:JSON.stringify(data)});
    $('#ticket-create-dialog').close();await reload();view('tickets');notice(`${code(created.id)} created successfully.`);
  }catch(err){notice(err.message,true);}
});
$('#asset-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  try{
    const data=Object.fromEntries(new FormData(form));
    const method=state.editingAsset?'PATCH':'POST',endpoint=state.editingAsset?`/assets/${state.editingAsset}`:'/assets';
    await api(endpoint,{method,body:JSON.stringify(data)});
    $('#asset-dialog').close();await reload();view('assets');notice(state.editingAsset?'Asset updated.':'Asset added.');
    state.editingAsset=null;
  }catch(err){notice(err.message,true);}
});
$$('[data-ticket-field]').forEach(select=>select.addEventListener('change',async e=>{
  const field=e.target.dataset.ticketField,id=state.selectedTicket,value=e.target.value;
  try{
    await api(`/tickets/${id}`,{method:'PATCH',body:JSON.stringify({[field]:value||null})});
    await reload();openTicket(id);
  }catch(err){notice(err.message,true);const old=state.tickets.find(t=>t.id===id);if(old)e.target.value=old[field]??'';}
}));
$('#note-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  try{
    await api(`/tickets/${state.selectedTicket}/notes`,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    form.reset();await loadActivity(state.selectedTicket);
  }catch(err){notice(err.message,true);}
});

(async()=>{
  try{const {user}=await api('/me');showApp(user);await reload();}
  catch(err){showLogin();}
})();
