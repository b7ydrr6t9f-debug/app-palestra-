// Data corrente in header + navigazione a tab tra le tre sezioni
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('it-IT', options);

// Chiave del giorno corrente, usata per raggruppare i dati di alimentazione/allenamento per data
function chiaveGiornoOggi() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Dispendio energetico giornaliero (TDEE), impostato in Profilo ma usato
// anche da Alimentazione per il calcolo del deficit: sta qui perché nav.js
// è il primo file caricato, quindi la funzione esiste già quando serve.
function leggiDispendioEnergetico() {
  return Number(localStorage.getItem('liberoflow_dispendio_energetico')) || 2200;
}
function salvaDispendioEnergetico(v) {
  localStorage.setItem('liberoflow_dispendio_energetico', String(v));
}

function cambiaSezione(nome) {
  ['abitudini', 'alimentazione', 'allenamento', 'profilo'].forEach(s => {
    document.getElementById(`sec-${s}`).classList.toggle('hidden', s !== nome);
    document.getElementById(`tab-${s}`).classList.toggle('active', s === nome);
  });
}
