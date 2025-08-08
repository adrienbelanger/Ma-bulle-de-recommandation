const DATA_URL = '/data/videos.json';
const DATA_KEY = 'videosCache';
const MODEL_KEY = 'trainedModel';
const SETTINGS_KEY = 'recSettings';

const ls = typeof localStorage === 'undefined' ? {
  _data:{},
  getItem(k){ return this._data[k] ?? null; },
  setItem(k,v){ this._data[k] = String(v); },
  removeItem(k){ delete this._data[k]; }
} : localStorage;

let dataCache = null;
let vocab = [];
let idf = {};
let vectors = [];
let model = JSON.parse(ls.getItem(MODEL_KEY) || 'null');
let settings = JSON.parse(ls.getItem(SETTINGS_KEY) || '{}');

function tokenize(text){
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export async function loadData(){
  if(dataCache) return dataCache;
  const cached = ls.getItem(DATA_KEY);
  if(cached){
    dataCache = JSON.parse(cached);
    return dataCache;
  }
  const resp = await fetch(DATA_URL);
  dataCache = await resp.json();
  ls.setItem(DATA_KEY, JSON.stringify(dataCache));
  return dataCache;
}

export function buildVocab(videos){
  const df = {};
  vectors = [];
  videos.forEach(v => {
    const tokens = tokenize(v.title + ' ' + (v.tags||[]).join(' '));
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t]||0) + 1; });
    vectors.push({ id:v.id, category:v.category, views:v.views||0, likes:v.likes||0, tf });
    Object.keys(tf).forEach(t => { df[t] = (df[t]||0) + 1; });
  });
  vocab = Object.keys(df);
  const N = videos.length;
  idf = {};
  vocab.forEach(term => { idf[term] = Math.log(N/df[term]); });
  vectors = vectors.map(doc => {
    const vec = {};
    let norm = 0;
    Object.entries(doc.tf).forEach(([term,freq]) => {
      const weight = freq * idf[term];
      vec[term] = weight;
      norm += weight * weight;
    });
    return { ...doc, vec, norm: Math.sqrt(norm) };
  });
  return { vocab, idf, vectors };
}

export function train(cleanVideos){
  const built = buildVocab(cleanVideos);
  const classStats = {};
  const viewLogs = cleanVideos.map(v => Math.log10((v.views||1)));
  const gMean = viewLogs.reduce((a,b)=>a+b,0)/viewLogs.length;
  const gStd = Math.sqrt(viewLogs.reduce((a,b)=>a+(b-gMean)**2,0)/viewLogs.length);

  built.vectors.forEach(doc => {
    const lab = doc.category;
    if(!classStats[lab]) classStats[lab] = {count:0, centroid:{}, likePct:0, views:[]};
    const cs = classStats[lab];
    cs.count++;
    cs.likePct += (doc.likes||0)/(doc.views||1);
    cs.views.push(Math.log10(doc.views||1));
    Object.entries(doc.vec).forEach(([term,val]) => {
      cs.centroid[term] = (cs.centroid[term]||0) + val;
    });
  });

  const classes = {};
  Object.entries(classStats).forEach(([lab,cs]) => {
    const centroid = {};
    Object.entries(cs.centroid).forEach(([term,val]) => {
      centroid[term] = val / cs.count;
    });
    const norm = Math.sqrt(Object.values(centroid).reduce((s,v)=>s+v*v,0)) || 1;
    const vMean = cs.views.reduce((a,b)=>a+b,0)/cs.views.length;
    const vStd = Math.sqrt(cs.views.reduce((a,b)=>a+(b-vMean)**2,0)/cs.views.length);
    classes[lab] = { centroid, norm, likePct: cs.likePct / cs.count, views:{mean:vMean,std:vStd} };
  });

  model = { vocab: built.vocab, idf: built.idf, classes, globalViews:{mean:gMean,std:gStd} };
  ls.setItem(MODEL_KEY, JSON.stringify(model));
  return model;
}

export function rank(title, lambdaPop=0.5, k=3){
  if(!model){
    const stored = ls.getItem(MODEL_KEY);
    if(stored) model = JSON.parse(stored); else return [];
  }
  if(settings.lambda === undefined) settings.lambda = lambdaPop;
  lambdaPop = settings.lambda;
  ls.setItem(SETTINGS_KEY, JSON.stringify(settings));

  const tokens = tokenize(title);
  const tf = {};
  tokens.forEach(t => { if(model.idf[t]) tf[t] = (tf[t]||0) + 1; });
  let vec = {}, norm = 0;
  Object.entries(tf).forEach(([term,freq]) => {
    const w = freq * model.idf[term];
    vec[term] = w; norm += w*w;
  });
  norm = Math.sqrt(norm) || 1;

  const scores = vectors.map(doc => {
    let dot = 0;
    Object.keys(vec).forEach(term => { if(doc.vec[term]) dot += doc.vec[term]*vec[term]; });
    const cos = doc.norm ? dot/(doc.norm*norm) : 0;
    const pop = Math.log10(doc.views||1);
    return { id: doc.id, score: cos * (1 + lambdaPop * pop) };
  });

  return scores.sort((a,b)=>b.score-a.score).slice(0,k).map(s=>s.id);
}
