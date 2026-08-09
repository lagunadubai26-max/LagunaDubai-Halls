(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  let payments = [];
  let bookings = [];

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function render() {
    const fFrom = document.getElementById('fFrom').value;
    const fTo = document.getElementById('fTo').value;
    const fMethod = document.getElementById('fMethod').value;
    let list = payments.filter(p =>
      (!fFrom || p.date >= fFrom) && (!fTo || p.date <= fTo) &&
      (fMethod === 'all' || p.method === fMethod)
    );
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const total = list.reduce((s, p) => s + Number(p.amount || 0), 0);
    const dep = list.filter(p => p.type === 'deposit').reduce((s, p) => s + Number(p.amount || 0), 0);
    const trans = list.filter(p => p.method === 'transfer').reduce((s, p) => s + Number(p.amount || 0), 0);
    document.getElementById('tTotal').textContent = DB.fmt(total);
    document.getElementById('tDep').textContent = DB.fmt(dep);
    document.getElementById('tTrans').textContent = DB.fmt(trans);
    document.getElementById('fCount').textContent = list.length + ' دفعة';

    const body = document.getElementById('pBody');
    const empty = document.getElementById('pEmpty');
    if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    const types = { deposit: 'عربون', installment: 'دفعة', full: 'متبقي/كامل' };
    body.innerHTML = list.map(p => {
      const b = bookings.find(x => x.id === p.bookingId);
      return `<tr>
        <td><b>${escapeHtml((b && b.clientName) || '—')}</b></td>
        <td>${p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'}</td>
        <td><b>${DB.fmt(p.amount)}</b></td>
        <td><span class="badge ${p.type === 'deposit' ? 'reserved' : p.type === 'full' ? 'confirmed' : 'pending'}">${types[p.type]}</span></td>
        <td>${p.method === 'cash' ? 'نقدي' : 'تحويل'}</td>
        <td class="muted" style="font-size:12px">${escapeHtml(p.note || '')}</td>
        <td><button class="icon-btn red" data-id="${escapeHtml(p.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`;
    }).join('');
    body.querySelectorAll('.icon-btn').forEach(b => b.onclick = () => {
      if (confirm('حذف هذه الدفعة؟')) DB.payments.remove(b.dataset.id).then(() => { toast('تم الحذف'); refresh(); });
    });
  }

  document.getElementById('addBtn').onclick = () => {
    const sel = document.getElementById('payBooking');
    const active = bookings.filter(b => b.status !== 'canceled').sort((a, b) => a.date.localeCompare(b.date));
    sel.innerHTML = active.length ? active.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.clientName)} — ${b.date}</option>`).join('')
      : '<option value="">لا توجد حجوزات</option>';
    document.getElementById('payDate').value = DB.todayKey();
    document.getElementById('payAmount').value = '';
    document.getElementById('modal').classList.add('show');
  };
  document.getElementById('close').onclick = () => document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

  document.getElementById('save').onclick = async () => {
    const bookingId = document.getElementById('payBooking').value;
    const amount = Number(document.getElementById('payAmount').value);
    if (!bookingId || !amount) return toast('اختر الحجز وأدخل المبلغ', 'error');
    const b = bookings.find(x => x.id === bookingId);
    await DB.payments.add({
      id: Date.now().toString(36), hallId, bookingId,
      amount, type: document.getElementById('payType').value,
      method: document.getElementById('payMethod').value,
      date: document.getElementById('payDate').value || DB.todayKey(),
      note: document.getElementById('payNote').value.trim(),
      ts: Date.now()
    });
    await DB.audit.log('payment_create', { bookingId, amount });
    document.getElementById('modal').classList.remove('show');
    toast('تم تسجيل الدفعة');
    refresh();
  };

  ['fFrom', 'fTo', 'fMethod'].forEach(id => document.getElementById(id).onchange = render);

  async function refresh() {
    payments = (await DB.payments.all()).filter(p => p.hallId === hallId);
    bookings = (await DB.bookings.all()).filter(b => b.hallId === hallId);
    render();
  }

  refresh();
})();
