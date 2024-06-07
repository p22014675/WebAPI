const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const path = require('path');
const moment = require('moment');

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

const fetchChaptersData = async (mangaId) => {
  try {
    const batchSize = 100; // Maximum allowed value for the limit parameter
    let allChapters = [];
    let offset = 0;
    let totalChapters = Infinity;

    // Fetch chapters in batches until all chapters are retrieved
    while (offset < totalChapters) {
      const response = await axios.get('https://api.mangadex.org/chapter', {
        params: {
          manga: mangaId,
          translatedLanguage: ['en'],
          order: { chapter: 'asc' },
          limit: batchSize,
          offset: offset
        }
      });
      
      const chaptersData = response.data.data;
      totalChapters = response.data.total;
      allChapters = allChapters.concat(chaptersData);

      offset += batchSize;
    }

    return allChapters;
  } catch (error) {
    console.error(`Error fetching chapters for manga ID ${mangaId}:`, error.response ? error.response.data : error.message);
    throw new Error('Error fetching chapters data');
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
      'contentRating[]': ['safe', 'suggestive', 'erotica'],
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

    // Fetch chapters data
    const chapters = await fetchChaptersData(randomManga.id);

    console.log('Random Manga:', randomManga);
    console.log('Chapters:', chapters);

    // Include cover art URL and chapters in the response
    const mangaDataWithCoverArtAndChapters = {
      ...randomManga,
      coverArtUrl: coverArtUrl ? `https://uploads.mangadex.org/covers/${randomManga.id}/${coverArtUrl}` : '',
      chapters: chapters || [] // Ensure chapters is always an array
    };

    res.json(mangaDataWithCoverArtAndChapters);
  } catch (error) {
    console.error('Error fetching random manga:', error);
    res.status(500).json({ message: error.message });
  }
});

// Recent manga updates endpoint with query parameters
app.get('/api/recent-updates', async (req, res) => {
  try {
    // Construct query parameters to fetch recent manga updates
    const queryParams = {
      limit: 10, // Number of recent updates to fetch
      order: { updatedAt: 'desc' }, // Order by latest update time
      includes: ['manga', 'cover_art'], // Include manga details and cover art
      hasAvailableChapters: 'true' // Only include manga with available chapters
    };

    // Fetch recent manga updates with the specified query parameters
    const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });

    // Log the response to better understand its structure
    console.log('Recent manga updates response:', response.data);

    const recentMangaUpdates = response.data.data;

    // Send the recent manga updates as JSON response
    res.json(recentMangaUpdates);
  } catch (error) {
    console.error('Error fetching recent manga updates:', error);
    res.status(500).json({ message: error.message });
  }
});

