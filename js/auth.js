(async function () {
  const msgEl = document.getElementById('authMsg');
  const stored = DB.session.get();
  if (stored) {
    if (stored.role === 'SuperAdmin' && !stored.hallId) { window.location.href = 'hall-select.html'; return; }
    window.location.href = 'index.html';
    return;
  }

  try {
    await DB.seed();
  } catch (e) {
    console.warn('[auth] seed:', e.message);
  }

  const btn = document.getElementById('loginBtn');
  btn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    if (!email || !pass) { flash('يرجى إدخال البريد وكلمة المرور', 'error'); return; }
    btn.disabled = true;
    flash('جاري تسجيل الدخول...', 'loading');
    try {
      await FB.ensure();
      const user = await DB.users.findByEmail(email);
      if (!user || !user.active) throw new Error('لا يوجد حساب بهذا البريد');
      const ok = await PASSWORD_UTILS.verify(pass, user.password);
      if (!ok) throw new Error('كلمة المرور غير صحيحة');
      const hall = user.hallId ? (await DB.halls.all()).find(h => h.id === user.hallId) : null;
      const session = {
        id: user.id, email: user.email, name: user.name, role: user.role,
        hallId: user.role === 'SuperAdmin' ? null : user.hallId,
        hallName: user.role === 'SuperAdmin' ? null : (hall ? hall.name : '')
      };
      DB.session.set(session);
      const uid = FB.getUid();
      if (uid) {
        try {
          const snap = await FB.getDb().collection('user_mappings').doc(uid).get();
          const desired = { userId: user.id, role: user.role, hallId: session.hallId, email: user.email, name: user.name };
          if (!snap.exists) await FB.getDb().collection('user_mappings').doc(uid).set(desired);
          else await FB.getDb().collection('user_mappings').doc(uid).update(desired);
        } catch (e) { console.warn('[auth] mapping:', e.message); }
      }
      await DB.audit.log('login', { email });
      if (user.role === 'SuperAdmin') window.location.href = 'hall-select.html';
      else window.location.href = 'index.html';
    } catch (e) {
      flash(e.message || 'خطأ في تسجيل الدخول', 'error');
      btn.disabled = false;
    }
  });

  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

  function flash(text, type) {
    msgEl.className = 'auth-msg ' + type;
    msgEl.textContent = text;
  }
})();
