const STATUS_AR = { reserved: 'محجوز', confirmed: 'مؤكد', canceled: 'ملغي', completed: 'منتهي' };
const STATUS_CLS = { reserved: 'reserved', confirmed: 'confirmed', canceled: 'canceled', completed: 'completed' };

(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;

  let bookings = [];
  let packages = [];
  let addons = [];
  let payments = [];
  let viewYear, viewMonth;
  const DOW = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  let editingId = null;

  const calGrid = document.getElementById('calGrid');
  const calTitle = document.getElementById('calTitle');

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function key(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function loadAll() {
    return Promise.all([DB.bookings.all(), DB.packages.all(), DB.addons.all(), DB.payments.all()]).then(([b, p, a, pay]) => {
      bookings = b.filter(x => x.hallId === hallId);
      packages = DB.bySort(p.filter(x => x.hallId === hallId));
      addons = DB.bySort(a.filter(x => x.hallId === hallId));
      payments = pay.filter(x => x.hallId === hallId);
    });
  }

  function packageName(id) {
    const p = packages.find(x => x.id === id);
    return p ? p.name : '—';
  }

  function renderCalendar() {
    const now = new Date();
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDow = first.getDay();
    calTitle.textContent = first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    let html = DOW.map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < startDow; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const k = key(date);
      const isToday = k === DB.todayKey();
      const dayBookings = bookings.filter(b => b.date === k && b.status !== 'canceled');
      let tags = '';
      dayBookings.slice(0, 3).forEach(b => {
        tags += `<span class="${STATUS_CLS[b.status]}">${escapeHtml(b.clientName)}</span>`;
      });
      if (dayBookings.length > 3) tags += `<span>+${dayBookings.length - 3}</span>`;
      html += `<div class="cal-day ${isToday ? 'today' : ''}" data-date="${k}">
        <div class="num">${d}</div>
        ${tags ? `<div class="tag">${tags}</div>` : ''}
      </div>`;
    }
    calGrid.innerHTML = html;

    calGrid.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.onclick = () => openBooking(el.dataset.date);
    });
  }

  function renderList() {
    const fFrom = document.getElementById('fFrom').value;
    const fTo = document.getElementById('fTo').value;
    const fStatus = document.getElementById('fStatus').value;
    let list = [...bookings];
    if (fFrom) list = list.filter(b => b.date >= fFrom);
    if (fTo) list = list.filter(b => b.date <= fTo);
    if (fStatus !== 'all') list = list.filter(b => b.status === fStatus);
    list.sort((a, b) => a.date.localeCompare(b.date));

    document.getElementById('fCount').textContent = list.length + ' حجز';
    const body = document.getElementById('bookBody');
    const empty = document.getElementById('bookEmpty');
    if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    const paidPer = {};
    payments.forEach(p => { paidPer[p.bookingId] = (paidPer[p.bookingId] || 0) + Number(p.amount || 0); });
    body.innerHTML = list.map(b => {
      const paid = paidPer[b.id] || 0;
      const rem = Math.max(0, Number(b.total || 0) - paid);
      return `
      <tr>
        <td><b>${escapeHtml(b.clientName)}</b><div class="muted" style="font-size:11px">${escapeHtml(b.clientPhone || '')}</div></td>
        <td>${new Date(b.date).toLocaleDateString('ar-EG')}</td>
        <td>${packageName(b.packageId)}</td>
        <td>${(b.addonsIds || []).length}</td>
        <td>${DB.fmt(b.deposit)}</td>
        <td><b>${DB.fmt(b.total)}</b></td>
        <td>${DB.fmt(paid)}</td>
        <td><span class="badge ${rem > 0 ? 'reserved' : 'completed'}">${DB.fmt(rem)}</span></td>
        <td><span class="badge ${STATUS_CLS[b.status]}">${STATUS_AR[b.status]}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-act="edit" data-id="${escapeHtml(b.id)}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn red" data-act="del" data-id="${escapeHtml(b.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`;
    });
    body.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = () => {
        const b = bookings.find(x => x.id === btn.dataset.id);
        if (!b) return;
        if (btn.dataset.act === 'edit') openBooking(null, b);
        else if (btn.dataset.act === 'del') askDelete(b);
      };
    });
  }

  function openBooking(dateStr, existing) {
    editingId = existing ? existing.id : null;
    document.getElementById('bkModalTitle').textContent = existing ? 'تعديل الحجز' : 'حجز جديد';
    document.getElementById('bkClient').value = existing ? existing.clientName : '';
    document.getElementById('bkPhone').value = existing ? (existing.clientPhone || '') : '';
    document.getElementById('bkDate').value = existing ? existing.date : dateStr;
    document.getElementById('bkStatus').value = existing ? existing.status : 'reserved';
    document.getElementById('bkDeposit').value = existing ? (existing.deposit || '') : '';
    document.getElementById('bkNotes').value = existing ? (existing.notes || '') : '';
    document.getElementById('bkTotal').value = existing ? (existing.total || '') : '';
    document.getElementById('bkMethod').value = existing ? (existing.paymentMethod || 'cash') : 'cash';

    const pkgSel = document.getElementById('bkPackage');
    pkgSel.innerHTML = '<option value="">— بدون باقة —</option>' + packages.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${DB.fmtPrice(p.price)}</option>`).join('');
    pkgSel.value = existing ? (existing.packageId || '') : '';

    const addonBox = document.getElementById('bkAddons');
    const sel = existing ? (existing.addonsIds || []) : [];
    addonBox.innerHTML = addons.length ? addons.map(a => `
      <label><input type="checkbox" value="${escapeHtml(a.id)}" ${sel.includes(a.id) ? 'checked' : ''}> ${escapeHtml(a.name)} — ${DB.fmtPrice(a.price)}</label>
    `).join('') : '<span class="muted" style="font-size:12px">لا توجد إضافات — أضفها من صفحة الإضافات</span>';

    document.getElementById('bkModal').classList.add('show');
  }

  function calcTotal() {
    const p = packages.find(x => x.id === document.getElementById('bkPackage').value);
    let total = p && p.price != null ? Number(p.price) : 0;
    document.querySelectorAll('#bkAddons input:checked').forEach(cb => {
      const a = addons.find(x => x.id === cb.value);
      if (a && a.price != null) total += Number(a.price || 0);
    });
    document.getElementById('bkTotal').value = total || '';
  }
  document.getElementById('bkPackage').onchange = calcTotal;
  document.getElementById('bkAddons').onchange = calcTotal;

  document.getElementById('bkClose').onclick = () => document.getElementById('bkModal').classList.remove('show');
  document.getElementById('newBookingBtn').onclick = () => openBooking(key(new Date()));
  document.getElementById('bkModal').onclick = e => { if (e.target.id === 'bkModal') e.target.classList.remove('show'); };

  async function saveBooking() {
    const clientName = document.getElementById('bkClient').value.trim();
    const clientPhone = document.getElementById('bkPhone').value.trim();
    const date = document.getElementById('bkDate').value;
    if (!clientName || !date) return toast('اسم العميل والتاريخ مطلوبان', 'error');
    const deposit = Number(document.getElementById('bkDeposit').value) || 0;
    const total = Number(document.getElementById('bkTotal').value) || 0;
    const addonsIds = [...document.querySelectorAll('#bkAddons input:checked')].map(cb => cb.value);
    const packageId = document.getElementById('bkPackage').value;
    const status = document.getElementById('bkStatus').value;
    const notes = document.getElementById('bkNotes').value.trim();
    const paymentMethod = document.getElementById('bkMethod').value;
    const settings = await DB.settings.get();

    // ── منع الحجز المزدوج: نفس القاعة في نفس اليوم ──
    if (status !== 'canceled') {
      const all = await DB.bookings.all();
      const clash = all.find(b =>
        b.hallId === hallId && b.date === date && b.id !== editingId && b.status !== 'canceled'
      );
      if (clash) return toast('⚠️ القاعة محجوزة في هذا اليوم: ' + clash.clientName + ' (' + clash.date + ')', 'error');
    }

    const data = { hallId, clientName, clientPhone, date, deposit, total, addonsIds, packageId, status, notes, paymentMethod, ts: Date.now() };

    try {
      if (editingId) {
        await DB.bookings.update(editingId, data);
        await DB.audit.log('booking_update', { id: editingId, clientName, date });

        // مزامنة العقد المرتبط بالحجز
        const existingContract = (await DB.contracts.all()).find(c => c.bookingId === editingId);
        const terms = (settings.contract_terms || '');
        const contractData = {
          hallId, bookingId: editingId, clientName, clientPhone, eventDate: date,
          deposit, total, packageName: packageName(packageId),
          addonsText: addonsIds.map(a => { const x = addons.find(y => y.id === a); return x ? x.name : ''; }).filter(Boolean).join('، '),
          fixedTerms: terms, customNotes: notes, ts: Date.now()
        };
        if (existingContract) await DB.contracts.update(existingContract.id, contractData);
        else await DB.contracts.add({ id: 'c_' + editingId, ...contractData });

        // مزامنة دفعة العربون: تعديلها حسب القيمة الجديدة
        const depositPay = (await DB.payments.all()).find(p => p.bookingId === editingId && p.type === 'deposit');
        if (deposit > 0) {
          const payData = { amount: deposit, method: paymentMethod, date, note: 'عربون — ' + clientName, ts: Date.now() };
          if (depositPay) await DB.payments.update(depositPay.id, payData);
          else await DB.payments.add({ id: 'p_' + editingId, hallId, bookingId: editingId, type: 'deposit', ...payData });
        } else if (depositPay) {
          await DB.payments.remove(depositPay.id);
        }
      } else {
        const id = Date.now().toString(36);
        await DB.bookings.add({ ...data, id });
        await DB.audit.log('booking_create', { id, clientName, date });

        // عقد تلقائي لكل حجز
        const terms = (settings.contract_terms || '');
        await DB.contracts.add({
          id: 'c_' + id, hallId, bookingId: id, clientName, clientPhone, eventDate: date,
          deposit, total, packageName: packageName(packageId),
          addonsText: addonsIds.map(a => { const x = addons.find(y => y.id === a); return x ? x.name : ''; }).filter(Boolean).join('، '),
          fixedTerms: terms, customNotes: notes, ts: Date.now()
        });

        // تسجيل العربون كدفعة
        if (deposit > 0) {
          await DB.payments.add({
            id: 'p_' + id, hallId, bookingId: id, amount: deposit, method: paymentMethod,
            type: 'deposit', date, note: 'عربون — ' + clientName, ts: Date.now()
          });
        }
      }
      document.getElementById('bkModal').classList.remove('show');
      toast(editingId ? 'تم تحديث الحجز' : 'تم الحجز بنجاح — تم إنشاء العقد');
      await refresh();
    } catch (e) {
      toast('خطأ: ' + e.message, 'error');
    }
  }
  document.getElementById('bkSave').onclick = saveBooking;

  async function removeBooking(b) {
    try {
      await DB.bookings.remove(b.id);
      const c = (await DB.contracts.all()).find(x => x.bookingId === b.id);
      if (c) await DB.contracts.remove(c.id);
      const pays = (await DB.payments.all()).filter(p => p.bookingId === b.id);
      for (const p of pays) await DB.payments.remove(p.id);
      await DB.audit.log('booking_delete', { id: b.id, clientName: b.clientName });
      toast('تم حذف الحجز والعقد والدفعات المرتبطة');
      await refresh();
    } catch (e) { toast('خطأ: ' + e.message, 'error'); }
  }

  // ── نافذة تأكيد الحذف ──
  let pendingDelete = null;
  function askDelete(b) {
    pendingDelete = b;
    document.getElementById('delText').textContent =
      'هل تريد حذف حجز "' + b.clientName + '" بتاريخ ' + b.date + '؟' +
      (b.status === 'canceled' ? '' : ' سيتم حذف العقد والدفعات المرتبطة به نهائياً.');
    document.getElementById('delModal').classList.add('show');
  }
  document.getElementById('delYes').onclick = () => {
    if (pendingDelete) removeBooking(pendingDelete);
    document.getElementById('delModal').classList.remove('show');
    pendingDelete = null;
  };
  const closeDel = () => { document.getElementById('delModal').classList.remove('show'); pendingDelete = null; };
  document.getElementById('delCancel').onclick = closeDel;
  document.getElementById('delClose').onclick = closeDel;
  document.getElementById('delModal').onclick = e => { if (e.target.id === 'delModal') closeDel(); };

  document.getElementById('calPrev').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); };
  document.getElementById('calNext').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); };
  document.getElementById('calToday').onclick = () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); renderCalendar(); };

  document.getElementById('fMonth').onclick = () => {
    const n = new Date();
    document.getElementById('fFrom').value = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-01';
    document.getElementById('fTo').value = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()).padStart(2, '0');
    renderList();
  };
  document.getElementById('fYear').onclick = () => {
    const n = new Date();
    document.getElementById('fFrom').value = n.getFullYear() + '-01-01';
    document.getElementById('fTo').value = n.getFullYear() + '-12-31';
    renderList();
  };
  ['fFrom', 'fTo', 'fStatus'].forEach(id => document.getElementById(id).onchange = renderList);

  // ── تصدير Excel للحجوزات المفلترة ──
  document.getElementById('exportBtn').onclick = () => {
    const fFrom = document.getElementById('fFrom').value;
    const fTo = document.getElementById('fTo').value;
    const fStatus = document.getElementById('fStatus').value;
    let list = [...bookings];
    if (fFrom) list = list.filter(b => b.date >= fFrom);
    if (fTo) list = list.filter(b => b.date <= fTo);
    if (fStatus !== 'all') list = list.filter(b => b.status === fStatus);
    list.sort((a, b) => a.date.localeCompare(b.date));
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [[
      esc('العميل'), esc('الهاتف'), esc('التاريخ'), esc('الباقة'), esc('عدد الإضافات'),
      esc('العربون'), esc('الإجمالي'), esc('الحالة'), esc('ملاحظات')
    ]];
    list.forEach(b => lines.push([
      esc(b.clientName), esc(b.clientPhone || ''), esc(b.date), esc(packageName(b.packageId)),
      esc((b.addonsIds || []).length), esc(b.deposit), esc(b.total), esc(STATUS_AR[b.status]), esc(b.notes || '')
    ]));
    const blob = new Blob(['\uFEFF' + lines.map(r => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'حجوزات-' + DB.todayKey().replace(/-/g, '') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  async function refresh() {
    await loadAll();
    renderCalendar();
    renderList();
  }

  (async () => {
    const n = new Date();
    viewYear = n.getFullYear(); viewMonth = n.getMonth();
    await refresh();
  })();
})();
