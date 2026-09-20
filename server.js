const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

// Configura Express per servire i file statici
app.use(express.static(path.join(__dirname)));

// Rotta principale che restituisce la pagina web
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server web di LiberoFlow avviato sulla porta ${PORT}`);
});
