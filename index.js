const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});


app.get('/api/manga', async (req, res) => {
  try {
    const response = await axios.get('https://api.mangadex.org/manga');
    const mangaList = response.data.data; // Extract the manga data from the response

    // Send the manga data as a JSON response
    res.json(mangaList);
    //res.send(mangaList);
  } catch (error) {
    // If there's an error, send an error response
    res.status(500).json({ message: error.message });
  }
});



// Define a route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});