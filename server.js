const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Importiamo il modulo ufficiale per interagire con l'API di Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// Configurazione per ricevere dati in formato JSON e URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Questa riga è FONDAMENTALE: dice al server di servire i file HTML, CSS e JS che si trovano nella cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// Configurazione Database SQLite
// ---------------------------------------------------------
// Creiamo (o apriamo se esiste già) un file database chiamato 'database.db'
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Errore durante l\'apertura del database:', err.message);
    } else {
        console.log('Connessione al database SQLite stabilita.');
        // Creazione delle tabelle se non esistono
        db.run(`CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            type TEXT,
            duration INTEGER,
            calories INTEGER,
            notes TEXT
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            chest REAL,
            waist REAL
        )`);
    }
});

// ---------------------------------------------------------
// Configurazione Gemini API (utilizzando la variabile d'ambiente)
// ---------------------------------------------------------
// Recuperiamo la chiave API dall'ambiente di Render
const apiKey = process.env.GEMINI_API_KEY; 

// Inizializziamo il client di Gemini solo se la chiave è presente
let genAI;
let model;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    // Specifichiamo il modello che vogliamo utilizzare
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Configurazione Gemini API completata con successo.");
} else {
    console.warn("ATTENZIONE: Variabile d'ambiente GEMINI_API_KEY non trovata. Le funzionalità di AI non saranno disponibili.");
}

// ---------------------------------------------------------
// Endpoint per l'Assistente AI (Gemini)
// ---------------------------------------------------------
app.post('/api/ask-ai', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'La domanda è obbligatoria.' });
    }

    if (!model) {
         return res.status(503).json({ error: 'Il servizio AI non è al momento configurato sul server.' });
    }

    try {
        // Chiamata all'API di Gemini
        const result = await model.generateContent(question);
        const responseText = result.response.text();
        
        res.json({ answer: responseText });
    } catch (error) {
        console.error("Errore durante la chiamata a Gemini:", error);
        res.status(500).json({ error: "Errore interno durante l'elaborazione della richiesta AI." });
    }
});


// ---------------------------------------------------------
// Avvio del server
// ---------------------------------------------------------
app.listen(port, () => {
    console.log(\`Server in ascolto sulla porta \${port}\`);
});
