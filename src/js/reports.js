(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;

  let bookings = [], payments = [], expenses = [], contracts = [];

  function monthLabel(iso) {
    try { return new Date(iso).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }); }
    catch (e) { return iso; }
  }

  function inRange(dateStr, from, to) {
    if (!from && !to) return true;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
  }

  function render() {
    const from = document.getElementById('rFrom').value;
    const to = document.getElementById('rTo').value;
    document.getElementById('rPeriodLabel').textContent = (from ? 'من ' + from : '') + (to ? ' إلى ' + to : '') + (from || to ? '' : ' (كل الفترات)');

    const bIn = bookings.filter(b => b.status !== 'canceled' && inRange(b.date, from, to));
    const pIn = payments.filter(p => inRange(p.date, from, to));
    const eIn = expenses.filter(e => inRange(e.date, from, to));

    const collected = pIn.reduce((s, p) => s + Number(p.amount || 0), 0);
    const deposits = pIn.filter(p => p.type === 'deposit').reduce((s, p) => s + Number(p.amount || 0), 0);
    const expTotal = eIn.reduce((s, e) => s + Number(e.amount || 0), 0);
    const cash = pIn.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount || 0), 0);
    const transfer = pIn.filter(p => p.method === 'transfer').reduce((s, p) => s + Number(p.amount || 0), 0);

    document.getElementById('rCount').textContent = bIn.length;
    document.getElementById('rCollected').textContent = DB.fmt(collected);
    document.getElementById('rDeposits').textContent = DB.fmt(deposits);
    document.getElementById('rExpenses').textContent = DB.fmt(expTotal);
    document.getElementById('rCash').textContent = DB.fmt(cash);
    document.getElementById('rTransfer').textContent = DB.fmt(transfer);
    document.getElementById('rNet').textContent = DB.fmt(collected - expTotal);

    // monthly breakdown (last 12 months from the max range, or all data months)
    const months = {};
    bookings.filter(b => b.status !== 'canceled').forEach(b => {
      const k = (b.date || '').slice(0, 7);
      if (!k) return;
      months[k] = months[k] || { count: 0, paid: 0, exp: 0 };
      months[k].count++;
    });
    payments.forEach(p => { const k = (p.date || '').slice(0, 7); if (k) { months[k] = months[k] || { count: 0, paid: 0, exp: 0 }; months[k].paid += Number(p.amount || 0); } });
    expenses.forEach(e => { const k = (e.date || '').slice(0, 7); if (k) { months[k] = months[k] || { count: 0, paid: 0, exp: 0 }; months[k].exp += Number(e.amount || 0); } });
    const sortedMonths = Object.keys(months).sort().slice(-12);
    document.getElementById('monthBody').innerHTML = sortedMonths.length ? sortedMonths.map(k => `
      <tr>
        <td>${monthLabel(k + '-01')}</td>
        <td>${months[k].count}</td>
        <td>${DB.fmt(months[k].paid)}</td>
        <td>${DB.fmt(months[k].exp)}</td>
        <td><b>${DB.fmt(months[k].paid - months[k].exp)}</b></td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty">لا بيانات</td></tr>';

    // detail per booking in period
    const det = bookings.filter(b => b.status !== 'canceled' && inRange(b.date, from, to)).sort((a, b) => a.date.localeCompare(b.date));
    const statusAr = { reserved: 'محجوز', confirmed: 'مؤكد', completed: 'منتهي', canceled: 'ملغي' };
    const paidPer = {};
    payments.forEach(p => { paidPer[p.bookingId] = (paidPer[p.bookingId] || 0) + Number(p.amount || 0); });
    document.getElementById('detBody').innerHTML = det.length ? det.map(b => {
      const hasContract = contracts.some(c => c.bookingId === b.id);
      return `<tr>
        <td><b>${escapeHtml(b.clientName)}</b></td>
        <td>${new Date(b.date).toLocaleDateString('ar-EG')}</td>
        <td><span class="badge ${b.status === 'confirmed' ? 'confirmed' : b.status === 'completed' ? 'completed' : 'reserved'}">${statusAr[b.status]}</span></td>
        <td>${hasContract ? '✅' : '—'}</td>
        <td>${DB.fmt(paidPer[b.id] || 0)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="empty">لا حجوزات في هذه الفترة</td></tr>';
  }

  function setRange(from, to) { document.getElementById('rFrom').value = from || ''; document.getElementById('rTo').value = to || ''; render(); }

  // ── تصدير Excel ──
  function csvEscape(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }
  function downloadCSV(filename, lines) {
    const blob = new Blob(['\uFEFF' + lines.map(r => r.map(csvEscape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('exportExcelBtn').onclick = () => {
    const from = document.getElementById('rFrom').value;
    const to = document.getElementById('rTo').value;
    const lines = [];
    lines.push(['تقرير مالي — ' + (u.hallName || 'القاعة')]);
    lines.push(['الفترة', from || 'الكل', to || 'الكل']);
    lines.push([]);
    lines.push(['عدد الأفراح', document.getElementById('rCount').textContent]);
    lines.push(['إجمالي المحصل', document.getElementById('rCollected').textContent]);
    lines.push(['العربونات', document.getElementById('rDeposits').textContent]);
    lines.push(['المصروفات', document.getElementById('rExpenses').textContent]);
    lines.push(['النقدية', document.getElementById('rCash').textContent]);
    lines.push(['التحويلات', document.getElementById('rTransfer').textContent]);
    lines.push(['نتيجة التشغيل', document.getElementById('rNet').textContent]);
    lines.push([]);
    lines.push(['التفاصيل الشهرية']);
    lines.push(['الشهر', 'أفراح', 'محصل', 'مصروفات', 'الصافي']);
    const months = {};
    bookings.filter(b => b.status !== 'canceled').forEach(b => { const k = (b.date || '').slice(0, 7); if (k) { months[k] = months[k] || { count: 0, paid: 0, exp: 0 }; months[k].count++; } });
    payments.forEach(p => { const k = (p.date || '').slice(0, 7); if (k) { months[k] = months[k] || { count: 0, paid: 0, exp: 0 }; months[k].paid += Number(p.amount || 0); } });
    expenses.forEach(e => { const k = (e.date || '').slice(0, 7); if (k) { months[k] = months[k] || { count: 0, paid: 0, exp: 0 }; months[k].exp += Number(e.amount || 0); } });
    Object.keys(months).sort().slice(-12).forEach(k => lines.push([monthLabel(k + '-01'), months[k].count, months[k].paid, months[k].exp, months[k].paid - months[k].exp]));
    lines.push([]);
    lines.push(['تفاصيل الحجوزات في الفترة']);
    lines.push(['العميل', 'التاريخ', 'الحالة', 'العقد', 'المحصل']);
    const paidPer = {};
    payments.forEach(p => { paidPer[p.bookingId] = (paidPer[p.bookingId] || 0) + Number(p.amount || 0); });
    const statusAr = { reserved: 'محجوز', confirmed: 'مؤكد', completed: 'منتهي', canceled: 'ملغي' };
    bookings.filter(b => b.status !== 'canceled' && inRange(b.date, from, to)).sort((a, b) => a.date.localeCompare(b.date))
      .forEach(b => lines.push([
        b.clientName, b.date, statusAr[b.status] || b.status,
        contracts.some(c => c.bookingId === b.id) ? 'نعم' : 'لا', paidPer[b.id] || 0
      ]));
    const stamp = DB.todayKey().replace(/-/g, '');
    downloadCSV('تقرير-' + stamp + '.csv', lines);
  };

  document.getElementById('rMonth').onclick = () => { const n = new Date(); setRange(n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-01', n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()).padStart(2, '0')); };
  document.getElementById('rYear').onclick = () => { const n = new Date(); setRange(n.getFullYear() + '-01-01', n.getFullYear() + '-12-31'); };
  document.getElementById('rAll').onclick = () => setRange('', '');
  ['rFrom', 'rTo'].forEach(id => document.getElementById(id).onchange = render);
  document.getElementById('printBtn').onclick = () => window.print();

  (async () => {
    bookings = (await DB.bookings.all()).filter(b => b.hallId === hallId);
    payments = (await DB.payments.all()).filter(p => p.hallId === hallId);
    expenses = (await DB.hall_expenses.all()).filter(e => e.hallId === hallId);
    contracts = (await DB.contracts.all()).filter(c => c.hallId === hallId);
    render();
  })();
})();
