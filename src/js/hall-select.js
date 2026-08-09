(function () {
  const stored = DB.session.get();
  if (!stored) { window.location.href = 'auth.html'; return; }
  if (stored.role !== 'SuperAdmin' && stored.hallId) { window.location.href = 'index.html'; return; }

  document.getElementById('backBtn').onclick = () => { DB.session.clear(); window.location.href = 'auth.html'; };

  (async () => {
    const grid = document.getElementById('hallGrid');
    const halls = await DB.halls.all();
    if (halls.length === 0) { grid.innerHTML = '<div class="empty">لا توجد قاعات بعد</div>'; return; }
    grid.innerHTML = '';
    halls.forEach(h => {
      const card = document.createElement('div');
      card.className = 'hall-pick';
      card.innerHTML = `<div class="ic">${escapeHtml(h.emoji || '🏛️')}</div><h3>${escapeHtml(h.name)}</h3><p>${escapeHtml(h.address || '')}</p>`;
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
