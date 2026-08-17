(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  let editingId = null;
  let pendingDelete = null;

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function askDelete(p) {
    pendingDelete = p;
    document.getElementById('delText').textContent = 'حذف الباقة "' + p.name + '"؟';
    document.getElementById('delModal').classList.add('show');
  }
  document.getElementById('delYes').onclick = () => {
    if (pendingDelete) DB.packages.remove(pendingDelete.id).then(() => { DB.audit.log('package_delete', { id: pendingDelete.id, name: pendingDelete.name }); render(); });
    document.getElementById('delModal').classList.remove('show');
    pendingDelete = null;
  };
  const closeDel = () => { document.getElementById('delModal').classList.remove('show'); pendingDelete = null; };
  document.getElementById('delCancel').onclick = closeDel;
  document.getElementById('delClose').onclick = closeDel;
  document.getElementById('delModal').onclick = e => { if (e.target.id === 'delModal') closeDel(); };

  async function render() {
    const items = DB.bySort((await DB.packages.all()).filter(p => p.hallId === hallId));
    const grid = document.getElementById('pkGrid');
    if (!items.length) { grid.innerHTML = '<div class="empty">لا توجد باقات بعد — أضف أول باقة</div>'; return; }
    grid.innerHTML = items.map(p => `
      <div class="card">
        <h3 class="title"><i class="fa-solid fa-box-open"></i> ${escapeHtml(p.name)}</h3>
        <p class="muted" style="font-size:13px;min-height:38px">${escapeHtml(p.description || '')}</p>
        <div class="flex" style="margin-top:10px">
          <b style="font-size:20px;color:var(--gold2)">${DB.fmtPrice(p.price)}</b>
          <div class="spacer"></div>
          <button class="icon-btn" data-act="edit" data-id="${escapeHtml(p.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn red" data-act="del" data-id="${escapeHtml(p.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    grid.querySelectorAll('.icon-btn').forEach(b => {
      b.onclick = () => {
        const p = items.find(x => x.id === b.dataset.id);
        if (!p) return;
        if (b.dataset.act === 'edit') open(p);
        else if (b.dataset.act === 'del') askDelete(p);
      };
    });
  }

  function open(p) {
    editingId = p ? p.id : null;
    document.getElementById('modalTitle').textContent = p ? 'تعديل باقة' : 'إضافة باقة';
    document.getElementById('pName').value = p ? p.name : '';
    document.getElementById('pPrice').value = p ? p.price : '';
    document.getElementById('pDesc').value = p ? (p.description || '') : '';
    document.getElementById('modal').classList.add('show');
  }

  document.getElementById('addBtn').onclick = () => open(null);
  document.getElementById('close').onclick = () => document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

  document.getElementById('save').onclick = async () => {
    const name = document.getElementById('pName').value.trim();
    const price = Number(document.getElementById('pPrice').value);
    const description = document.getElementById('pDesc').value.trim();
    if (!name) return toast('اسم الباقة مطلوب', 'error');
    if (editingId) {
      await DB.packages.update(editingId, { name, price, description });
      await DB.audit.log('package_update', { id: editingId, name, price });
    } else {
      await DB.packages.add({ id: Date.now().toString(36), hallId, name, price, description, ts: Date.now() });
      await DB.audit.log('package_create', { name, price });
    }
    document.getElementById('modal').classList.remove('show');
    toast('تم الحفظ');
    render();
  };

  render();
})();
