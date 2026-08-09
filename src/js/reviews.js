(function () {
  if (!guard()) return;
  let reviews = [];

  function render() {
    const q = document.getElementById('revSearch').value.trim().toLowerCase();
    const f = document.getElementById('revFilter').value;
    let list = reviews.filter(r => {
      const low = Number(r.rating) < 3;
      if (f === 'pos' && low) return false;
      if (f === 'neg' && !low) return false;
      return !q || (r.comment || '').toLowerCase().includes(q) || (r.reviewerName || '').toLowerCase().includes(q);
    });
    document.getElementById('revCount').textContent = list.length + ' تقييم';

    const avg = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0';
    document.getElementById('rAvg').textContent = avg + ' ★';
    document.getElementById('rPos').textContent = reviews.filter(r => Number(r.rating) >= 3).length;
    document.getElementById('rNeg').textContent = reviews.filter(r => Number(r.rating) < 3).length;

    const el = document.getElementById('revList');
    if (!list.length) { el.innerHTML = '<div class="empty">لا توجد تقييمات مطابقة</div>'; return; }
    el.innerHTML = list.map(r => {
      const low = Number(r.rating) < 3;
      const dt = r.createdAt ? (r.createdAt.toMillis ? new Date(r.createdAt.toMillis()) : new Date(r.createdAt)) : null;
      return `<div class="rev" style="margin-bottom:10px;${low ? 'border-color:var(--red)' : ''}">
        <div class="rev-head"><b>${escapeHtml(r.reviewerName)}</b><span class="stars ${low ? 'low' : ''}">${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 1)))}</span>
          ${low ? '<span class="badge canceled">شكوى</span>' : ''}
        </div>
        <p>${escapeHtml(r.comment)}</p>
        <div class="meta">${dt ? dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
      </div>`;
    }).join('');
  }

  document.getElementById('revSearch').oninput = render;
  document.getElementById('revFilter').onchange = render;

  (async () => {
    reviews = await REVIEWS.get();
    render();
  })();
})();
