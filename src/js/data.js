const SESSION_KEY = 'laguna_hall_user';

const DB = {
  halls: {
    async all() { return await FB.getCollection('halls'); },
    async add(h) { return await FB.addDoc('halls', h); },
    async update(id, data) { await FB.updateDoc('halls', id, data); },
    async remove(id) { await FB.removeDoc('halls', id); }
  },

  users: {
    async all() { return await FB.getCollection('users'); },
    async add(u) { return await FB.addDoc('users', u); },
    async update(id, data) { await FB.updateDoc('users', id, data); },
    async remove(id) { await FB.removeDoc('users', id); },
    async findByEmail(email) {
      const all = await this.all();
      return all.find(u => (u.email || '').toLowerCase() === String(email).toLowerCase().trim());
    }
  },

  packages: {
    async all() { return await FB.getCollection('packages'); },
    async add(p) { return await FB.addDoc('packages', p); },
    async update(id, data) { await FB.updateDoc('packages', id, data); },
    async remove(id) { await FB.removeDoc('packages', id); }
  },

  addons: {
    async all() { return await FB.getCollection('addons'); },
    async add(a) { return await FB.addDoc('addons', a); },
    async update(id, data) { await FB.updateDoc('addons', id, data); },
    async remove(id) { await FB.removeDoc('addons', id); }
  },

  clients: {
    async all() { return await FB.getCollection('clients'); },
    async add(c) { return await FB.addDoc('clients', c); },
    async update(id, data) { await FB.updateDoc('clients', id, data); },
    async remove(id) { await FB.removeDoc('clients', id); }
  },

  bookings: {
    async all() { return await FB.getCollection('bookings'); },
    async add(b) { return await FB.addDoc('bookings', b); },
    async update(id, data) { await FB.updateDoc('bookings', id, data); },
    async remove(id) { await FB.removeDoc('bookings', id); },
    async byHall(hallId) {
      const all = await this.all();
      return all.filter(b => b.hallId === hallId);
    }
  },

  contracts: {
    async all() { return await FB.getCollection('contracts'); },
    async add(c) { return await FB.addDoc('contracts', c); },
    async update(id, data) { await FB.updateDoc('contracts', id, data); },
    async remove(id) { await FB.removeDoc('contracts', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.find(c => c.bookingId === bookingId);
    }
  },

  payments: {
    async all() { return await FB.getCollection('payments'); },
    async add(p) { return await FB.addDoc('payments', p); },
    async update(id, data) { await FB.updateDoc('payments', id, data); },
    async remove(id) { await FB.removeDoc('payments', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.filter(p => p.bookingId === bookingId);
    }
  },

  hall_expenses: {
    async all() { return await FB.getCollection('hall_expenses'); },
    async add(e) { return await FB.addDoc('hall_expenses', e); },
    async update(id, data) { await FB.updateDoc('hall_expenses', id, data); },
    async remove(id) { await FB.removeDoc('hall_expenses', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.filter(e => e.bookingId === bookingId);
    }
  },

  settings: {
    async get() {
      const all = await FB.getCollection('settings');
      const out = {};
      all.forEach(s => { out[s.key] = s.value; });
      return out;
    },
    async save(obj) {
      const existing = await FB.getCollection('settings');
      for (const key of Object.keys(obj)) {
        const found = existing.find(s => s.key === key);
        if (found) await FB.updateDoc('settings', found.id, { value: obj[key] });
        else await FB.addDoc('settings', { key, value: obj[key] });
      }
    }
  },

  audit: {
    async log(action, details) {
      const u = DB.session.get();
      const hallId = u && u.hallId ? u.hallId : (details && details.hallId ? details.hallId : null);
      try {
        await FB.addDoc('audit_logs', {
          hallId, action, details: details || {}, actor: u ? u.name : 'unknown',
          ts: Date.now()
        });
      } catch (e) { console.warn('[audit] failed:', e.message); }
    }
  },

  session: {
    get() {
      try { const s = sessionStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
    },
    set(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); },
    clear() { sessionStorage.removeItem(SESSION_KEY); },
    currentHallId() { const u = this.get(); return u ? u.hallId : null; }
  },

  isSuper() { const u = this.session.get(); return u && u.role === 'SuperAdmin'; },

  // ── Bootstrap: القاعات الافتراضية + أول مستخدم ──
  async seed() {
    const DEFAULT_HALLS = [
      { id: 'h1', name: 'القاعة الرئيسية', emoji: '🏛️', address: '', phone: '', active: 1 },
      { id: 'h2', name: 'قاعة روز', emoji: '🌹', address: '', phone: '', active: 1 },
      { id: 'h3', name: 'قاعة سكرة', emoji: '🎉', address: '', phone: '', active: 1 },
      { id: 'h4', name: 'قاعة المركب', emoji: '⛵', address: '', phone: '', active: 1 }
    ];
    const existingHalls = await this.halls.all();
    for (const h of DEFAULT_HALLS) {
      if (!existingHalls.find(x => x.id === h.id)) await this.halls.add(h);
    }

    const users = await this.users.all();
    if (users.length > 0) return;
    const uid = FB.getUid();
    const hallId = 'h1';
    const adminHashed = await PASSWORD_UTILS.hash('admin123');
    await this.users.add({
      id: 'u1', email: 'admin@laguna.com', name: 'مدير النظام',
      password: adminHashed, role: 'SuperAdmin', hallId, active: 1
    });
    if (uid) {
      try {
        const snap = await FB.getDb().collection('user_mappings').doc(uid).get();
        if (!snap.exists) {
          await FB.getDb().collection('user_mappings').doc(uid).set({
            userId: 'u1', role: 'SuperAdmin', hallId, email: 'admin@laguna.com', name: 'مدير النظام'
          });
        }
      } catch (e) { console.warn('[seed] mapping:', e.message); }
    }
    await this.audit.log('seed', { note: 'إنشاء النظام لأول مرة' });
  },

  fmt(n) {
    const num = Number(n);
    return (isNaN(num) ? 0 : num).toLocaleString('ar-EG') + ' ج.م';
  },

  todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
};
