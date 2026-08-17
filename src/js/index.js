const STATUS_AR = { reserved: 'محجوز', confirmed: 'مؤكد', canceled: 'ملغي', completed: 'منتهي' };
const STATUS_CLS = { reserved: 'reserved', confirmed: 'confirmed', canceled: 'canceled', completed: 'completed' };

function fmtDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) { return iso; }
}

function monthPrefix(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

// عداد متحرك للأرقام
function animateCount(el, target, opts) {
  opts = opts || {};
  const isMoney = opts.money;
  const dur = opts.dur || 800;
  const t0 = performance.now();
  const fmt = v => isMoney ? DB.fmt(v) : v.toLocaleString('ar-EG');
  function tick(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

(function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  const now = new Date();
  const month = monthPrefix(now);
  const year = String(now.getFullYear());
  const todayKey = DB.todayKey();
  const inDays = n => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  Promise.all([DB.bookings.all(), DB.payments.all(), DB.packages.all()]).then(([bookings, payments, pkgs]) => {
    const bHall = bookings.filter(b => b.hallId === hallId && b.status !== 'canceled');
    const mBookings = bHall.filter(b => monthPrefix(new Date(b.date)) === month);
    const packageName = id => { const p = pkgs.find(x => x.id === id); return p ? p.name : '—'; };

    document.getElementById('stMonthCount').textContent = mBookings.length;
    document.getElementById('stToday').textContent = bHall.filter(b => b.date === todayKey).length;

    animateCount(document.getElementById('stMonthCount'), mBookings.length);
    animateCount(document.getElementById('stToday'), bHall.filter(b => b.date === todayKey).length);

    const pHall = payments.filter(p => p.hallId === hallId);
    const mPay = pHall.filter(p => monthPrefix(new Date(p.date)) === month);
    const mRev = mPay.reduce((s, p) => s + Number(p.amount || 0), 0);
    const mDep = mPay.filter(p => p.type === 'deposit').reduce((s, p) => s + Number(p.amount || 0), 0);
    animateCount(document.getElementById('stMonthRev'), mRev, { money: true });
    animateCount(document.getElementById('stDeposits'), mDep, { money: true });

    // ── إحصائيات إضافية ──
    const yPay = pHall.filter(p => (p.date || '').slice(0, 4) === year);
    const yRev = yPay.reduce((s, p) => s + Number(p.amount || 0), 0);
    animateCount(document.getElementById('stYearRev'), yRev, { money: true });

    const totals = bHall.map(b => Number(b.total || 0));
    const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    animateCount(document.getElementById('stAvg'), avg, { money: true });

    const paidPer = {};
    pHall.forEach(p => { paidPer[p.bookingId] = (paidPer[p.bookingId] || 0) + Number(p.amount || 0); });
    const remain = bHall.reduce((s, b) => s + Math.max(0, Number(b.total || 0) - (paidPer[b.id] || 0)), 0);
    animateCount(document.getElementById('stRemain'), remain, { money: true });

    const next14 = bHall.filter(b => b.date >= todayKey && b.date <= inDays(14));
    animateCount(document.getElementById('stNext14'), next14.length);

    // ── أقرب فرح قادم (عد تنازلي) ──
    const upcoming = bHall.filter(b => b.date >= todayKey && b.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date));
    const nextP = upcoming[0];
    const npEl = document.getElementById('npCount');
    if (nextP) {
      const diffDays = Math.round((new Date(nextP.date) - now) / 86400000);
      document.getElementById('npName').textContent = nextP.clientName;
      document.getElementById('npMeta').textContent = fmtDate(nextP.date) + ' · ' + packageName(nextP.packageId);
      const left = diffDays === 0 ? 'اليوم 🎉' : diffDays === 1 ? 'بعد يوم واحد' : diffDays + ' يوم';
      const cls = diffDays <= 3 ? 'np-urgent' : '';
      npEl.className = 'np-count ' + cls;
      npEl.innerHTML = '<b>' + left.split(' ')[0] + '</b><span>بعد فرحك؟ لا، موعد الفرح</span>';
      npEl.innerHTML = `<b>${left}</b><span>${diffDays === 0 ? 'موعد الفرح اليوم' : 'متبقي على الفرح'}</span>`;
    } else {
      document.getElementById('npName').textContent = 'لا توجد حجوزات قادمة';
      document.getElementById('npMeta').textContent = 'احجز أول فرح من صفحة الحجوزات';
      npEl.innerHTML = '<b>—</b><span>بدون أفراح قادمة</span>';
    }

    // ── الحجوزات القادمة ──
    const up = bHall.filter(b => b.date >= todayKey && b.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const upEl = document.getElementById('upcomingList');
    upEl.innerHTML = up.length ? up.map(b => {
      const diff = Math.round((new Date(b.date) - now) / 86400000);
      const diffBadge = diff === 0 ? '<span class="badge confirmed">اليوم 🎉</span>' : diff <= 7 ? `<span class="badge pending">بعد ${diff} يوم</span>` : `<span class="badge reserved">بعد ${diff} يوم</span>`;
      return `
    <div class="flex" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span><b>${escapeHtml(b.clientName)}</b><div class="muted" style="font-size:11px">${fmtDate(b.date)}</div></span>
      <span style="display:flex;gap:6px;align-items:center">${diffBadge}<span class="badge ${STATUS_CLS[b.status]}">${STATUS_AR[b.status]}</span></span>
    </div>`;
    }).join('') : '<div class="empty">لا توجد حجوزات قادمة</div>';

    // ── آخر المدفوعات ──
    const pl = [...pHall].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 6);
    const payEl = document.getElementById('payList');
    payEl.innerHTML = pl.length ? pl.map(p => `
    <div class="flex" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span><b>${DB.fmt(p.amount)}</b><div class="muted" style="font-size:11px">${fmtDate(p.date)} · ${p.method === 'cash' ? 'نقدي' : 'تحويل'}</div></span>
      <span class="muted" style="font-size:11px">${escapeHtml(p.note || '')}</span>
    </div>`).join('') : '<div class="empty">لا توجد مدفوعات</div>';

    // ── تنبيهات الأقساط المتبقية ──
    const due = bHall
      .filter(b => b.status !== 'completed' && Math.max(0, Number(b.total || 0) - (paidPer[b.id] || 0)) > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
    const dueEl = document.getElementById('dueList');
    dueEl.innerHTML = due.length ? due.map(b => {
      const rem = Math.max(0, Number(b.total || 0) - (paidPer[b.id] || 0));
      const late = b.date < todayKey;
      return `
    <div class="flex" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span><b>${escapeHtml(b.clientName)}</b><div class="muted" style="font-size:11px">${fmtDate(b.date)} ${late ? '· متأخر' : ''}</div></span>
      <span class="badge ${late ? 'pending' : 'reserved'}">متبقي ${DB.fmt(rem)}</span>
    </div>`;
    }).join('') : '<div class="empty">لا توجد أقساط متبقية 🎉</div>';

    // ── الإيراد آخر 6 شهور ──
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthPrefix(d);
      const rev = pHall.filter(p => (p.date || '').slice(0, 7) === k).reduce((s, p) => s + Number(p.amount || 0), 0);
      months.push({ k, label: d.toLocaleDateString('ar-EG', { month: 'short' }), rev });
    }
    const max = Math.max(1, ...months.map(m => m.rev));
    document.getElementById('barChart').innerHTML = months.map(m => `
      <div class="bar-col">
        <div class="bar-val">${m.rev ? DB.fmt(m.rev).replace(' ج.م', '') : ''}</div>
        <div class="bar" title="${DB.fmt(m.rev)}" style="height:${Math.round((m.rev / max) * 100)}%"></div>
        <span class="muted">${escapeHtml(m.label)}</span>
      </div>`).join('');

    // ── حالة الشهر ──
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bookedDays = new Set(mBookings.map(b => b.date)).size;
    document.getElementById('monthStatus').innerHTML = `
    <div class="flex" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><span>أيام محجوزة</span><b>${bookedDays}</b></div>
    <div class="flex" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><span>أيام فاضية</span><b>${Math.max(0, daysInMonth - bookedDays)}</b></div>
    <div class="flex" style="justify-content:space-between;padding:9px 0"><span>عدد أيام الشهر</span><b>${daysInMonth}</b></div>
    <div class="mt"><a href="bookings.html" class="btn sm ghost">فتح التقويم</a></div>`;
  });
})();
