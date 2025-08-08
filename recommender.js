export async function loadData() {
  const res = await fetch('public/data/videos.json');
  const videos = await res.json();
  const trainData = [];
  const testData = [];
  const recVid = {};
  for (const v of videos) {
    if (Array.isArray(v.tags)) {
      if (v.tags.includes('train')) {
        trainData.push({ title: v.title, label: v.category });
      }
      if (v.tags.includes('test')) {
        testData.push({ title: v.title, label: v.category });
      }
      if (v.tags.includes('rec')) {
        recVid[v.category] = v.title;
      }
    }
  }
  return { trainData, testData, recVid };
}
