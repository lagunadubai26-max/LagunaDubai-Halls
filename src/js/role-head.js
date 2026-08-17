(function(){
  try {
    // ── شاشة تحميل ──
    try {
      var ld = document.createElement('div');
      ld.id = 'appLoader';
      ld.innerHTML = '<div class="ld-ic">🏛️</div><div class="ld-bar"></div>';
      setTimeout(function () {
        if (document.body && !document.getElementById('appLoader')) document.body.appendChild(ld);
      }, 0);
      function hideLoader() {
        var el = document.getElementById('appLoader');
        if (el) el.classList.add('hidden');
      }
      window.addEventListener('load', hideLoader);
      setTimeout(hideLoader, 4000);
    } catch (e) {}

    document.addEventListener('DOMContentLoaded', function () {
      try {
        var main = document.querySelector('.main');
        if (!main) return;
        var kids = main.children;
        for (var i = 0; i < kids.length; i++) {
          if (kids[i].classList) {
            kids[i].classList.add('anim-in');
            kids[i].style.animationDelay = Math.min(0.08 * i, 0.45) + 's';
          }
        }
      } catch (e) {}
    });

    var u = JSON.parse(sessionStorage.getItem('laguna_hall_user'));
    if (!u) return;

    var lastActive = Number(sessionStorage.getItem('laguna_hall_last_active')) || 0;
    var sessionStart = Number(sessionStorage.getItem('laguna_hall_session_start')) || 0;
    var now = Date.now();
    var INACTIVITY_MS = 4 * 60 * 60 * 1000;
    var MAX_SESSION_MS = 12 * 60 * 60 * 1000;
    if ((lastActive > 0 && now - lastActive > INACTIVITY_MS) || (sessionStart > 0 && now - sessionStart > MAX_SESSION_MS)) {
      sessionStorage.removeItem('laguna_hall_user');
      sessionStorage.removeItem('laguna_hall_session_start');
      sessionStorage.removeItem('laguna_hall_last_active');
      if (window.location.pathname.indexOf('auth.html') === -1) {
        window.location.replace('auth.html');
      }
      return;
    }
    sessionStorage.setItem('laguna_hall_last_active', String(now));
    if (!sessionStart) sessionStorage.setItem('laguna_hall_session_start', String(now));

    var role = u.role;
    var s = document.createElement('style');
    var rules = [];

    // ── هوية لونية للقاعة الحالية ──
    if (u.hallId) {
      var theme = { crystala: 'hall-crystala', rose: 'hall-rose', loshato: 'hall-loshato' }[u.hallId];
      if (theme) document.body.classList.add(theme);
    }

    if (role !== 'SuperAdmin') {
      rules.push('.super-only{display:none!important}');
      rules.push('#hallSwitchBtn{display:none!important}');
    }
    if (role === 'Accountant' || role === 'Employee') {
      rules.push('.admin-only{display:none!important}');
    }
    if (role === 'Employee') {
      rules.push('.no-employee{display:none!important}');
    }
    s.textContent = rules.join('');
    document.head.appendChild(s);

    // ── شريط تنقل سفلي للموبايل ──
    try {
      var links = [
        { href: 'index.html', icon: 'fa-table-cells-large', label: 'الرئيسية' },
        { href: 'bookings.html', icon: 'fa-calendar-days', label: 'الحجوزات' },
        { href: 'contracts.html', icon: 'fa-file-signature', label: 'العقود' },
        { href: 'payments.html', icon: 'fa-money-bill-wave', label: 'المدفوعات' }
      ];
      if (role !== 'Employee' && role !== 'Accountant') {
        links.push({ href: 'settings.html', icon: 'fa-gear', label: 'الإعدادات' });
      }
      if (role === 'SuperAdmin') {
        links.push({ href: 'halls.html', icon: 'fa-building-columns', label: 'القاعات' });
      }
      var cur = (window.location.pathname.split('/').pop() || 'index.html');
      var nav = document.createElement('nav');
      nav.className = 'mob-nav';
      nav.innerHTML = links.map(l => (
        '<a href="' + l.href + '" class="' + (cur === l.href ? 'active' : '') + '">' +
        '<i class="fa-solid ' + l.icon + '"></i><span>' + l.label + '</span></a>'
      )).join('');
      document.body.appendChild(nav);
      document.body.classList.add('has-mob-nav');
      if (document.querySelector('.main')) {
        document.querySelector('.main').classList.add('mob-pad');
      }
    } catch (e) {
      console.warn('[mob-nav]', e);
    }
  } catch(e){
    console.warn('[role-head]', e);
  }
})();
