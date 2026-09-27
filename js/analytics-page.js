(()=>{
'use strict';
const sessionKey='tpt-session-v1',analyticsKey='tpt-analytics-v1';
const sessionId=sessionStorage.getItem(sessionKey)||crypto.randomUUID();sessionStorage.setItem(sessionKey,sessionId);
const params=new URLSearchParams(location.search),source=params.get('utm_source')||(document.referrer?new URL(document.referrer).hostname:'direct'),firstSource=localStorage.getItem('tpt-first-source-v1')||source;localStorage.setItem('tpt-first-source-v1',firstSource);
const item={name:'page_view',time:new Date().toISOString(),sessionId,source,firstSource,path:location.pathname,device:innerWidth<700?'mobile':innerWidth<1024?'tablet':'desktop'};
try{const list=JSON.parse(localStorage.getItem(analyticsKey))||[];list.push(item);localStorage.setItem(analyticsKey,JSON.stringify(list.slice(-5000)))}catch{}
if(location.protocol==='https:'||location.hostname==='localhost')fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),keepalive:true}).catch(()=>{});
})();
