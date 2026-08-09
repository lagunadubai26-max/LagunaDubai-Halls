(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  let contracts = [];

  function render() {
    const q = document.getElementById('cSearch').value.trim().toLowerCase();
    const fFrom = document.getElementById('cFrom').value;
    const fTo = document.getElementById('cTo').value;
    let list = contracts.filter(c =>
      (!q || (c.clientName || '').toLowerCase().includes(q)) &&
      (!fFrom || (c.eventDate || '') >= fFrom) &&
      (!fTo || (c.eventDate || '') <= fTo)
    );
    list.sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
    document.getElementById('cCount').textContent = list.length + ' عقد';
    const body = document.getElementById('cBody');
    const empty = document.getElementById('cEmpty');
    if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = list.map(c => `
      <tr>
        <td><b>${escapeHtml(c.clientName)}</b><div class="muted" style="font-size:11px">${escapeHtml(c.clientPhone || '')}</div></td>
        <td>${c.eventDate ? new Date(c.eventDate).toLocaleDateString('ar-EG') : '-'}</td>
        <td>${escapeHtml(c.packageName || '—')}</td>
        <td>${DB.fmt(c.deposit)}</td>
        <td><b>${DB.fmt(c.total)}</b></td>
        <td><button class="icon-btn" data-id="${escapeHtml(c.id)}" title="عرض العقد"><i class="fa-solid fa-file-lines"></i></button></td>
      </tr>`).join('');
    body.querySelectorAll('.icon-btn').forEach(btn => {
      btn.onclick = () => showContract(contracts.find(c => c.id === btn.dataset.id));
    });
  }

  function showContract(c) {
    if (!c) return;
    const hallName = (u.hallName || '');
    const terms = (c.fixedTerms || '');
    const addons = (c.addonsText || '');
    document.getElementById('cSheet').innerHTML = `
      <h2>عقد حجز قاعة</h2>
      <div class="sub">${escapeHtml(hallName)} — لاجونا دبي</div>
      <table>
        <tr><th>اسم العميل</th><td>${escapeHtml(c.clientName)}</td><th>رقم الهاتف</th><td>${escapeHtml(c.clientPhone || '—')}</td></tr>
        <tr><th>تاريخ الفرح</th><td>${c.eventDate ? new Date(c.eventDate).toLocaleDateString('ar-EG') : '—'}</td><th>الباقة</th><td>${escapeHtml(c.packageName || '—')}</td></tr>
        <tr><th>الإضافات</th><td colspan="3">${escapeHtml(addons || 'لا يوجد')}</td></tr>
        <tr><th>العربون (مقدم)</th><td>${DB.fmt(c.deposit)}</td><th>القيمة الإجمالية</th><td>${DB.fmt(c.total)}</td></tr>
      </table>
      ${terms ? `<div class="terms"><b>الشروط:</b>
${escapeHtml(terms)}</div>` : ''}
      ${c.customNotes ? `<div class="terms"><b>ملاحظات:</b> ${escapeHtml(c.customNotes)}</div>` : ''}
      <div class="sig"><span>توقيع العميل</span><span>توقيع الإدارة</span></div>`;
    document.getElementById('cModal').classList.add('show');
  }

  document.getElementById('cClose').onclick = () => document.getElementById('cModal').classList.remove('show');
  document.getElementById('cModal').onclick = e => { if (e.target.id === 'cModal') e.target.classList.remove('show'); };
  document.getElementById('cPrint').onclick = () => window.print();

  ['cSearch', 'cFrom', 'cTo'].forEach(id => document.getElementById(id).oninput = render);

  (async () => {
    contracts = (await DB.contracts.all()).filter(c => c.hallId === hallId);
    render();
  })();
})();
