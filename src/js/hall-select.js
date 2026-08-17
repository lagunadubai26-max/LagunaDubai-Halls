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

    const bookings = await DB.bookings.all();
    const today = DB.todayKey();
    const upcomingPer = {};
    bookings.filter(b => b.status !== 'canceled' && b.date >= today).forEach(b => {
      upcomingPer[b.hallId] = (upcomingPer[b.hallId] || 0) + 1;
    });

    grid.innerHTML = '';
    halls.forEach((h, i) => {
      const card = document.createElement('div');
      card.className = 'hall-card';
      card.style.animationDelay = (i * 70) + 'ms';
      const upcoming = upcomingPer[h.id] || 0;
      const meta = h.address ? escapeHtml(h.address) : (h.phone ? escapeHtml(h.phone) : 'قاعة أفراح — جاهزة للحجز');
      const phone = h.phone ? `<div class="h-meta">${escapeHtml(h.phone)}</div>` : '';
      const capacity = h.capacity ? `<div class="h-meta"><i class="fa-solid fa-users" style="margin-left:4px"></i>تسع حتى ${h.capacity} فرد</div>` : '';
      card.innerHTML = `
        <div class="h-ic">${escapeHtml(h.emoji || '🏛️')}</div>
        <h3>${escapeHtml(h.name)}</h3>
        <div class="h-meta">${meta}</div>
        ${phone}
        ${capacity}
        <div class="h-stat"><i class="fa-solid fa-calendar-check" style="color:var(--accent)"></i> أفراح قادمة: <b>${upcoming}</b></div>
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
