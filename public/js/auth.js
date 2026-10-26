// Autenticazione Tempra Gym.

let currentUser = null;

function showToast(message, type = 'success') {
  const colors = { success: 'border-lime-300/40 bg-lime-950/80 text-lime-100', error: 'border-rose-500/40 bg-rose-950/80 text-rose-100' };
  const toast = document.createElement('div');
  toast.className = `card px-4 py-3 text-sm font-semibold ${colors[type]}`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Operazione non completata.');
  return data;
}

function showApp(user) {
  currentUser = user;
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('profile-name').textContent = user.nome;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-since').textContent = new Date(user.created_at).toLocaleDateString('it-IT');
  document.getElementById('profile-goal').textContent = user.obiettivo;
  document.getElementById('profile-tdee').textContent = `${user.dispendio} kcal`;
  document.getElementById('p-nome').value = user.nome;
  document.getElementById('p-obiettivo').value = user.obiettivo;
  document.getElementById('p-dispendio').value = user.dispendio;
  if (window.loadGymData) loadGymData();
}

function showAuth() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('login-tab').className = mode === 'login' ? 'py-2.5 rounded-xl bg-lime-300 text-[#08110a]' : 'py-2.5 rounded-xl text-slate-400';
  document.getElementById('register-tab').className = mode === 'register' ? 'py-2.5 rounded-xl bg-lime-300 text-[#08110a]' : 'py-2.5 rounded-xl text-slate-400';
  document.getElementById('auth-nome').parentElement.classList.toggle('hidden', mode !== 'register');
  document.getElementById('auth-nome').required = mode === 'register';
  document.getElementById('auth-submit').textContent = mode === 'login' ? 'Accedi' : 'Crea account';
}

document.getElementById('login-tab').addEventListener('click', () => setAuthMode('login'));
document.getElementById('register-tab').addEventListener('click', () => setAuthMode('register'));

document.getElementById('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = document.getElementById('auth-error');
  error.classList.add('hidden');
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    if (authMode === 'register') {
      const nome = document.getElementById('auth-nome').value.trim();
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ nome, email, password }) });
      showToast('Account creato.', 'success');
      showApp(data.user);
    } else {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      showToast('Bentornato.', 'success');
      showApp(data.user);
    }
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  showToast('Sessione terminata.');
  showAuth();
});

(async function init() {
  try {
    const data = await api('/api/auth/me');
    showApp(data.user);
  } catch (_) {
    showAuth();
  }
})();
