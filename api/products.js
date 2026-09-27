const crypto = require('node:crypto');
const path = 'js/product-updates.js';
const code = /^[A-Z0-9-]{3,32}$/;
const variantCode = /^[A-Za-z0-9-]{2,40}$/;
const image = /^(?:data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+|assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g))$/;
const text = (value,max=2000) => typeof value === 'string' && value.length > 0 && value.length <= max;
function config() {
  const repo=process.env.CATALOGUE_REPO || '', token=process.env.CATALOGUE_GITHUB_TOKEN, password=process.env.CATALOGUE_ADMIN_PASSWORD;
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) && token && password ? {repo,token,password,branch:process.env.CATALOGUE_BRANCH || 'main'} : null;
}
function authorized(given,expected) {
  if (typeof given !== 'string' || !given || given.length > 512) return false;
  const a=crypto.createHash('sha256').update(given).digest(),b=crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
}
function validate(input) {
  if (!input || JSON.stringify(input).length > 3500000 || !Array.isArray(input.upserts) || !Array.isArray(input.hiddenIds) || input.upserts.length > 100 || input.hiddenIds.length > 100) throw Error('Invalid product update size');
  const ids=new Set();
  const upserts=input.upserts.map(item=>{
    if (!code.test(item.id) || ids.has(item.id) || !text(item.name,100) || !text(item.theme,80) || !text(item.description,2500) || !Array.isArray(item.categories) || !item.categories.length || item.categories.length > 4 || item.categories.some(v=>!text(v,70)) || !['order','soon','enquire','quote'].includes(item.status) || !Array.isArray(item.images) || item.images.length > 8 || item.images.some(v=>typeof v !== 'string' || v.length > 400000 || !image.test(v) || v.includes('..')) || !Array.isArray(item.variants) || !item.variants.length || item.variants.length > 12) throw Error('Invalid product details');
    ids.add(item.id);
    const variantIds=new Set();
    const variants=item.variants.map(v=>{
      if (!variantCode.test(v.id) || variantIds.has(v.id) || !text(v.size,100) || !text(v.finish,100) || (v.price !== null && (!Number.isInteger(v.price) || v.price < 0 || v.price > 1000000)) || (v.image && (typeof v.image !== 'string' || v.image.length > 400000 || !image.test(v.image) || v.image.includes('..')))) throw Error('Invalid product variant');
      variantIds.add(v.id);
      return {id:v.id,size:v.size,finish:v.finish,price:v.price,image:v.image || item.images[0] || ''};
    });
    return {id:item.id,name:item.name,theme:item.theme,description:item.description,categories:item.categories,status:item.status,images:item.images,variants};
  });
  const hiddenIds=[...new Set(input.hiddenIds)];
  if (hiddenIds.some(id=>!code.test(id))) throw Error('Invalid hidden product');
  return {upserts,hiddenIds};
}
async function github(cfg,method,content,sha) {
  const url=`https://api.github.com/repos/${cfg.repo}/contents/${path}`;
  const options={method,headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'The-Paper-Theory-Products'}};
  if(method==='PUT'){options.headers['Content-Type']='application/json';options.body=JSON.stringify({message:'Update products from owner manager',content:Buffer.from(content).toString('base64'),branch:cfg.branch,...(sha?{sha}:{})});}
  const response=await fetch(method==='GET'?`${url}?ref=${encodeURIComponent(cfg.branch)}`:url,options);
  const body=await response.json().catch(()=>({}));
  if(response.status===404 && method==='GET')return null;
  if(!response.ok)throw Error(`Repository request failed (${response.status})`);
  return body;
}
function parse(file) {
  if(!file)return {upserts:[],hiddenIds:[]};
  const source=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
  const match=source.match(/window\.TPT_PRODUCT_UPDATES\s*=\s*([\s\S]*);\s*$/);
  if(!match)throw Error('Product update file format is invalid');
  return validate(JSON.parse(match[1]));
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const cfg=config();
  if(!cfg)return res.status(503).json({error:'Live product manager is not configured'});
  try{
    if(req.method==='GET')return res.status(200).json({data:parse(await github(cfg,'GET')),live:true});
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    if(!authorized(req.headers['x-catalogue-secret'],cfg.password))return res.status(401).json({error:'Incorrect manager password'});
    const data=validate(typeof req.body==='string'?JSON.parse(req.body):req.body);
    const existing=await github(cfg,'GET');
    const source='/* The Paper Theory product updates */\nwindow.TPT_PRODUCT_UPDATES = '+JSON.stringify(data,null,2)+';\n';
    await github(cfg,'PUT',source,existing?.sha);
    return res.status(200).json({data,live:true});
  }catch(error){return res.status(400).json({error:error.message || 'Could not publish products'});}
};
module.exports._test={validate,parse,authorized};
