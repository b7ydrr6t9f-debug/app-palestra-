const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// Configura Express per servire i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rotta principale che restituisce il file index.html dentro la cartella 'public'
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server web di LiberoFlow avviato sulla porta ${PORT}`);
});
