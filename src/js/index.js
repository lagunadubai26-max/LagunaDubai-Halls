const STATUS_AR = { reserved: 'محجوز', confirmed: 'مؤكد', canceled: 'ملغي', completed: 'منتهي' };
const STATUS_CLS = { reserved: 'reserved', confirmed: 'confirmed', canceled: 'canceled', completed: 'completed' };

function fmtDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) { return iso; }
}

function monthPrefix(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

(async function () {
  const u = guard();
  if (!u) return;
  const hallId = u.hallId;
  const now = new Date();
  const month = monthPrefix(now);

  const [bookings, payments] = await Promise.all([
    DB.bookings.all(), DB.payments.all()
  ]);
  const bHall = bookings.filter(b => b.hallId === hallId && b.status !== 'canceled');
  const mBookings = bHall.filter(b => monthPrefix(new Date(b.date)) === month);
  const todayKey = DB.todayKey();

  document.getElementById('stMonthCount').textContent = mBookings.length;
  document.getElementById('stToday').textContent = bHall.filter(b => b.date === todayKey).length;

  const pHall = payments.filter(p => p.hallId === hallId);
  const mPay = pHall.filter(p => monthPrefix(new Date(p.date)) === month);
  const mRev = mPay.reduce((s, p) => s + Number(p.amount || 0), 0);
  const mDep = mPay.filter(p => p.type === 'deposit').reduce((s, p) => s + Number(p.amount || 0), 0);
  document.getElementById('stMonthRev').textContent = DB.fmt(mRev);
  document.getElementById('stDeposits').textContent = DB.fmt(mDep);

  // upcoming
  const up = bHall.filter(b => b.date >= todayKey && b.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const upEl = document.getElementById('upcomingList');
  upEl.innerHTML = up.length ? up.map(b => `
    <div class="flex" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span><b>${escapeHtml(b.clientName)}</b><div class="muted" style="font-size:11px">${fmtDate(b.date)}</div></span>
      <span class="badge ${STATUS_CLS[b.status]}">${STATUS_AR[b.status]}</span>
    </div>`).join('') : '<div class="empty">لا توجد حجوزات قادمة</div>';

  // payments
  const pl = [...pHall].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 6);
  const payEl = document.getElementById('payList');
  payEl.innerHTML = pl.length ? pl.map(p => `
    <div class="flex" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span><b>${DB.fmt(p.amount)}</b><div class="muted" style="font-size:11px">${fmtDate(p.date)} · ${p.method === 'cash' ? 'نقدي' : 'تحويل'}</div></span>
      <span class="muted" style="font-size:11px">${escapeHtml(p.note || '')}</span>
    </div>`).join('') : '<div class="empty">لا توجد مدفوعات</div>';

  // month status
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const bookedDays = new Set(mBookings.map(b => b.date)).size;
  document.getElementById('monthStatus').innerHTML = `
    <div class="flex" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><span>أيام محجوزة</span><b>${bookedDays}</b></div>
    <div class="flex" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><span>أيام فاضية</span><b>${Math.max(0, daysInMonth - bookedDays)}</b></div>
    <div class="flex" style="justify-content:space-between;padding:9px 0"><span>عدد أيام الشهر</span><b>${daysInMonth}</b></div>
    <div class="mt"><a href="bookings.html" class="btn sm ghost">فتح التقويم</a></div>`;
})();
