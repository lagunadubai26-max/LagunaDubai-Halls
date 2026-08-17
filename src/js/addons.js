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

  function askDelete(a) {
    pendingDelete = a;
    document.getElementById('delText').textContent = 'حذف الخدمة "' + a.name + '"؟';
    document.getElementById('delModal').classList.add('show');
  }
  document.getElementById('delYes').onclick = () => {
    if (pendingDelete) DB.addons.remove(pendingDelete.id).then(() => { DB.audit.log('addon_delete', { id: pendingDelete.id, name: pendingDelete.name }); render(); });
    document.getElementById('delModal').classList.remove('show');
    pendingDelete = null;
  };
  const closeDel = () => { document.getElementById('delModal').classList.remove('show'); pendingDelete = null; };
  document.getElementById('delCancel').onclick = closeDel;
  document.getElementById('delClose').onclick = closeDel;
  document.getElementById('delModal').onclick = e => { if (e.target.id === 'delModal') closeDel(); };

  async function render() {
    const items = DB.bySort((await DB.addons.all()).filter(a => a.hallId === hallId));
    const body = document.getElementById('aBody');
    const empty = document.getElementById('aEmpty');
    if (!items.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = items.map(a => `
      <tr>
        <td><b>${escapeHtml(a.name)}</b></td>
        <td>${DB.fmtPrice(a.price)}</td>
        <td><div class="row-actions">
          <button class="icon-btn" data-act="edit" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn red" data-act="del" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
    body.querySelectorAll('.icon-btn').forEach(b => {
      b.onclick = () => {
        const a = items.find(x => x.id === b.dataset.id);
        if (!a) return;
        if (b.dataset.act === 'edit') open(a);
        else if (b.dataset.act === 'del') askDelete(a);
      };
    });
  }

  function open(a) {
    editingId = a ? a.id : null;
    document.getElementById('modalTitle').textContent = a ? 'تعديل الخدمة' : 'إضافة خدمة';
    document.getElementById('aName').value = a ? a.name : '';
    document.getElementById('aPrice').value = a ? (a.price || '') : '';
    document.getElementById('modal').classList.add('show');
  }

  document.getElementById('addBtn').onclick = () => open(null);
  document.getElementById('close').onclick = () => document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

  document.getElementById('save').onclick = async () => {
    const name = document.getElementById('aName').value.trim();
    const price = Number(document.getElementById('aPrice').value) || 0;
    if (!name) return toast('اسم الخدمة مطلوب', 'error');
    if (editingId) {
      await DB.addons.update(editingId, { name, price });
      await DB.audit.log('addon_update', { id: editingId, name, price });
    } else {
      await DB.addons.add({ id: Date.now().toString(36), hallId, name, price, ts: Date.now() });
      await DB.audit.log('addon_create', { name, price });
    }
    document.getElementById('modal').classList.remove('show');
    toast('تم الحفظ');
    render();
  };

  render();
})();
