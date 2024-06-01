const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Fetch manga data
const fetchMangaData = async (queryParams) => {
  try {
    const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });
    return response.data.data;
  } catch (error) {
    throw new Error('Error fetching manga data');
  }
};

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Random manga endpoint with query parameters
app.get('/api/random', async (req, res) => {
  try {
    const queryParams = {
      'includes[]': ['manga', 'cover_art', 'author', 'artist', 'tag', 'creator'],
      'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
      includedTagsMode: 'AND',
      limit: 100
    };

    // Fetch manga data with the specified query parameters
    const mangaList = await fetchMangaData(queryParams);

    if (!mangaList.length) {
      throw new Error('No manga found with the given criteria');
    }

    // Select a random manga from the list
    const randomManga = mangaList[Math.floor(Math.random() * mangaList.length)];

    // Fetch cover art data
    const coverArtRelation = randomManga.relationships.find(rel => rel.type === 'cover_art');
    let coverArtUrl = '';

    if (coverArtRelation) {
      const coverArtId = coverArtRelation.id;
      const coverArtResponse = await axios.get(`https://api.mangadex.org/cover/${coverArtId}`);
      coverArtUrl = coverArtResponse.data.data.attributes.fileName;
    }

    // Include cover art URL in the response
    const mangaDataWithCoverArt = {
      ...randomManga,
      coverArtUrl: coverArtUrl ? `https://uploads.mangadex.org/covers/${randomManga.id}/${coverArtUrl}` : ''
    };

    res.json(mangaDataWithCoverArt);
  } catch (error) {
    console.error('Error fetching random manga:', error);
    res.status(500).json({ message: error.message });
  }
});
