const crypto = require('node:crypto');
const contentPath = 'js/catalogue-updates.js';
const empty = {stickers:[],reels:[]};
const codePattern = /^[A-Z0-9-]{3,24}$/;
const reelPattern = /^https:\/\/(www\.)?instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/;
const imagePattern = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/;
const localImagePattern = /^assets\/(catalogue|stickers)\/[A-Za-z0-9_./-]+\.(webp|png|jpe?g)$/;
function settings() {
  const repo = process.env.CATALOGUE_REPO || '';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return null;
  const token = process.env.CATALOGUE_GITHUB_TOKEN, password = process.env.CATALOGUE_ADMIN_PASSWORD;
  return token && password ? {repo,token,password,branch:process.env.CATALOGUE_BRANCH || 'main'} : null;
}
function auth(given,expected) {
  if (typeof given !== 'string' || !given || given.length > 512) return false;
  const a=crypto.createHash('sha256').update(given).digest(), b=crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
}
function validate(body) {
  if (!body || JSON.stringify(body).length > 3000000 || !Array.isArray(body.stickers) || !Array.isArray(body.reels) || body.stickers.length > 500 || body.reels.length > 12 || (body.hiddenCodes && !Array.isArray(body.hiddenCodes))) throw Error('Invalid catalogue size');
  const codes = new Set();
  for (const item of body.stickers) {
    if (!codePattern.test(item.code) || codes.has(item.code) || typeof item.name !== 'string' || item.name.length > 80 || typeof item.category !== 'string' || item.category.length > 40 || typeof item.image !== 'string' || item.image.length > 400000 || !(imagePattern.test(item.image) || localImagePattern.test(item.image)) || item.image.includes('..')) throw Error('Invalid sticker entry');
    codes.add(item.code);
  }
  for (const item of body.reels) if (!reelPattern.test(item.url || '') || String(item.title || '').length > 80) throw Error('Invalid Instagram URL');
  const hiddenCodes=[...new Set(body.hiddenCodes || [])];
  if (hiddenCodes.length > 500 || hiddenCodes.some(code => !codePattern.test(code))) throw Error('Invalid hidden sticker code');
  return {stickers:body.stickers.map(({code,name,category,image})=>({code,name,category,pack:'New Arrivals',pack_id:'PACK-OWNER',image})),reels:body.reels.map(({url,title})=>({url,title:title || ''})),hiddenCodes};
}
async function github(config,method,content,sha) {
  const url=`https://api.github.com/repos/${config.repo}/contents/${contentPath}`;
  const options={method,headers:{Authorization:`Bearer ${config.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'The-Paper-Theory-Catalogue'}};
  if (method==='PUT') {options.headers['Content-Type']='application/json';options.body=JSON.stringify({message:'Update sticker catalogue from owner manager',content:Buffer.from(content).toString('base64'),branch:config.branch,...(sha?{sha}:{})});}
  const response=await fetch(method==='GET'?`${url}?ref=${encodeURIComponent(config.branch)}`:url,options);
  const payload=await response.json().catch(()=>({}));
  if (response.status===404 && method==='GET') return null;
  if (!response.ok) throw Error(`Repository request failed (${response.status})`);
  return payload;
}
function parseFile(file) {
  if (!file) return {...empty};
  const text=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
  const match=text.match(/window\.TPT_CATALOGUE_UPDATES\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw Error('Catalogue file format is invalid');
  return validate(JSON.parse(match[1]));
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const config=settings();
  if (!config) return res.status(503).json({error:'Live catalogue is not configured'});
  try {
    if (req.method==='GET') { const file=await github(config,'GET'); return res.status(200).json({data:parseFile(file),live:true}); }
    if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
    if (!auth(req.headers['x-catalogue-secret'],config.password)) return res.status(401).json({error:'Incorrect manager password'});
    const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const data=validate(input);
    const file=await github(config,'GET');
    const content='/* The Paper Theory owner catalogue update */\nwindow.TPT_CATALOGUE_UPDATES = '+JSON.stringify(data,null,2)+';\n';
    await github(config,'PUT',content,file?.sha);
    return res.status(200).json({data,live:true});
  } catch (error) { return res.status(400).json({error:error.message || 'Could not update catalogue'}); }
};
module.exports._test = {validate,parseFile,auth};
