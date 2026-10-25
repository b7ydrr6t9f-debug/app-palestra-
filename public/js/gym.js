// Dashboard, allenamenti, progressi e profilo.

let workouts = [];
let checkins = [];

function vaiASezione(nome) {
  document.querySelectorAll('[data-section]').forEach((button) => button.classList.toggle('active', button.dataset.section === nome));
  ['dashboard', 'allenamento', 'progressi', 'profilo'].forEach((section) => document.getElementById(`sec-${section}`).classList.toggle('hidden', section !== nome));
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function exerciseVolume(item) {
  return item.peso ? item.serie * item.ripetizioni * item.peso : 0;
}

async function loadGymData() {
  [workouts, checkins] = await Promise.all([api('/api/workouts'), api('/api/checkin')]);
  renderDashboard();
  renderWorkouts();
  renderCheckins();
  renderProgressChart();
}

function renderDashboard() {
  const volume = workouts.reduce((total, item) => total + exerciseVolume(item), 0);
  const exercises = new Set(workouts.map((item) => item.esercizio));
  document.getElementById('stat-workouts').textContent = new Set(workouts.map((item) => item.data)).size;
  document.getElementById('stat-volume').textContent = Math.round(volume).toLocaleString('it-IT');
  document.getElementById('stat-exercises').textContent = exercises.size;
  document.getElementById('stat-last').textContent = workouts[0] ? formatDate(workouts[0].data) : '—';

  document.getElementById('recent-workouts').innerHTML = workouts.slice(0, 5).map((item) => `
    <div class="flex items-center justify-between rounded-2xl bg-white/[.03] border border-white/5 px-4 py-3">
      <div><div class="text-sm font-bold text-white">${item.esercizio}</div><div class="text-xs text-slate-500">${formatDate(item.data)}</div></div>
      <div class="text-sm font-bold text-lime-300">${item.serie}×${item.ripetizioni}${item.peso ? ` · ${item.peso} kg` : ''}</div>
    </div>`).join('') || '<p class="text-sm text-slate-500">Nessun allenamento registrato.</p>';
}

function renderWorkouts() {
  const grouped = workouts.reduce((groups, item) => {
    groups[item.data] = groups[item.data] || [];
    groups[item.data].push(item);
    return groups;
  }, {});

  const dates = Object.keys(grouped);
  document.getElementById('workout-history').innerHTML = dates.length ? dates.map((date) => {
    const volume = grouped[date].reduce((total, item) => total + exerciseVolume(item), 0);
    return `
      <div class="rounded-3xl border border-white/5 overflow-hidden">
        <div class="flex items-center justify-between bg-white/[.03] px-5 py-3"><span class="text-sm font-bold text-lime-300">${formatDate(date)}</span><span class="text-xs text-slate-500">Volume: ${Math.round(volume).toLocaleString('it-IT')} kg</span></div>
        ${grouped[date].map((item) => `
          <div class="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span class="text-sm text-white">${item.esercizio}</span>
            <div class="flex items-center gap-3"><span class="text-xs text-slate-400">${item.serie}×${item.ripetizioni}${item.peso ? ` · ${item.peso} kg` : ''}</span><button class="text-slate-500 hover:text-rose-300" onclick="deleteWorkout(${item.id})"><i class="fa-solid fa-trash-can"></i></button></div>
          </div>`).join('')}
      </div>`;
  }).join('') : '<p class="text-sm text-slate-500">Nessun allenamento registrato.</p>';

  const select = document.getElementById('progress-exercise');
  const current = select.value;
  select.innerHTML = '<option value="">Scegli un esercizio</option>' + [...new Set(workouts.map((item) => item.esercizio))].sort().map((name) => `<option value="${name}">${name}</option>`).join('');
  if (current) select.value = current;
}

function renderCheckins() {
  document.getElementById('checkin-history').innerHTML = checkins.map((item) => `
    <div class="flex items-center justify-between rounded-2xl bg-white/[.03] border border-white/5 px-4 py-3">
      <div><div class="text-sm font-bold text-white">${formatDate(item.data)}</div><div class="text-xs text-slate-500">${['vita','fianchi','petto','braccio','coscia'].filter((key) => item[key] != null).map((key) => `${key} ${item[key]} cm`).join(' · ') || 'Solo peso'}</div></div>
      <div class="flex items-center gap-3"><span class="text-sm font-bold text-lime-300">${item.peso} kg</span><button class="text-slate-500 hover:text-rose-300" onclick="deleteCheckin(${item.id})"><i class="fa-solid fa-trash-can"></i></button></div>
    </div>`).join('') || '<p class="text-sm text-slate-500">Nessun check-in registrato.</p>';
}

function renderProgressChart() {
  const exercise = document.getElementById('progress-exercise').value;
  const chart = document.getElementById('progress-chart');
  const points = workouts.filter((item) => item.esercizio === exercise && item.peso != null)
    .reduce((acc, item) => { acc[item.data] = Math.max(acc[item.data] || 0, item.peso); return acc; }, {});
  const series = Object.entries(points).sort(([a], [b]) => a.localeCompare(b));

  if (series.length < 2) {
    chart.innerHTML = '<text x="300" y="110" text-anchor="middle" fill="#64748b" font-size="14">Registra almeno due sessioni con carico</text>';
    return;
  }

  const values = series.map(([, item]) => item.peso);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const coords = series.map(([date, item], index) => `${(index / (series.length - 1)) * 560 + 20},${190 - ((item.peso - min) / range) * 150}`).join(' ');
  chart.innerHTML = `<polyline points="${coords}" fill="none" stroke="#bef264" stroke-width="3" stroke-linecap="round"/><circle cx="${coords.split(' ').at(-1).split(',')[0]}" cy="${coords.split(' ').at(-1).split(',')[1]}" r="5" fill="#bef264"/>`;
}

async function deleteWorkout(id) {
  if (!confirm('Eliminare questo esercizio?')) return;
  await api(`/api/workouts/${id}`, { method: 'DELETE' });
  showToast('Esercizio eliminato.');
  await loadGymData();
}

async function deleteCheckin(id) {
  if (!confirm('Eliminare questo check-in?')) return;
  await api(`/api/checkin/${id}`, { method: 'DELETE' });
  showToast('Check-in eliminato.');
  await loadGymData();
}

document.getElementById('workout-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    esercizio: document.getElementById('w-esercizio').value.trim(),
    serie: document.getElementById('w-serie').value,
    ripetizioni: document.getElementById('w-ripetizioni').value,
    peso: document.getElementById('w-peso').value,
    data: document.getElementById('w-data').value || new Date().toISOString().slice(0, 10),
  };
  try {
    await api('/api/workouts', { method: 'POST', body: JSON.stringify(payload) });
    event.target.reset();
    document.getElementById('w-data').value = new Date().toISOString().slice(0, 10);
    showToast('Esercizio aggiunto.');
    await loadGymData();
  } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('checkin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(['peso','vita','fianchi','petto','braccio','coscia'].map((id) => [id, document.getElementById(`c-${id}`).value]));
  try {
    await api('/api/checkin', { method: 'POST', body: JSON.stringify(payload) });
    event.target.reset();
    showToast('Check-in salvato.');
    await loadGymData();
  } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('progress-exercise').addEventListener('change', renderProgressChart);

document.getElementById('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ nome: document.getElementById('p-nome').value, obiettivo: document.getElementById('p-obiettivo').value, dispendio: document.getElementById('p-dispendio').value }) });
    showToast('Profilo aggiornato.');
    showApp(data.user);
  } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('w-data').value = new Date().toISOString().slice(0, 10);
document.getElementById('w-data').max = new Date().toISOString().slice(0, 10);
