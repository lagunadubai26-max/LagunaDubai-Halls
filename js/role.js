(function() {
  var user;
  try { user = JSON.parse(sessionStorage.getItem('laguna_hall_user')); } catch(e) { return; }
  if (!user) return;

  var page = window.location.pathname.split('/').pop();
  var superOnly = ['halls.html'];
  var adminOnly = ['settings.html', 'packages.html', 'addons.html'];
  var employeeRestricted = ['reports.html', 'halls.html', 'settings.html', 'packages.html', 'addons.html'];

  if (user.role !== 'SuperAdmin' && superOnly.includes(page)) { window.location.replace('index.html'); return; }
  if ((user.role === 'Accountant' || user.role === 'Employee') && adminOnly.includes(page)) { window.location.replace('index.html'); return; }
  if (user.role === 'Employee' && employeeRestricted.includes(page)) { window.location.replace('index.html'); return; }

  var avatar = document.getElementById('sidebarAvatar');
  var name = document.getElementById('sidebarName');
  var roleEl = document.getElementById('sidebarRole');
  var hallEl = document.getElementById('sidebarHall');
  if (avatar) avatar.textContent = (user.name || '?').charAt(0);
  if (name) name.textContent = user.name;
  if (roleEl) {
    var labels = { SuperAdmin: 'مدير النظام', HallManager: 'مدير القاعة', Accountant: 'محاسب', Employee: 'موظف' };
    roleEl.textContent = labels[user.role] || user.role;
  }
  if (hallEl && user.hallName) hallEl.textContent = user.hallName;

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function(e) {
      e.preventDefault();
      DB.session.clear();
      sessionStorage.removeItem('laguna_hall_session_start');
      sessionStorage.removeItem('laguna_hall_last_active');
      window.location.href = 'auth.html';
    };
  }

  var switchBtn = document.getElementById('hallSwitchBtn');
  if (switchBtn) {
    switchBtn.onclick = function() {
      window.location.href = 'hall-select.html';
    };
  }
})();
