export function train(data, settings={}) {
  const shuffled = data.slice().sort(() => Math.random() - 0.5);
  const split = Math.floor(shuffled.length * 0.8);
  const trainSet = shuffled.slice(0, split);
  const testSet = shuffled.slice(split);

  const vocab = [], word2idx = {};
  function tokens(s) {
    return s.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿñæœ]+/).filter(Boolean);
  }
  function addTokens(title) {
    for (const w of tokens(title)) {
      if (word2idx[w] === undefined) {
        word2idx[w] = vocab.length;
        vocab.push(w);
      }
    }
  }
  trainSet.forEach(r => addTokens(r.title));

  function vec(title) {
    const v = new Uint8Array(vocab.length);
    for (const w of tokens(title)) {
      const i = word2idx[w];
      if (i !== undefined) v[i] = 1;
    }
    return v;
  }
  const sums = {}, counts = {};
  for (const r of trainSet) {
    const lab = r.label || r.category;
    if (!lab) continue;
    const v = vec(r.title);
    if (!sums[lab]) { sums[lab] = new Float32Array(vocab.length); counts[lab] = 0; }
    for (let i = 0; i < v.length; i++) sums[lab][i] += v[i];
    counts[lab]++;
  }
  const centroids = {}, centroidNorm = {};
  for (const lab in sums) {
    for (let i = 0; i < vocab.length; i++) sums[lab][i] /= counts[lab];
    centroids[lab] = sums[lab];
    let n = 0;
    for (let i = 0; i < vocab.length; i++) if (centroids[lab][i] > 0) n++;
    centroidNorm[lab] = Math.sqrt(n);
  }

  function cosine(a, b, nB) {
    let dot = 0, nA = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i]) {
        nA++;
        if (b[i]) dot++;
      }
    }
    if (nA === 0 || nB === 0) return 0;
    return dot / Math.sqrt(nA * nB);
  }
  function predictInner(title) {
    const v = vec(title);
    let best = null, bestScore = -1;
    for (const lab in centroids) {
      const s = cosine(v, centroids[lab], centroidNorm[lab]);
      if (s > bestScore) { bestScore = s; best = lab; }
    }
    return best;
  }
  let correct = 0; const preds = [];
  for (const r of testSet) {
    const cat = predictInner(r.title);
    preds.push(cat);
    if (cat === (r.label || r.category)) correct++;
  }
  const precision = testSet.length ? correct / testSet.length : 0;
  const recall = precision;
  const diversity = preds.length ? (new Set(preds).size / preds.length) : 0;

  const model = { vocab, word2idx, centroids, centroidNorm, settings };
  return { model, metrics: { precision, recall, diversity } };
}

export function predict(model, title) {
  const { vocab, word2idx, centroids, centroidNorm } = model;
  function tokens(s) {
    return s.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿñæœ]+/).filter(Boolean);
  }
  function vec(title) {
    const v = new Uint8Array(vocab.length);
    for (const w of tokens(title)) {
      const i = word2idx[w];
      if (i !== undefined) v[i] = 1;
    }
    return v;
  }
  function cosine(a, b, nB) {
    let dot = 0, nA = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i]) {
        nA++;
        if (b[i]) dot++;
      }
    }
    if (nA === 0 || nB === 0) return 0;
    return dot / Math.sqrt(nA * nB);
  }
  const v = vec(title);
  let best = null, bestScore = -1;
  for (const lab in centroids) {
    const s = cosine(v, centroids[lab], centroidNorm[lab]);
    if (s > bestScore) { bestScore = s; best = lab; }
  }
  return best;
}
