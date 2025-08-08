
const rec = (() => {
  const state = {
    data: null,
    vocab: [],
    word2idx: {},
    centroids: {},
    centroidNorm: {}
  };

  function tokens(s) {
    return s.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿñæœ]+/).filter(Boolean);
  }

  function buildVocab(train) {
    for (const r of train) {
      for (const w of tokens(r.title)) {
        if (state.word2idx[w] === undefined) {
          state.word2idx[w] = state.vocab.length;
          state.vocab.push(w);
        }
      }
    }
  }

  function vecFromTitle(t) {
    const v = new Uint8Array(state.vocab.length);
    for (const w of tokens(t)) {
      const i = state.word2idx[w];

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


  function trainModel(train) {
    buildVocab(train);
    const sums = {}, counts = {};
    for (const r of train) {
      const v = vecFromTitle(r.title);
      const lab = r.label;
      if (!sums[lab]) {
        sums[lab] = new Float32Array(state.vocab.length);
        counts[lab] = 0;
      }
      for (let i = 0; i < v.length; i++) sums[lab][i] += v[i];
      counts[lab]++;
    }
    for (const lab in sums) {
      for (let i = 0; i < state.vocab.length; i++) sums[lab][i] /= counts[lab];
      state.centroids[lab] = sums[lab];
      let n = 0;
      for (let i = 0; i < state.vocab.length; i++) if (state.centroids[lab][i] > 0) n++;
      state.centroidNorm[lab] = Math.sqrt(n);
    }
  }

  async function loadData() {
    if (state.data) return state.data;
    const resp = await fetch('videos.json');
    state.data = await resp.json();
    trainModel(state.data.train);
    return state.data;
  }

  function rank(title, k = 3) {
    if (!state.data) throw new Error('call loadData() first');
    const v = vecFromTitle(title);
    const scores = [];
    for (const cat in state.centroids) {
      const s = cosine(v, state.centroids[cat], state.centroidNorm[cat]);
      scores.push({ cat, score: s });
    }
    scores.sort((a, b) => b.score - a.score);
    const res = [];
    for (const { cat } of scores) {
      const vid = state.data.videos.find(v => v.category === cat);
      if (vid) res.push(vid.id);
      if (res.length >= k) break;
    }
    return res;
  }

  return { loadData, rank };
})();


