(function(){
  try {
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
    if ((now - lastActive > INACTIVITY_MS) || (sessionStart > 0 && now - sessionStart > MAX_SESSION_MS)) {
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
  } catch(e){
    console.warn('[role-head]', e);
  }
})();
