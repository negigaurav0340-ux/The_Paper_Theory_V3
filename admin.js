(async()=>{
'use strict';
const $=s=>document.querySelector(s),safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const local=()=>{try{return JSON.parse(localStorage.getItem('tpt-analytics-v1'))||[]}catch{return []}};
const money=v=>`₹${Number(v||0).toLocaleString('en-IN')}`,pct=(n,d)=>d?`${(n/d*100).toFixed(1)}%`:'0%';
const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
const key=v=>{const p=Object.fromEntries(parts.formatToParts(new Date(v)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`};
const dayIndex=k=>new Date(`${k}T12:00:00Z`).getUTCDay();
const count=(list,name,id)=>list.filter(e=>e.name===name&&(!id||(Array.isArray(id)?id.includes(e.productId):e.productId===id))).length;
let all=local(),live=false;
function list(id,rows,empty='No recorded data in this period.'){const node=$(id);node.innerHTML=rows.length?`<div class="report-list">${rows.map(([label,n])=>`<p><span>${safe(label)}</span><b>${safe(n)}</b></p>`).join('')}</div>`:`<p>${empty}</p>`}
async function load(){const password=$('#analyticsPassword').value.trim();if(!password){$('#modeNote').textContent='Enter the manager password to load live analytics.';return}
 try{const response=await fetch('/api/analytics',{headers:{'x-catalogue-secret':password},cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Connection failed');all=data.events||[];live=true;$('#dataMode').textContent='LIVE ANONYMOUS EVENTS';$('#modeTitle').textContent='Live website activity';$('#modeNote').textContent=`Latest ${all.length.toLocaleString()} recorded events (maximum 5,000). No customer names, addresses or phone numbers are collected.`;render()}
 catch(error){live=false;all=local();$('#dataMode').textContent='BROWSER DATA ONLY';$('#modeTitle').textContent='Local browser preview';$('#modeNote').textContent=`${error.message}. Connect live analytics to view activity across visitors.`;render()}}
function render(){
 const now=new Date(),today=key(now),preset=$('#period').value;
 let endKey=preset==='custom'?$('#dateTo').value:today;
 let startKey=preset==='custom'?$('#dateFrom').value:key(new Date(now.getTime()-(Number(preset)-1)*86400000));
 const span=Math.round((Date.parse(endKey+'T00:00:00Z')-Date.parse(startKey+'T00:00:00Z'))/86400000)+1;
 if(!startKey||!endKey||startKey>endKey||!Number.isFinite(span)||span>366){$('#rangeStatus').textContent='Choose a valid range of up to 366 days.';return}
 $('#dateFrom').value=startKey;$('#dateTo').value=endKey;
 const events=all.filter(e=>e.time&&key(e.time)>=startKey&&key(e.time)<=endKey);
 $('#rangeStatus').textContent=`${startKey} → ${endKey} · ${events.length.toLocaleString()} events`;
 const sort=$('#dateSort').value;
 const unique=l=>new Set(l.map(e=>e.sessionId).filter(Boolean)).size;
 const orders=events.filter(e=>e.name==='order_placed'),revenue=orders.reduce((s,e)=>s+Number(e.revenue||0),0);
 $('#visitorsToday').textContent=unique(events);$('#ordersToday').textContent=orders.length;$('#revenueToday').textContent=money(revenue);$('#conversionRate').textContent=pct(orders.length,unique(events));
 $('#productViewsRange').textContent=count(events,'product_view');$('#checkoutsToday').textContent=count(events,'checkout_started');$('#averageOrder').textContent=money(orders.length?revenue/orders.length:0);$('#cartsToday').textContent=count(events,'add_to_cart');$('#lastUpdated').textContent=`Updated ${now.toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})} IST`;
 const byDay=new Map();for(let i=0;i<span;i++){const date=new Date(Date.parse(startKey+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);byDay.set(date,{sessions:new Set(),events:0,views:0,carts:0,checkouts:0})}
 for(const e of events){const row=byDay.get(key(e.time));if(row){row.events++;if(e.sessionId)row.sessions.add(e.sessionId);if(e.name==='product_view')row.views++;if(e.name==='add_to_cart')row.carts++;if(e.name==='checkout_started')row.checkouts++}}
 const daily=[...byDay].map(([date,v])=>({date,visitors:v.sessions.size,events:v.events,views:v.views,carts:v.carts,checkouts:v.checkouts})),max=Math.max(1,...daily.map(d=>d.visitors));
 const sortedDaily=[...daily].sort((a,b)=>sort==='oldest'?a.date.localeCompare(b.date):sort==='visitors'?b.visitors-a.visitors||b.date.localeCompare(a.date):sort==='actions'?b.events-a.events||b.date.localeCompare(a.date):b.date.localeCompare(a.date));
 $('#dailyRows').innerHTML=sortedDaily.map(d=>`<tr><td>${d.date}</td><td>${d.visitors}</td><td>${d.views}</td><td>${d.events}</td><td>${d.carts}</td><td>${d.checkouts}</td></tr>`).join('');
 const width=Math.max(480,daily.length*22),points=daily.map((v,i)=>`${20+i*(width-40)/Math.max(1,daily.length-1)},${195-v.visitors/max*155}`).join(' ');
 $('#dailyChart').innerHTML=`<svg viewBox="0 0 ${width} 220" preserveAspectRatio="none" role="img" aria-label="${span} day visitor trend"><line x1="20" y1="195" x2="${width-20}" y2="195" stroke="#999"/><polyline points="${points}" fill="none" stroke="#7855a9" stroke-width="3"/>${daily.map((v,i)=>`<circle cx="${20+i*(width-40)/Math.max(1,daily.length-1)}" cy="${195-v.visitors/max*155}" r="3" fill="#7855a9"><title>${v.date}: ${v.visitors} visitors, ${v.events} events, ${v.carts} carts</title></circle>`).join('')}<text x="20" y="214" font-size="12">${safe(daily[0].date)}</text><text x="${width-110}" y="214" font-size="12">${safe(daily.at(-1).date)}</text></svg>`;
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],group=weekdays.map(()=>({sessions:new Set(),events:0}));for(const e of events){const g=group[dayIndex(key(e.time))];g.events++;if(e.sessionId)g.sessions.add(e.sessionId)}
 const high=Math.max(1,...group.map(g=>g.events));$('#weekdayChart').innerHTML=group.map((g,i)=>`<div class="bar-line"><b>${weekdays[i]}</b><meter min="0" max="${high}" value="${g.events}">${g.events}</meter><span>${g.events}</span></div>`).join('');
 const source=new Map(),device=new Map(),page=new Map();for(const e of events){if(e.name!=='page_view')continue;source.set(e.source||'direct',(source.get(e.source||'direct')||0)+1);device.set(e.device||'unknown',(device.get(e.device||'unknown')||0)+1);page.set(e.path||'/',(page.get(e.path||'/')||0)+1)}
 list('#journeyReport',[...page.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([x,y])=>[`${x} · page views`,y]).concat([...device.entries()].map(([x,y])=>[`${x} visits`,y])));
 const popular=new Map();for(const e of events)if(e.name==='product_view'&&e.productId)popular.set(e.productId,(popular.get(e.productId)||0)+1);
 list('#productInterest',[...popular].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,n])=>[window.CATALOGUE.products.find(p=>p.id===id)?.name||id,n]));
 list('#sourceReport',[...source].sort((a,b)=>b[1]-a[1]).map(([x,y])=>[x,`${y} page views`]));
 $('#locationReport').textContent='Location is unavailable because anonymous analytics does not collect visitor addresses or IP locations.';
 const lightboxIds=['LIT-001','LIT-GOKU','LIT-LUFFY'];const allLight=events.filter(e=>lightboxIds.includes(e.productId));
 function row(label,ev){const n=name=>count(ev,name),view=n('product_view'),ordered=ev.filter(e=>e.name==='order_placed'),rev=ordered.reduce((s,e)=>s+Number(e.revenue||0),0);return `<tr><td>${safe(label)}</td><td>${view}</td><td>${n('comparison_slider_started')}</td><td>${n('product_video_started')}</td><td>${n('add_to_cart')}</td><td>${n('checkout_started')}</td><td>${ordered.length}</td><td>${money(rev)}</td><td>${pct(ordered.length,view)}</td></tr>`}
 $('#lightboxPerformance').innerHTML=row('All Light Boxes',allLight)+lightboxIds.map(id=>row(window.CATALOGUE.products.find(p=>p.id===id)?.name||id,events.filter(e=>e.productId===id))).join('');
 const stages=[['Product views',count(events,'product_view',lightboxIds)],['Slider starts',count(events,'comparison_slider_started',lightboxIds)],['Adds to cart',count(events,'add_to_cart',lightboxIds)],['Checkout starts',count(events,'checkout_started')],['Verified orders',count(events,'order_placed')]];
 $('#funnel').innerHTML=stages.map(([name,n],i)=>`<article><span>${name}</span><b>${n}</b><small>${i?pct(n,stages[i-1][1])+' of previous stage':'recorded events'}</small></article>`).join('');
 const families=['Sticker Packs','Holographic Packs','Suncatcher Stickers','Fridge Magnets','Acrylic Posters','Custom Packages / Bundles'];$('#familyPerformance').innerHTML=families.map(family=>{const ids=new Set(window.CATALOGUE.products.filter(p=>p.categories.includes(family)).map(p=>p.id)),ev=events.filter(e=>ids.has(e.productId)),ordered=ev.filter(e=>e.name==='order_placed');return `<tr><td>${safe(family)}</td><td>${count(ev,'product_view')}</td><td>${count(ev,'wishlist_added')}</td><td>${count(ev,'add_to_cart')}</td><td>${ordered.length}</td><td>${money(ordered.reduce((s,e)=>s+Number(e.revenue||0),0))}</td></tr>`}).join('');
 const sessions=new Map();for(const e of events){if(!e.sessionId)continue;const item=sessions.get(e.sessionId)||{first:e.time,last:e.time,pages:new Set(),source:e.source,actions:0,device:e.device};item.last=e.time;if(e.name==='page_view')item.pages.add(e.path);else item.actions++;sessions.set(e.sessionId,item)}
 $('#sessionReport').innerHTML=sessions.size?`<table><thead><tr><th>Session</th><th>Last activity (IST)</th><th>Source</th><th>Device</th><th>Pages</th><th>Actions</th></tr></thead><tbody>${[...sessions].sort((a,b)=>sort==='oldest'?new Date(a[1].last)-new Date(b[1].last):new Date(b[1].last)-new Date(a[1].last)).slice(0,60).map(([id,v])=>`<tr><td>${safe(id.slice(0,8))}…</td><td>${new Date(v.last).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td><td>${safe(v.source||'direct')}</td><td>${safe(v.device||'unknown')}</td><td>${safe([...v.pages].join(', ')||'—')}</td><td>${v.actions}</td></tr>`).join('')}</tbody></table>`:'<p>No sessions in this period.</p>';
 const allOrders=events.filter(e=>e.name==='order_placed');$('#orderFeed').innerHTML=allOrders.length?allOrders.sort((a,b)=>sort==='oldest'?new Date(a.time)-new Date(b.time):new Date(b.time)-new Date(a.time)).slice(0,20).map(e=>`<p>${safe(e.orderId||'Order')} · ${safe(e.time)} · ${safe(e.productId||'')} · ${money(e.revenue)}</p>`).join(''):'No verified orders are recorded. PDF downloads and WhatsApp clicks are inquiries, not paid orders.';
 window.TPTAdminFiltered=[...events].sort((a,b)=>sort==='oldest'?new Date(a.time)-new Date(b.time):new Date(b.time)-new Date(a.time));
}
$('#period').addEventListener('change',render);['#dateFrom','#dateTo'].forEach(id=>$(id).addEventListener('change',()=>{$('#period').value='custom';render()}));$('#dateSort').addEventListener('change',render);$('#loadLive').addEventListener('click',load);$('#refreshAdmin').addEventListener('click',()=>live?load():(all=local(),render()));
$('#exportAnalytics').addEventListener('click',()=>{const fields=['time','name','sessionId','source','firstSource','device','path','productId','variantId'];const csv=[fields.join(','),...(window.TPTAdminFiltered||[]).map(e=>fields.map(k=>`"${String(e[k]??'').replaceAll('"','""')}"`).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='the-paper-theory-analytics.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)});
window.addEventListener('storage',e=>{if(!live&&e.key==='tpt-analytics-v1'){all=local();render()}});
$('#modeTitle').textContent='Browser-only analytics';$('#modeNote').textContent='Enter the manager password to load cross-visitor data after live analytics storage is configured. Until then, this page shows genuine events from this browser only.';render();
})();
