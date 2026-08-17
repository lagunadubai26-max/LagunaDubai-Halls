(function () {
  const u = guard();
  if (!u) return;

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  document.getElementById('saveTerms').onclick = async () => {
    await DB.settings.save({ contract_terms: document.getElementById('setTerms').value });
    await DB.audit.log('settings_terms_update', {});
    toast('تم حفظ الشروط الثابتة');
  };

  document.getElementById('saveHall').onclick = async () => {
    const name = document.getElementById('setName').value.trim();
    if (!name) return toast('اسم القاعة مطلوب', 'error');
    await DB.halls.update(u.hallId, {
      name, address: document.getElementById('setAddress').value.trim(), phone: document.getElementById('setPhone').value.trim()
    });
    u.hallName = name;
    DB.session.set(u);
    toast('تم حفظ بيانات القاعة');
  };

  document.getElementById('savePass').onclick = async () => {
    const pass = document.getElementById('newPass').value;
    if (pass.length < 4) return toast('كلمة المرور قصيرة جداً', 'error');
    const users = await DB.users.all();
    const me = users.find(x => x.id === u.id);
    if (me) {
      await DB.users.update(me.id, { password: await PASSWORD_UTILS.hash(pass) });
      await DB.audit.log('password_change', {});
      toast('تم تغيير كلمة المرور');
      document.getElementById('newPass').value = '';
    }
  };

  (async () => {
    const settings = await DB.settings.get();
    document.getElementById('setTerms').value = settings.contract_terms || '';
    const halls = await DB.halls.all();
    const h = halls.find(x => x.id === u.hallId);
    if (h) {
      document.getElementById('setName').value = h.name || '';
      document.getElementById('setAddress').value = h.address || '';
      document.getElementById('setPhone').value = h.phone || '';
    }
  })();

  // ── النسخ الاحتياطي والاستعادة ──
  const BACKUP_COLLECTIONS = ['bookings', 'payments', 'contracts', 'packages', 'addons', 'clients', 'hall_expenses', 'halls', 'users', 'settings', 'audit_logs'];

  document.getElementById('backupBtn').onclick = async () => {
    toast('جاري تجميع البيانات...');
    const data = { exportedAt: new Date().toISOString(), app: 'halls-system' };
    for (const c of BACKUP_COLLECTIONS) {
      try { data[c] = await FB.getCollection(c); } catch (e) { console.warn('[backup]', c, e); data[c] = []; }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup-' + DB.todayKey() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('تم تصدير النسخة الاحتياطية');
  };

  document.getElementById('restoreBtn').onclick = () => document.getElementById('restoreFile').click();
  document.getElementById('restoreFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) { return; }
    let data;
    try { data = JSON.parse(await file.text()); }
    catch (err) { toast('ملف غير صالح — يجب أن يكون JSON', 'error'); e.target.value = ''; return; }
    if (!confirm('سيتم مسح كل البيانات الحالية واستبدالها بمحتوى النسخة. متابعة؟')) { e.target.value = ''; return; }
    const db = FB.getDb();
    const pending = [];
    const flush = async () => {
      const batch = db.batch();
      for (const item of pending) batch.set(db.collection(item.c).doc(item.id), item.rest);
      await batch.commit();
    };
    let count = 0;
    try {
      // مسح الكولكشنز أولاً ثم الكتابة من النسخة
      for (const c of BACKUP_COLLECTIONS) {
        const existing = await FB.getCollection(c);
        for (let i = 0; i < existing.length; i += 400) {
          const chunk = existing.slice(i, i + 400);
          const batch = db.batch();
          chunk.forEach(doc => batch.delete(db.collection(c).doc(doc.id)));
          await batch.commit();
        }
      }
      for (const c of BACKUP_COLLECTIONS) {
        const docs = data[c];
        if (!Array.isArray(docs)) continue;
        for (const doc of docs) {
          const { id, ...rest } = doc;
          pending.push({ c, id, rest });
          count++;
          if (pending.length >= 400) { await flush(); pending.length = 0; }
        }
      }
      if (pending.length) await flush();
      await DB.audit.log('settings_restore', { count });
      toast('تمت الاستعادة: ' + count + ' سجل');
    } catch (err) {
      toast('خطأ أثناء الاستعادة: ' + err.message, 'error');
    }
    e.target.value = '';
  };
})();
