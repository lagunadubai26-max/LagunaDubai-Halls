(function () {
  const u = guard();
  if (!u) return;
  const isSuper = u.role === 'SuperAdmin';
  const hallId = u.hallId;

  const ACTION_AR = {
    login: 'تسجيل دخول',
    booking_create: 'حجز جديد',
    booking_update: 'تعديل حجز',
    booking_delete: 'حذف حجز',
    payment_create: 'تسجيل دفعة',
    payment_delete: 'حذف دفعة',
    package_create: 'إضافة باقة',
    package_update: 'تعديل باقة',
    addon_create: 'إضافة خدمة',
    addon_update: 'تعديل خدمة',
    expense_create: 'تسجيل مصروف',
    settings_terms_update: 'تعديل شروط العقد',
    settings_restore: 'استعادة نسخة احتياطية',
    password_change: 'تغيير كلمة مرور',
    seed: 'تهيئة النظام',
    hall_create: 'إضافة قاعة',
    hall_update: 'تعديل قاعة',
    hall_delete: 'حذف قاعة'
  };
  const ACTION_CLS = {
    login: 'reserved',
    booking_create: 'confirmed',
    booking_update: 'reserved',
    booking_delete: 'canceled',
    payment_create: 'completed',
    payment_delete: 'canceled',
    package_create: 'confirmed',
    addon_create: 'confirmed',
    expense_create: 'pending',
    settings_restore: 'pending',
    password_change: 'pending',
    seed: 'reserved'
  };

  let logs = [];

  function fmtTime(ts) {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ts; }
  }

  function fmtDetails(d, action) {
    if (!d || typeof d !== 'object') return '-';
    const bits = [];
    if (d.clientName) bits.push('العميل: ' + d.clientName);
    if (d.date) bits.push('التاريخ: ' + d.date);
    if (d.amount != null) bits.push('المبلغ: ' + d.amount);
    if (d.id) bits.push('#' + d.id);
    if (d.note) bits.push(d.note);
    return bits.length ? bits.join(' · ') : '-';
  }

  function render() {
    const fFrom = document.getElementById('fFrom').value;
    const fTo = document.getElementById('fTo').value;
    const fAction = document.getElementById('fAction').value;
    let list = logs.filter(l =>
      (!fFrom || new Date(l.ts).toLocaleDateString('sv-SE') >= fFrom) &&
      (!fTo || new Date(l.ts).toLocaleDateString('sv-SE') <= fTo) &&
      (fAction === 'all' || l.action === fAction)
    );
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    document.getElementById('aCount').textContent = list.length + ' حركة';
    const body = document.getElementById('aBody');
    const empty = document.getElementById('aEmpty');
    if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = list.map(l => `
      <tr>
        <td class="muted" style="font-size:12px;white-space:nowrap">${fmtTime(l.ts)}</td>
        <td><b>${escapeHtml(l.actor || '—')}</b></td>
        <td><span class="badge ${ACTION_CLS[l.action] || 'pending'}">${ACTION_AR[l.action] || escapeHtml(l.action)}</span></td>
        <td class="muted" style="font-size:12px">${escapeHtml(fmtDetails(l.details, l.action))}</td>
        <td class="muted" style="font-size:12px">${isSuper ? escapeHtml(hallNameOf(l.hallId)) : '—'}</td>
      </tr>`).join('');
  }

  let hallNames = {};
  function hallNameOf(hid) {
    if (!hid) return 'الكل';
    const h = hallNames[hid];
    return h ? h : hid;
  }

  ['fFrom', 'fTo', 'fAction'].forEach(id => document.getElementById(id).onchange = render);

  (async () => {
    const allLogs = await DB.audit.all();
    logs = isSuper ? allLogs : allLogs.filter(l => l.hallId === hallId);
    if (isSuper) {
      const halls = await DB.halls.all();
      halls.forEach(h => hallNames[h.id] = h.name);
    }
    render();
  })();
})();
