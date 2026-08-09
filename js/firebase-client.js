const FB = (() => {
  let db;
  let uid = null;
  let _initPromise = null;

  async function init() {
    if (db) return;
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      const app = firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore(app);
      db.settings({ merge: true });
      try {
        const cred = await firebase.auth(app).signInAnonymously();
        uid = cred.user.uid;
      } catch (e) {
        console.warn('[firebase] anonymous auth failed:', e.message);
      }
    })();
    try {
      await _initPromise;
    } catch (e) {
      _initPromise = null;
      throw e;
    }
  }

  async function ensure() { await init(); }

  function docId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2);
  }

  async function getCollection(name) {
    await ensure();
    const snap = await db.collection(name).orderBy('__name__', 'asc').get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  }

  async function addDoc(name, data) {
    await ensure();
    const id = data.id || docId();
    const obj = { ...data, id };
    if (uid) obj._uid = uid;
    await db.collection(name).doc(id).set(obj);
    return obj;
  }

  async function updateDoc(name, id, data) {
    await ensure();
    await db.collection(name).doc(id).update(data);
  }

  async function removeDoc(name, id) {
    await ensure();
    await db.collection(name).doc(id).delete();
  }

  async function onCollection(name, callback) {
    await ensure();
    return db.collection(name).orderBy('__name__', 'asc').onSnapshot(snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      callback(items);
    });
  }

  async function runTransaction(updateFn) {
    await ensure();
    return db.runTransaction(updateFn);
  }

  function getUid() { return uid; }
  function getDb() { return db; }

  return { getCollection, addDoc, updateDoc, removeDoc, onCollection, runTransaction, getUid, getDb };
})();
