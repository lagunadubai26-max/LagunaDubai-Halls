(function () {
  const stored = DB.session.get();
  if (!stored) { window.location.href = 'auth.html'; return; }
  if (stored.role !== 'SuperAdmin' && stored.hallId) { window.location.href = 'index.html'; return; }

  document.getElementById('backBtn').onclick = () => { DB.session.clear(); window.location.href = 'auth.html'; };
  const nameEl = document.getElementById('adminName');
  if (nameEl && stored.name) nameEl.textContent = stored.name;

  (async () => {
    const grid = document.getElementById('hallGrid');
    const halls = await DB.halls.all();
    if (halls.length === 0) { grid.innerHTML = '<div class="empty">لا توجد قاعات بعد</div>'; return; }

    const [bookings, payments] = await Promise.all([DB.bookings.all(), DB.payments.all()]);
    const today = DB.todayKey();
    const monthK = today.slice(0, 7);
    const upcomingPer = {};
    const monthBookPer = {};
    const revPer = {};
    bookings.filter(b => b.status !== 'canceled').forEach(b => {
      if (b.date >= today) upcomingPer[b.hallId] = (upcomingPer[b.hallId] || 0) + 1;
      if ((b.date || '').slice(0, 7) === monthK) monthBookPer[b.hallId] = (monthBookPer[b.hallId] || 0) + 1;
    });
    payments.filter(p => (p.date || '').slice(0, 7) === monthK).forEach(p => {
      revPer[p.hallId] = (revPer[p.hallId] || 0) + Number(p.amount || 0);
    });

    grid.innerHTML = '';
    halls.forEach((h, i) => {
      const card = document.createElement('div');
      const accent = ({ crystala: '#2563eb', rose: '#e11d48', loshato: '#7c3aed' }[h.id] || 'var(--accent)');
      card.className = 'hall-card';
      card.style.animationDelay = (i * 70) + 'ms';
      card.style.setProperty('--hall-accent', accent);
      const upcoming = upcomingPer[h.id] || 0;
      const bookedMonth = monthBookPer[h.id] || 0;
      const revMonth = revPer[h.id] || 0;
      const meta = h.address ? escapeHtml(h.address) : (h.phone ? escapeHtml(h.phone) : 'قاعة أفراح — جاهزة للحجز');
      const phone = h.phone ? `<div class="h-meta"><i class="fa-solid fa-phone"></i> ${escapeHtml(h.phone)}</div>` : '';
      const capacity = h.capacity ? `<div class="h-meta"><i class="fa-solid fa-users"></i> تسع حتى ${h.capacity} فرد</div>` : '';
      card.innerHTML = `
        <div class="h-topbar"></div>
        <div class="h-ic">${escapeHtml(h.emoji || '🏛️')}</div>
        <h3>${escapeHtml(h.name)}</h3>
        <div class="h-meta">${meta}</div>
        ${phone}
        ${capacity}
        <div class="h-stats">
          <div class="h-stat"><i class="fa-solid fa-calendar-check"></i><span>أفراح قادمة <b>${upcoming}</b></span></div>
          <div class="h-stat"><i class="fa-solid fa-calendar-days"></i><span>هذا الشهر <b>${bookedMonth}</b></span></div>
          <div class="h-stat"><i class="fa-solid fa-sack-dollar"></i><span>إيراد الشهر <b>${revMonth ? Number(revMonth).toLocaleString('ar-EG') : '—'}</b></span></div>
        </div>
        <div class="h-enter">الدخول إلى القاعة <i class="fa-solid fa-arrow-left"></i></div>`;
      card.onclick = () => {
        stored.hallId = h.id;
        stored.hallName = h.name;
        stored.emoji = h.emoji || '🏛️';
        DB.session.set(stored);
        window.location.href = 'index.html';
      };
      grid.appendChild(card);
    });
  })();
})();
