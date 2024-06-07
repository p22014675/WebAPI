const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const { connectDB } = require('./db');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'p22014675',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Fetch manga data
const fetchMangaData = async (queryParams) => {
    try {
        const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });
        return response.data.data;
    } catch (error) {
        throw new Error('Error fetching manga data');
    }
};

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Serve the HTML files
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});
app.get('/api/checkAuth', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ username: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const db = await connectDB();app.get('/api/checkAuth', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ username: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});
        const userCollection = db.collection('users');

        const existingUser = await userCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await userCollection.insertOne({ username, password: hashedPassword });
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal server error');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const db = await connectDB();
        const userCollection = db.collection('users');

        const user = await userCollection.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send('Invalid username or password');
        }

        req.session.user = { id: user._id, username: user.username };
        res.redirect('/');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error');
    }
});

// Handle user logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Endpoint to add manga to read list
app.post('/api/readList', isAuthenticated, async (req, res) => {
    const { mangaId, status } = req.body;
    const userId = req.session.user.id;

    if (!mangaId || !status) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const db = await connectDB();
        const readListCollection = db.collection('readList');

        const newEntry = { mangaId, userId, status };
        await readListCollection.insertOne(newEntry);
        res.status(201).json({ message: 'Manga added to read list successfully' });
    } catch (error) {
        console.error('Error adding manga to read list:', error);
        res.status(500).json({ error: 'Failed to add manga to read list' });
    }
});

// Random manga endpoint with query parameters
app.get('/api/random', isAuthenticated, async (req, res) => {
    try {
        const queryParams = {
            'includes[]': ['manga', 'cover_art', 'author', 'artist', 'tag', 'creator'],
            'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
            includedTagsMode: 'AND',
            limit: 100
        };

        const mangaList = await fetchMangaData(queryParams);

        if (!mangaList.length) {
            throw new Error('No manga found with the given criteria');
        }

        const randomManga = mangaList[Math.floor(Math.random() * mangaList.length)];
        const coverArtRelation = randomManga.relationships.find(rel => rel.type === 'cover_art');
        let coverArtUrl = '';

        if (coverArtRelation) {
            const coverArtId = coverArtRelation.id;
            const coverArtResponse = await axios.get(`https://api.mangadex.org/cover/${coverArtId}`);
            coverArtUrl = coverArtResponse.data.data.attributes.fileName;
        }

        const chaptersResponse = await axios.get(`https://api.mangadex.org/manga/${randomManga.id}/aggregate`);
        const chapters = [];

        for (const volume in chaptersResponse.data.volumes) {
            for (const chapter in chaptersResponse.data.volumes[volume].chapters) {
                chapters.push({
                    id: chaptersResponse.data.volumes[volume].chapters[chapter].id,
                    attributes: { chapter: chapter }
                });
            }
        }

        const mangaDataWithCoverArt = {
            ...randomManga,
            coverArtUrl: coverArtUrl ? `https://uploads.mangadex.org/covers/${randomManga.id}/${coverArtUrl}` : '',
            chapters
        };

        res.json(mangaDataWithCoverArt);
    } catch (error) {
        console.error('Error fetching random manga:', error);
        res.status(500).json({ message: error.message });
    }
});

// Recent manga updates endpoint with query parameters
app.get('/api/recent-updates', isAuthenticated, async (req, res) => {
    try {
        const queryParams = {
            limit: 10,
            order: { latestUploadedChapter: 'desc' },
            includes: ['manga', 'cover_art'],
            hasAvailableChapters: 'true'
        };

        const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });
        const recentMangaUpdates = response.data.data;

        res.json(recentMangaUpdates);
    } catch (error) {
        console.error('Error fetching recent manga updates:', error);
        res.status(500).json({ message: error.message });
    }
});
app.get('/api/search', isAuthenticated, async (req, res) => {
    const query = req.query.q;
    console.log(`Search query: ${query}`); // Log the query parameter

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const response = await axios.get('https://api.mangadex.org/manga', {
            params: {
                title: query,
                limit: 9,
                includes: ['manga', 'cover_art']
            },
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        console.log(`Mangadex API response status: ${response.status}`);
       

        if (response.status === 304) {
            return res.status(304).send();
        }

        const mangas = response.data.data;
        res.json(mangas);
    } catch (error) {
        console.error('Error searching manga:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to search manga' });
    }
});
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
