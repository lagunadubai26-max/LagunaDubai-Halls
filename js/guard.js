function guard() {
  const u = DB.session.get();
  if (!u) { window.location.href = 'auth.html'; return null; }
  if (u.role === 'SuperAdmin' && !u.hallId) { window.location.href = 'hall-select.html'; return null; }
  const chip = document.getElementById('hallChip');
  if (chip && u.hallName) chip.textContent = '🏛️ ' + u.hallName;
  return u;
}
