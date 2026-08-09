const REVIEWS = (() => {
  let app = null;
  function init() {
    if (!app) app = firebase.initializeApp(REVIEWS_FIREBASE_CONFIG, 'reviews');
    return app;
  }
  async function get() {
    try {
      const a = init();
      const db = firebase.firestore(a);
      db.settings({ merge: true });
      const snap = await db.collection('reviews').orderBy('createdAt', 'desc').get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (e) {
      console.warn('[reviews] read failed:', e.message);
      return [];
    }
  }
  return { get };
})();
