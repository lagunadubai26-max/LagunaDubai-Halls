(async function () {
  const msgEl = document.getElementById('authMsg');
  const stored = DB.session.get();
  if (stored) {
    if (stored.role === 'SuperAdmin' && !stored.hallId) { window.location.href = 'hall-select.html'; return; }
    window.location.href = 'index.html';
    return;
  }

  try {
    await FB.ensure();
    await DB.seed();
    // ── دخول سريع: أزرار حسابات فعلية من قاعدة البيانات ──
    try {
      const accUsers = await DB.users.all();
      const accounts = accUsers
        .filter(u => u.active)
        .map(u => ({
          email: u.email, pass: '', role: u.role, hallId: u.hallId || '',
          emoji: u.role === 'SuperAdmin' ? '🏛️' : ({ crystala: '💎', rose: '🌹', loshato: '💍' }[u.hallId] || '🏛️')
        }));
      // نعرض الباسوردات المعروفة فقط (المبدئية)
      const KNOWN = { 'admin@laguna.com': 'admin123', 'crystala@laguna.com': '123', 'rose@laguna.com': '123', 'loshato@laguna.com': '123' };
      accounts.forEach(a => { a.pass = KNOWN[a.email] || ''; });
      const grid = document.getElementById('quickAccounts');
      if (grid && accounts.length) {
        grid.innerHTML = accounts.map(a => `
        <button type="button" class="qa-btn" data-email="${escapeHtml(a.email)}" data-pass="${escapeHtml(a.pass)}">
          <span class="qa-emoji">${a.emoji}</span>
          <span class="qa-role">${a.role === 'SuperAdmin' ? 'أدمن النظام' : ('مدير ' + ({ castala: 'كريستالة', rose: 'روز', loshato: 'لوشاتو' }[a.hallId] || a.hallId))}</span>
        </button>`).join('');
        grid.querySelectorAll('.qa-btn').forEach(b => {
          b.onclick = () => {
            document.getElementById('loginEmail').value = b.dataset.email;
            const pw = document.getElementById('loginPassword');
            const ptw = document.getElementById('passToggle');
            pw.value = b.dataset.pass;
            pw.type = 'text';
            ptw.classList.add('showing');
            ptw.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
            flash('تم ملء الحساب — اضغط تسجيل الدخول', 'loading');
          };
        });
      }
    } catch (e) { console.warn('[auth] quick accounts:', e.message); }
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
        hallName: user.role === 'SuperAdmin' ? null : (hall ? hall.name : ''),
        emoji: user.role === 'SuperAdmin' ? null : (hall ? (hall.emoji || '🏛️') : '')
      };
      DB.session.set(session);
      const now = Date.now();
      sessionStorage.setItem('laguna_hall_session_start', String(now));
      sessionStorage.setItem('laguna_hall_last_active', String(now));
      try { await DB.seed(); } catch (e) { console.warn('[auth] seed after login:', e.message); }
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

  // إظهار / إخفاء كلمة المرور
  const passInput = document.getElementById('loginPassword');
  const passToggle = document.getElementById('passToggle');
  passToggle.onclick = () => {
    const showing = passInput.type === 'text';
    passInput.type = showing ? 'password' : 'text';
    passToggle.classList.toggle('showing', !showing);
    passToggle.innerHTML = showing ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    passInput.focus();
  };

  function flash(text, type) {
    msgEl.className = 'auth-msg ' + type;
    msgEl.textContent = text;
  }
})();
