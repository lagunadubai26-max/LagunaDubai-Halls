(function () {
  const u = guard();
  if (!u) return;
  if (u.role !== 'SuperAdmin') { window.location.href = 'index.html'; return; }
  let editingHall = null;

  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function render() {
    const [halls, users] = await Promise.all([DB.halls.all(), DB.users.all()]);
    const grid = document.getElementById('hallGrid');
    if (!halls.length) { grid.innerHTML = '<div class="empty">لا توجد قاعات — أضف أول قاعة</div>'; return; }
    grid.innerHTML = halls.map(h => {
      const managers = users.filter(x => x.hallId === h.id && x.role === 'HallManager');
      return `<div class="card">
        <h3 class="title"><i class="fa-solid fa-building-columns"></i> ${escapeHtml(h.name)}</h3>
        <p class="muted" style="font-size:13px">${escapeHtml(h.address || '')} ${h.phone ? ' · ' + escapeHtml(h.phone) : ''}</p>
        <div class="muted" style="font-size:12px;margin:8px 0">المدراء:
          ${managers.length ? managers.map(m => `<span class="badge reserved" style="margin-left:4px">${escapeHtml(m.email)}</span>`).join('') : '<span>لا يوجد</span>'}
        </div>
        <div class="flex">
          <div class="spacer"></div>
          <button class="icon-btn" data-act="edit" data-id="${escapeHtml(h.id)}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" data-act="manager" data-id="${escapeHtml(h.id)}" title="إضافة مدير"><i class="fa-solid fa-user-plus"></i></button>
          <button class="icon-btn red" data-act="del" data-id="${escapeHtml(h.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.icon-btn').forEach(b => {
      b.onclick = () => {
        const h = halls.find(x => x.id === b.dataset.id);
        if (!h) return;
        if (b.dataset.act === 'edit') open(h);
        else if (b.dataset.act === 'manager') openManager(h);
        else if (confirm('حذف القاعة ' + h.name + '؟ (لن تُحذف بيانات حجوزاتها)')) DB.halls.remove(h.id).then(render);
      };
    });
  }

  function open(h) {
    editingHall = h ? h.id : null;
    document.getElementById('modalTitle').textContent = h ? 'تعديل قاعة' : 'إضافة قاعة';
    document.getElementById('hName').value = h ? h.name : '';
    document.getElementById('hAddress').value = h ? (h.address || '') : '';
    document.getElementById('hPhone').value = h ? (h.phone || '') : '';
    document.getElementById('hEmail').value = '';
    document.getElementById('hPass').value = '';
    document.getElementById('modal').classList.add('show');
  }

  function openManager(h) {
    editingHall = h.id;
    document.getElementById('modalTitle').textContent = 'إضافة مدير — ' + h.name;
    document.getElementById('hName').value = h.name;
    document.getElementById('hAddress').value = h.address || '';
    document.getElementById('hPhone').value = h.phone || '';
    document.getElementById('hEmail').value = '';
    document.getElementById('hPass').value = '';
    document.getElementById('modal').classList.add('show');
  }

  document.getElementById('addHallBtn').onclick = () => open(null);
  document.getElementById('close').onclick = () => document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') e.target.classList.remove('show'); };

  document.getElementById('save').onclick = async () => {
    const name = document.getElementById('hName').value.trim();
    const email = document.getElementById('hEmail').value.trim().toLowerCase();
    const pass = document.getElementById('hPass').value;
    if (!name) return toast('اسم القاعة مطلوب', 'error');
    const existing = await DB.halls.all();
    try {
      if (editingHall) {
        const h = existing.find(x => x.id === editingHall);
        await DB.halls.update(editingHall, { name, address: document.getElementById('hAddress').value.trim(), phone: document.getElementById('hPhone').value.trim() });
        if (email && pass) {
          if ((await DB.users.all()).some(x => x.email && x.email.toLowerCase() === email)) return toast('هذا البريد مستخدم مسبقاً', 'error');
          await DB.users.add({ id: Date.now().toString(36), email, name: 'مدير ' + name, password: await PASSWORD_UTILS.hash(pass), role: 'HallManager', hallId: editingHall, active: 1 });
          toast('تم إضافة مدير القاعة');
        }
        await DB.audit.log('hall_update', { id: editingHall, name });
      } else {
        const id = Date.now().toString(36);
        await DB.halls.add({ id, name, address: document.getElementById('hAddress').value.trim(), phone: document.getElementById('hPhone').value.trim(), active: 1 });
        if (email && pass) {
          if ((await DB.users.all()).some(x => x.email && x.email.toLowerCase() === email)) return toast('هذا البريد مستخدم مسبقاً', 'error');
          await DB.users.add({ id: Date.now().toString(36), email, name: 'مدير ' + name, password: await PASSWORD_UTILS.hash(pass), role: 'HallManager', hallId: id, active: 1 });
        }
        await DB.audit.log('hall_create', { id, name });
      }
      document.getElementById('modal').classList.remove('show');
      toast('تم الحفظ');
      render();
    } catch (e) { toast('خطأ: ' + e.message, 'error'); }
  };

  render();
})();
