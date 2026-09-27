const crypto=require('node:crypto');
const KEY='tpt:events:v1';
const allowed=new Set(['page_view','product_view','comparison_slider_started','comparison_slider_completed','light_on_viewed','light_off_viewed','product_video_started','product_video_completed','remote_demo_viewed','dimensions_viewed','delivery_checked','add_to_cart','buy_now_clicked','wishlist_added','product_shared','related_product_clicked','bundle_clicked','checkout_started','faq_opened','instagram_clicked','whatsapp_clicked','catalogue_selection','sheet_export']);
function config(){const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,password=process.env.CATALOGUE_ADMIN_PASSWORD;return url&&/^https:\/\//.test(url)&&token&&password?{url:url.replace(/\/$/,''),token,password}:null}
function authorized(given,expected){if(typeof given!=='string'||!given||given.length>512)return false;return crypto.timingSafeEqual(crypto.createHash('sha256').update(given).digest(),crypto.createHash('sha256').update(expected).digest())}
const short=(value,max=80)=>typeof value==='string'?value.slice(0,max).replace(/[<>]/g,''):'';
function clean(data){if(!data||!allowed.has(data.name)||!/^[-\w]{8,80}$/.test(data.sessionId||''))throw Error('Invalid event');return {name:data.name,time:new Date().toISOString(),sessionId:data.sessionId,source:short(data.source),firstSource:short(data.firstSource),path:short(data.path,120),device:['mobile','tablet','desktop'].includes(data.device)?data.device:'unknown',productId:short(data.productId,40),variantId:short(data.variantId,40),itemCount:Number.isInteger(data.itemCount)?Math.min(100,data.itemCount):undefined};}
async function redis(cfg,commands){const response=await fetch(`${cfg.url}/multi-exec`,{method:'POST',headers:{Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json'},body:JSON.stringify(commands)});const result=await response.json();if(!response.ok||!Array.isArray(result)||result.some(x=>x.error))throw Error('Analytics storage unavailable');return result.map(x=>x.result)}
module.exports=async function handler(req,res){res.setHeader('Cache-Control','no-store');const cfg=config();if(!cfg)return res.status(503).json({error:'Live analytics not configured'});
 try{
  if(req.method==='GET'){
   if(!authorized(req.headers['x-catalogue-secret'],cfg.password))return res.status(401).json({error:'Incorrect password'});
   const [entries]=await redis(cfg,[['LRANGE',KEY,0,4999]]);
   return res.status(200).json({events:(entries||[]).map(value=>{try{return JSON.parse(value)}catch{return null}}).filter(Boolean),live:true,retained:5000});
  }
  if(req.method==='POST'){
   const origin=req.headers.origin;if(origin){const host=req.headers.host;if(!host||new URL(origin).host!==host)return res.status(403).json({error:'Origin rejected'})}
   if(JSON.stringify(req.body||{}).length>2000)return res.status(413).json({error:'Event too large'});
   const event=clean(typeof req.body==='string'?JSON.parse(req.body):req.body);
   const client=short(req.headers['x-forwarded-for']?.split(',')[0]||'unknown',80);
   const key='tpt:rate:'+new Date().toISOString().slice(0,10)+':'+crypto.createHash('sha256').update(client).digest('hex').slice(0,24);
   const [hits]=await redis(cfg,[['INCR',key],['EXPIRE',key,90000]]);
   if(Number(hits)>200)return res.status(429).json({error:'Rate limit exceeded'});
   await redis(cfg,[['LPUSH',KEY,JSON.stringify(event)],['LTRIM',KEY,0,4999]]);
   return res.status(202).json({ok:true});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(error){return res.status(400).json({error:error.message})}
};
module.exports._test={clean,authorized};
