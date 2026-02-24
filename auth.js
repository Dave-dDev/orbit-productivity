/* ============================================================
   ORBIT AUTH — Client-Side Authentication Logic
   ============================================================
   Passwords hashed with SHA-256 (Web Crypto API) + per-user salt.
   Users stored in localStorage under 'orbit_auth_users'.
   Session token stored in sessionStorage (or localStorage for "remember me").
   ============================================================ */

(function () {
  'use strict';

  // ── Storage keys ───────────────────────────────────────────
  const USERS_KEY   = 'orbit_auth_users';
  const SESSION_KEY = 'orbit_auth_session';

  const loadUsers   = () => JSON.parse(localStorage.getItem(USERS_KEY)  || '[]');
  const saveUsers   = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
  const loadSession = () => {
    const s = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  };
  const saveSession = (s, persist) =>
    (persist ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));

  const randHex = (n = 16) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

  const sha256 = async (str) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const hashPassword = (pw, salt) => sha256(salt + pw + salt);
  const normName     = (n) => n.trim().toLowerCase(); // normalised username key

  // ── Password strength ───────────────────────────────────────
  const pwStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return [
      { label: '',          color: 'transparent', pct: 0   },
      { label: 'Weak',      color: '#f43f5e',     pct: 25  },
      { label: 'Fair',      color: '#f59e0b',     pct: 50  },
      { label: 'Good',      color: '#38bdf8',     pct: 75  },
      { label: 'Strong 💪', color: '#00d4aa',     pct: 100 },
    ][Math.min(4, s)];
  };

  // ── Toast ───────────────────────────────────────────────────
  let toastTimer;
  const toast = (msg, type = 'success') => {
    let el = document.getElementById('__toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '__toast';
      el.className = 'auth-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
    el.className = `auth-toast ${type}`;
    clearTimeout(toastTimer);
    requestAnimationFrame(() => el.classList.add('visible'));
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
  };

  // ── Theme ───────────────────────────────────────────────────
  let theme = (() => { try { return JSON.parse(localStorage.getItem('orbit_prod_theme')) || 'dark'; } catch { return 'dark'; } })();
  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('top-theme-btn');
    if (btn) btn.textContent = t === 'light' ? '☀️' : '🌙';
  };
  document.getElementById('top-theme-btn').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('orbit_prod_theme', JSON.stringify(theme));
    applyTheme(theme);
  });
  applyTheme(theme);

  // ── Tab switching ───────────────────────────────────────────
  const switchTab = (which) => {
    ['login', 'register'].forEach(t => {
      document.getElementById(`tab-${t}`).classList.toggle('active', t === which);
      document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === which);
      document.getElementById(`panel-${t}`).classList.toggle('active', t === which);
    });
    clearErrors();
  };
  document.querySelectorAll('[data-tab]').forEach(el =>
    el.addEventListener('click', () => switchTab(el.dataset.tab))
  );

  // ── Show/hide password ──────────────────────────────────────
  const bindEye = (btnId, inputId) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      const i = document.getElementById(inputId);
      if (i) i.type = i.type === 'password' ? 'text' : 'password';
    });
  };
  bindEye('toggle-login-pw', 'login-password');
  bindEye('toggle-reg-pw',   'reg-password');

  // ── Password strength meter ─────────────────────────────────
  document.getElementById('reg-password').addEventListener('input', (e) => {
    const s    = pwStrength(e.target.value);
    const fill = document.getElementById('strength-fill');
    const lbl  = document.getElementById('strength-label');
    fill.style.width      = s.pct + '%';
    fill.style.background = s.color;
    lbl.textContent       = e.target.value ? s.label : '';
  });

  // ── Error helpers ───────────────────────────────────────────
  const setError = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  const clearErrors = () => ['login-error', 'reg-error'].forEach(id => setError(id, ''));

  // ── REGISTER ───────────────────────────────────────────────
  document.getElementById('register-btn').addEventListener('click', async () => {
    clearErrors();
    const name    = document.getElementById('reg-name').value.trim();
    const pw      = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!name)                   return setError('reg-error', 'Please enter a username.');
    if (name.length < 2)         return setError('reg-error', 'Username must be at least 2 characters.');
    if (pw.length < 8)           return setError('reg-error', 'Password must be at least 8 characters.');
    if (pw !== confirm)          return setError('reg-error', 'Passwords do not match.');
    if (pwStrength(pw).pct < 25) return setError('reg-error', 'Please choose a stronger password.');

    const users = loadUsers();
    if (users.find(u => normName(u.name) === normName(name)))
      return setError('reg-error', 'That username is already taken.');

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="display:block"></div> Creating account…';

    try {
      const salt = randHex(16);
      const hash = await hashPassword(pw, salt);
      const user = { id: randHex(8), name, salt, hash, createdAt: new Date().toISOString() };
      users.push(user);
      saveUsers(users);

      const session = { userId: user.id, name: user.name, token: randHex(24), createdAt: Date.now() };
      saveSession(session, false);
      localStorage.setItem('orbit_prod_userName', JSON.stringify(user.name));

      toast('Account created! Welcome to Orbit 🌀');
      setTimeout(() => { window.location.href = 'app.html'; }, 800);
    } catch {
      setError('reg-error', 'Something went wrong. Please try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Create Account →';
  });

  // ── LOGIN ──────────────────────────────────────────────────
  document.getElementById('login-btn').addEventListener('click', async () => {
    clearErrors();
    const username = document.getElementById('login-username').value.trim();
    const pw       = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;

    if (!username) return setError('login-error', 'Please enter your username.');
    if (!pw)       return setError('login-error', 'Please enter your password.');

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="display:block"></div> Signing in…';

    try {
      const users = loadUsers();
      const user  = users.find(u => normName(u.name) === normName(username));

      if (!user) {
        await new Promise(r => setTimeout(r, 400));
        setError('login-error', 'No account found with that username.');
        btn.disabled = false; btn.textContent = 'Sign In →'; return;
      }

      const hash = await hashPassword(pw, user.salt);
      if (hash !== user.hash) {
        setError('login-error', 'Incorrect password. Please try again.');
        btn.disabled = false; btn.textContent = 'Sign In →'; return;
      }

      const expiresAt = remember ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null;
      saveSession({ userId: user.id, name: user.name, token: randHex(24), createdAt: Date.now(), expiresAt }, remember);
      localStorage.setItem('orbit_prod_userName', JSON.stringify(user.name));
      toast(`Welcome back, ${user.name}! ✨`);
      setTimeout(() => { window.location.href = 'app.html'; }, 700);
    } catch {
      setError('login-error', 'Something went wrong. Please try again.');
      btn.disabled = false; btn.textContent = 'Sign In →';
    }
  });

  // Enter key support
  ['login-username', 'login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn').click();
    })
  );
  ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('register-btn').click();
    })
  );

  // ── FORGOT PASSWORD ─────────────────────────────────────────
  const forgotModal = document.getElementById('forgot-modal');

  document.getElementById('forgot-pw-btn').addEventListener('click', () => {
    document.getElementById('reset-username').value = document.getElementById('login-username').value;
    document.getElementById('new-pw-box').style.display = 'none';
    document.getElementById('new-pw-box').innerHTML = '';
    forgotModal.classList.add('open');
  });
  document.getElementById('forgot-cancel-btn').addEventListener('click', () =>
    forgotModal.classList.remove('open')
  );

  document.getElementById('forgot-submit-btn').addEventListener('click', async () => {
    const username = document.getElementById('reset-username').value.trim();
    if (!username) { toast('Please enter your username.', 'error'); return; }

    const users = loadUsers();
    const user  = users.find(u => normName(u.name) === normName(username));
    if (!user) { toast('No account found with that username.', 'error'); return; }

    // Generate temp password, re-hash, show on screen
    const tempPw  = 'Orbit-' + randHex(4);
    const newSalt = randHex(16);
    const newHash = await hashPassword(tempPw, newSalt);
    user.salt = newSalt;
    user.hash = newHash;
    saveUsers(users);

    const box = document.getElementById('new-pw-box');
    box.style.display = 'block';
    box.innerHTML = `Temporary password:<br><strong style="font-size:17px;letter-spacing:1px">${tempPw}</strong><br><span style="font-size:11px;opacity:0.7">Sign in with this, then update your password.</span>`;
  });

  // ── INIT: redirect if already logged in ─────────────────────
  const session = loadSession();
  if (session) {
    const expired = session.expiresAt && Date.now() > session.expiresAt;
    if (!expired) { window.location.href = 'app.html'; return; }
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

})();
