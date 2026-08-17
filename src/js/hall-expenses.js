(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  let expenses = [];
  let bookings = [];

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function bookingName(id) {
    const b = bookings.find(x => x.id === id);
    return b ? b.clientName : '—';
  }

  function render() {
    const fb = document.getElementById('fBooking').value;
    const fFrom = document.getElementById('fFrom').value;
    const fTo = document.getElementById('fTo').value;
    let list = expenses.filter(e =>
      (fb === 'all' || e.bookingId === fb) &&
      (!fFrom || e.date >= fFrom) && (!fTo || e.date <= fTo)
    );
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
    const rent = list.filter(e => e.category === 'rented').reduce((s, e) => s + Number(e.amount || 0), 0);
    document.getElementById('tTotal').textContent = DB.fmt(total);
    document.getElementById('tRent').textContent = DB.fmt(rent);
    document.getElementById('fCount').textContent = list.length + ' مصروف';

    const body = document.getElementById('eBody');
    const empty = document.getElementById('eEmpty');
    if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = list.map(e => `
      <tr>
        <td><b>${escapeHtml(bookingName(e.bookingId))}</b></td>
        <td>${escapeHtml(e.item)}<div class="muted" style="font-size:11px">${escapeHtml(e.note || '')}</div></td>
        <td><span class="badge ${e.category === 'rented' ? 'rented' : 'owned'}">${e.category === 'rented' ? 'مؤجر' : 'مملوك'}</span></td>
        <td><b>${DB.fmt(e.amount)}</b></td>
        <td>${e.date ? new Date(e.date).toLocaleDateString('ar-EG') : '-'}</td>
        <td><button class="icon-btn red" data-id="${escapeHtml(e.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('');
    body.querySelectorAll('.icon-btn').forEach(b => b.onclick = () => {
      if (confirm('حذف هذا المصروف؟')) {
        const e = expenses.find(x => x.id === b.dataset.id);
        DB.hall_expenses.remove(b.dataset.id).then(() => {
          DB.audit.log('expense_delete', { id: b.dataset.id, item: e ? e.item : '', amount: e ? e.amount : 0 });
          toast('تم الحذف');
          refresh();
        });
      }
    });
  }

  function fillBookingSelect(sel) {
    const active = bookings.filter(b => b.status !== 'canceled').sort((a, b) => a.date.localeCompare(b.date));
    sel.innerHTML = active.length ? active.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.clientName)} — ${b.date}</option>`).join('')
      : '<option value="">لا توجد حجوزات</option>';
  }

  document.getElementById('addBtn').onclick = () => {
    fillBookingSelect(document.getElementById('eBooking'));
    document.getElementById('eDate').value = DB.todayKey();
    document.getElementById('eAmount').value = '';
    document.getElementById('eItem').value = '';
    document.getElementById('modal').classList.add('show');
  };
  document.getElementById('close').onclick = () => document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

  document.getElementById('save').onclick = async () => {
    const bookingId = document.getElementById('eBooking').value;
    const item = document.getElementById('eItem').value.trim();
    const amount = Number(document.getElementById('eAmount').value);
    if (!bookingId || !item || !amount) return toast('اكمل البيانات المطلوبة', 'error');
    await DB.hall_expenses.add({
      id: Date.now().toString(36), hallId, bookingId, item,
      category: document.getElementById('eCat').value,
      amount, date: document.getElementById('eDate').value || DB.todayKey(),
      note: document.getElementById('eNote').value.trim(), ts: Date.now()
    });
    await DB.audit.log('expense_create', { bookingId, item, amount });
    document.getElementById('modal').classList.remove('show');
    toast('تم الحفظ');
    refresh();
  };

  ['fBooking', 'fFrom', 'fTo'].forEach(id => document.getElementById(id).onchange = render);

  async function refresh() {
    expenses = (await DB.hall_expenses.all()).filter(e => e.hallId === hallId);
    bookings = (await DB.bookings.all()).filter(b => b.hallId === hallId);
    const fSel = document.getElementById('fBooking');
    const cur = fSel.value;
    fSel.innerHTML = '<option value="all">كل الأفراح</option>' + bookings.filter(b => b.status !== 'canceled').map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.clientName)} — ${b.date}</option>`).join('');
    fSel.value = cur;
    render();
  }

  refresh();
})();
