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
})();
