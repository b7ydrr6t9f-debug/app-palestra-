// Data corrente in header + navigazione a tab tra le tre sezioni
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('it-IT', options);

// Chiave del giorno corrente, usata per raggruppare i dati di alimentazione/allenamento per data
function chiaveGiornoOggi() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function cambiaSezione(nome) {
  ['abitudini', 'alimentazione', 'allenamento', 'profilo'].forEach(s => {
    document.getElementById(`sec-${s}`).classList.toggle('hidden', s !== nome);
    document.getElementById(`tab-${s}`).classList.toggle('active', s === nome);
  });
}
