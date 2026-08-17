const SESSION_KEY = 'laguna_hall_user';

// قراءة كولكشن بمنطق القاعة: السوبر أدمن يقرأ كل الداتا،
// مدير/محاسب/موظف يقرأ فقط دوكس قاعته (يحترم قواعد Firestore hall-scoped)
function hallScoped(name) {
  const u = DB.session.get();
  if (u && u.role === 'SuperAdmin') return FB.getCollection(name);
  const hid = u && u.hallId ? u.hallId : null;
  if (!hid) return FB.getCollection(name);
  return FB.getCollectionWhere(name, 'hallId', hid);
}

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
    async all() { return await hallScoped('packages'); },
    async add(p) { return await FB.addDoc('packages', p); },
    async update(id, data) { await FB.updateDoc('packages', id, data); },
    async remove(id) { await FB.removeDoc('packages', id); }
  },

  addons: {
    async all() { return await hallScoped('addons'); },
    async add(a) { return await FB.addDoc('addons', a); },
    async update(id, data) { await FB.updateDoc('addons', id, data); },
    async remove(id) { await FB.removeDoc('addons', id); }
  },

  clients: {
    async all() { return await hallScoped('clients'); },
    async add(c) { return await FB.addDoc('clients', c); },
    async update(id, data) { await FB.updateDoc('clients', id, data); },
    async remove(id) { await FB.removeDoc('clients', id); }
  },

  bookings: {
    async all() { return await hallScoped('bookings'); },
    async add(b) { return await FB.addDoc('bookings', b); },
    async update(id, data) { await FB.updateDoc('bookings', id, data); },
    async remove(id) { await FB.removeDoc('bookings', id); },
    async byHall(hallId) {
      const all = await this.all();
      return all.filter(b => b.hallId === hallId);
    }
  },

  contracts: {
    async all() { return await hallScoped('contracts'); },
    async add(c) { return await FB.addDoc('contracts', c); },
    async update(id, data) { await FB.updateDoc('contracts', id, data); },
    async remove(id) { await FB.removeDoc('contracts', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.find(c => c.bookingId === bookingId);
    }
  },

  payments: {
    async all() { return await hallScoped('payments'); },
    async add(p) { return await FB.addDoc('payments', p); },
    async update(id, data) { await FB.updateDoc('payments', id, data); },
    async remove(id) { await FB.removeDoc('payments', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.filter(p => p.bookingId === bookingId);
    }
  },

  hall_expenses: {
    async all() { return await hallScoped('hall_expenses'); },
    async add(e) { return await FB.addDoc('hall_expenses', e); },
    async update(id, data) { await FB.updateDoc('hall_expenses', id, data); },
    async remove(id) { await FB.removeDoc('hall_expenses', id); },
    async byBooking(bookingId) {
      const all = await this.all();
      return all.filter(e => e.bookingId === bookingId);
    }
  },

  settings: {
    async get(hallId) {
      const hid = hallId || DB.session.currentHallId();
      const all = hid ? await FB.getCollectionWhere('settings', 'hallId', hid) : await FB.getCollection('settings');
      const out = {};
      all.forEach(s => { out[s.key] = s.value; });
      return out;
    },
    async save(obj, hallId) {
      const hid = hallId || DB.session.currentHallId();
      const existing = hid ? await FB.getCollectionWhere('settings', 'hallId', hid) : await FB.getCollection('settings');
      for (const key of Object.keys(obj)) {
        const found = existing.find(s => s.key === key);
        if (found) await FB.updateDoc('settings', found.id, { value: obj[key] });
        else await FB.addDoc('settings', { key, value: obj[key], hallId: hid });
      }
    }
  },

  audit: {
    async all() { return await hallScoped('audit_logs'); },
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

  // ── Bootstrap: القاعات الحقيقية الثلاث + مستخدم النظام ──
  async seed() {
    const DEFAULT_HALLS = [
      {
        id: 'crystala', name: 'قاعة كريستالة للحفلات والمناسبات', emoji: '💎',
        address: 'ميت غمر - طريق ميت غمر المنصورة - بجوار بنزينة كالتكس',
        phone: '01224538998', capacity: 500, active: 1
      },
      {
        id: 'rose', name: 'قاعة روز للحفلات', emoji: '🌹',
        address: 'ميت غمر', phone: '', capacity: 1000, active: 1
      },
      {
        id: 'loshato', name: 'قاعة لوشاتو للحفلات', emoji: '💍',
        address: 'مول ذا كيدنج بارك - شارع الدويدار - أمام مستشفى سان بولا - حدائق القبة',
        phone: '01274841034', capacity: null, active: 1
      }
    ];
    const DEFAULT_MANAGERS = [
      { email: 'crystala@laguna.com', pass: 'crystala123', name: 'مدير قاعة كريستالة', hallId: 'crystala' },
      { email: 'rose@laguna.com', pass: 'rose123', name: 'مدير قاعة روز', hallId: 'rose' },
      { email: 'loshato@laguna.com', pass: 'loshato123', name: 'مدير قاعة لوشاتو', hallId: 'loshato' }
    ];
    const SEED_PACKAGES = [
      // ── قاعة روز: باقات متدرجة ──
      { hallId: 'rose', name: 'عرض أول', price: 25000, description: 'شو تورته + تورته 3 أدوار، فوتوجرافر وسيشن طول الحفل، كوشة، دانس فلور هيدروليك، دي جي طول الحفل، بيم دخان، بارات + بيم ليزر، فيديو ميكسر، 2 كاميرا مان واير لس، شاشة ليد اسكرين، سنتر بيس، سويت للعروسين، ركن VIP، فقرات FRINDES، فقرة الذكريات، Family Tables' },
      { hallId: 'rose', name: 'عرض ثاني', price: 27000, description: '10 كانز جيب + كل محتويات العرض الأول' },
      { hallId: 'rose', name: 'عرض ثالث', price: 29000, description: 'زفة دمياطي، 20 كانز جيب + كل محتويات العرض الأول' },
      { hallId: 'rose', name: 'عرض رابع', price: 31000, description: 'برومو فيديو، زفة دمياطي، تصوير طيارة، جست بوك، مياه + مناديل لكل تربيزة، 200 كانز جيب، شوفاير 4 أجهزة + كل محتويات العرض الأول' },
      // ── قاعة كريستالة: باقة أساسية واحدة (السعر يُحدد لاحقاً) ──
      {
        hallId: 'crystala', name: 'القائمة الأساسية', price: null,
        description: 'وحدة D.J، وحدة فيديو H.D، وحدة ليزر + دخان، كاميرا كرين، شاشة ليد اسكرين، استدج مضيء (منصة مضيئة)، كوشة على أعلى مستوى'
      }
    ];
    const SEED_ADDONS = [
      { hallId: 'crystala', name: 'تورتة 3 أدوار', price: null },
      { hallId: 'crystala', name: 'تورتة 5 أدوار', price: null },
      { hallId: 'crystala', name: 'فوتوجرافر وسيشن داخل القاعة', price: null },
      { hallId: 'crystala', name: 'فوتوجرافر وسيشن + برواز + ألبوم', price: null },
      { hallId: 'crystala', name: 'شو المارد', price: null },
      { hallId: 'crystala', name: 'شو سي السيد', price: null },
      { hallId: 'crystala', name: 'شو قلبى دليلى', price: null },
      { hallId: 'crystala', name: 'زفة شاعل', price: null },
      { hallId: 'crystala', name: 'شو البخور', price: null },
      { hallId: 'crystala', name: 'شو كاجولو', price: null },
      { hallId: 'crystala', name: 'زفة مشاعل', price: null },
      { hallId: 'crystala', name: 'زفة طبول', price: null },
      { hallId: 'crystala', name: 'شو هندى', price: null },
      { hallId: 'rose', name: 'شو فاير', price: null },
      { hallId: 'rose', name: 'زفة دمياطي', price: null },
      { hallId: 'rose', name: 'فنون شعبية', price: null },
      { hallId: 'rose', name: 'دبكة سوري', price: null },
      { hallId: 'rose', name: 'تصوير طيارة', price: null },
      { hallId: 'rose', name: 'تصوير برومو', price: null },
      { hallId: 'rose', name: 'عروض سيشن', price: null },
      { hallId: 'rose', name: 'باكدج مياه + مناديل', price: null },
      { hallId: 'rose', name: 'كانز', price: null },
      { hallId: 'rose', name: 'تورتة 5 أدوار', price: null },
      { hallId: 'rose', name: 'شاشة ليد اسكرين', price: null },
      { hallId: 'rose', name: 'جست بوك', price: null },
      { hallId: 'rose', name: 'دخول مأذون', price: null },
      { hallId: 'rose', name: 'رسوم ساعة إضافية', price: null },
      { hallId: 'rose', name: 'غرفة تجهيز عروسة', price: null },
      { hallId: 'rose', name: 'دراميز', price: null },
      { hallId: 'rose', name: 'دخول فرقة', price: null }
    ];
    const SEED_SETTINGS = {
      rose: {
        contract_terms: [
          'يُحدد مبلغ العربون لكل حجز على حدة عند التعاقد.',
          'إلغاء التعاقد خلال 15 يوم من موعد الحفل: تستحق القاعة كامل قيمة التعاقد.',
          'إلغاء التعاقد خلال 30 يوم من موعد الحفل: تستحق القاعة 50% من قيمة التعاقد.',
          'الإلغاء قبل 30 يوم من موعد الحفل: تستحق القاعة قيمة العربون المدفوع بالكامل (غير مسترد).',
          'الإلغاء قبل 72 ساعة من موعد الحفل: خصم كامل المبلغ.',
          'تأجيل الحفل: زيادة 20% على المبلغ المتفق عليه وطبقاً للمتاح.',
          'تأمين القاعة مبلغ 2000 جنيه — يُخصم في حال فقد أو إتلاف أي شيء داخل القاعة، ويُرد بعد الحفل بشرط تقديم أصل إيصال التأمين.',
          'لا يتم دخول مأكولات أو مشروبات من الخارج إلا بالاتفاق مع الإدارة.',
          'ممنوع إطلاق ألعاب أو أعيرة نارية حية أو صوتية داخل/خارج القاعة، ودخول خمور أو مخدرات.',
          'مقر الاختصاص: محاكم ميت غمر الكلية.'
        ].join('\n')
      },
      crystala: {
        contract_terms: [
          'الباقة الأساسية تشمل: وحدة D.J، وحدة فيديو H.D، وحدة ليزر + دخان، كاميرا كرين، شاشة ليد اسكرين، استدج مضيء (منصة مضيئة)، كوشة على أعلى مستوى.',
          'الفقرات الاستعراضية (شو المارد، شو سي السيد، شو قلبى دليلى، زفة شاعل، شو البخور، شو كاجولو، زفة مشاعل، زفة طبول، شو هندى) تُضاف حسب الطلب.',
          'الإضافات: تورتة 3 أدوار / تورتة 5 أدوار / فوتوجرافر وسيشن داخل القاعة / فوتوجرافر وسيشن + برواز + ألبوم.',
          'لا يُسمح بدخول مأكولات أو مشروبات من الخارج إلا بالاتفاق مع الإدارة.'
        ].join('\n')
      },
      loshato: {
        contract_terms: [
          'رسم حجز / ارتباط مبدئي بالحفل: 3000 جنيه.',
          'إلغاء من بدء التعاقد وحتى 30 يوم سابقين على الحفل: خصم 100% من قيمة رسم الحجز.',
          'الإلغاء خلال آخر 30 يوم قبل الحفل: خصم 20% مصاريف إدارية من إجمالي قيمة العقد بعد خصم قيمة إيجار الصالة.',
          'الإلغاء قبل 15 يوم من موعد الحفل: خصم كامل قيمة العقد.',
          'تأمين: 2000 جنيه يُصرف بعد أسبوع من انتهاء الحفل للعضو المتعاقد بشرط تقديم صورة العقد وصورة إيصال التأمين.',
          'في حالة انقطاع الكهرباء العمومي يتم تشغيل الإضاءة فقط دون أجهزة التكييف.',
          'التزام الطرف الثاني بالتواجد من بداية الحفل حتى نهايته ومسؤوليته عن تصرفات جميع المدعوين.',
          'ممنوع: أسلحة نارية بأنواعها وحتى الصوتية، النقوط، الخمور أو المخدرات، التدخين داخل القاعات.',
          'في حالة سرفيس التورتة (تقديمها من مصدر خارجي) تُدفع رسوم لمكتب الحفلات.',
          'إدارة الفندق غير مسؤولة عن انتظار زفة العروسين أكثر من ساعة بعد الموعد المحدد.',
          'الأصناف الفاقدة أو التالفة أثناء الحفل بسبب المدعوين تُخصم من التأمين.',
          'مقر الاختصاص: محكمة القاهرة الابتدائية.'
        ].join('\n')
      }
    };

    const existingHalls = await this.halls.all();
    for (const h of DEFAULT_HALLS) {
      if (!existingHalls.find(x => x.id === h.id)) await this.halls.add(h);
    }
    // حذف قاعات الاختبار القديمة (h1..h4) إن كانت موجودة
    for (const oldId of ['h1', 'h2', 'h3', 'h4']) {
      if (existingHalls.find(x => x.id === oldId)) {
        try { await this.halls.remove(oldId); } catch (e) { console.warn('[seed] remove hall:', oldId, e.message); }
      }
    }

    // باقات وإضافات وشروط كل قاعة (تُضاف إن لم توجد)
    try {
      const existingPackages = await this.packages.all();
      for (const p of SEED_PACKAGES) {
        if (!existingPackages.find(x => x.hallId === p.hallId && x.name === p.name)) {
          await this.packages.add({ id: 'pk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...p, ts: Date.now() });
        }
      }
    } catch (e) { console.warn('[seed] packages:', e.message); }
    try {
      const existingAddons = await this.addons.all();
      for (const a of SEED_ADDONS) {
        if (!existingAddons.find(x => x.hallId === a.hallId && x.name === a.name)) {
          await this.addons.add({ id: 'ad_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...a, ts: Date.now() });
        }
      }
    } catch (e) { console.warn('[seed] addons:', e.message); }
    try {
      for (const hid of Object.keys(SEED_SETTINGS)) {
        await this.settings.save(SEED_SETTINGS[hid], hid);
      }
    } catch (e) { console.warn('[seed] settings:', e.message); }

    const users = await this.users.all();
    for (const m of DEFAULT_MANAGERS) {
      const found = users.find(u => (u.email || '').toLowerCase() === m.email);
      if (found) {
        // المدراء القدامى المرتبطين بقاعات الاختبار القديمة (h1..h4) يُحوَّلون لقاعاتهم الجديدة
        if (['h1', 'h2', 'h3', 'h4'].includes(found.hallId)) {
          try { await this.users.update(found.id, { hallId: m.hallId }); } catch (e) { console.warn('[seed] fix manager hall:', e.message); }
        }
        continue;
      }
      await this.users.add({
        id: 'm_' + m.hallId,
        email: m.email, name: m.name,
        password: await PASSWORD_UTILS.hash(m.pass),
        role: 'HallManager', hallId: m.hallId, active: 1
      });
    }

    const superUser = users.find(u => u.role === 'SuperAdmin');
    if (superUser) {
      if (superUser.hallId) await this.users.update(superUser.id, { hallId: null });
      return;
    }
    const uid = FB.getUid();
    const adminHashed = await PASSWORD_UTILS.hash('admin123');
    await this.users.add({
      id: 'u1', email: 'admin@laguna.com', name: 'مدير النظام',
      password: adminHashed, role: 'SuperAdmin', hallId: null, active: 1
    });
    if (uid) {
      try {
        const snap = await FB.getDb().collection('user_mappings').doc(uid).get();
        if (!snap.exists) {
          await FB.getDb().collection('user_mappings').doc(uid).set({
            userId: 'u1', role: 'SuperAdmin', hallId: null, email: 'admin@laguna.com', name: 'مدير النظام'
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

  // سعر قد يكون null أو غير مسجل بعد — نعرض "غير محدد"
  fmtPrice(n) {
    if (n === null || n === undefined || n === '') return 'غير محدد';
    return this.fmt(n);
  },

  todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
};
