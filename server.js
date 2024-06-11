const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const { connectDB } = require('./db');
const HistoryList = require('./historyListSchema');

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
app.get('/forgotpassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/forgotpassword.html'));
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
app.get('/favorite', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/favorite.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const db = await connectDB();
        const userCollection = db.collection('users');

        // Check if the username or email already exists
        const existingUser = await userCollection.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).send('Username already exists');
            } else if (existingUser.email === email) {
                return res.status(400).send('Email already exists');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await userCollection.insertOne({ username, email, password: hashedPassword });
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal server error');
    }
});
//Login
app.post('/login', async (req, res) => {
    const { identifier, password } = req.body; // identifier can be either username or email

    try {
        const db = await connectDB();
        const userCollection = db.collection('users');

        // Find user by username or email
        const user = await userCollection.findOne({ 
            $or: [{ username: identifier }, { email: identifier }] 
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send('Invalid username/email or password');
        }

        req.session.user = { id: user._id, username: user.username };
        
        // Set userId in a cookie
        res.cookie('userId', user._id.toString(), { maxAge: 3600000 }); // Cookie expires in 1 hour

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

// Endpoint to save history entry
app.post('/api/history/save', isAuthenticated, async (req, res) => {
    const { mangaId, chapter } = req.body;
    const userId = req.session.user.id;

    try {
        // Establish connection to the database
        const db = await connectDB();

        // Access the historyList collection
        const historyListCollection = db.collection('historyList');

        // Create a new history entry document
        const historyEntry = {
            mangaId,
            chapter,
            userId,
            createdAt: new Date()
        };

        // Save the history entry to the historyList collection
        await historyListCollection.insertOne(historyEntry);

        // Respond with success message
        res.status(200).send('History entry saved successfully');
    } catch (error) {
        console.error('Error saving history entry:', error);
        res.status(500).send('Failed to save history entry');
    }
});
app.get('/api/history/:userId', isAuthenticated, async (req, res) => {
    const userId = req.params.userId;

    try {
        const db = await connectDB();
        const historyListCollection = db.collection('historyList');

        const history = await historyListCollection.find({ userId }).toArray();
        res.json(history);
    } catch (error) {
        console.error('Error retrieving history:', error);
        res.status(500).json({ error: 'Failed to retrieve history' });
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
const fetchMangaDetailsWithCoverArt = async (mangaId) => {
    try {
        // Fetch manga details from MangaDex API
        const mangaResponse = await axios.get(`https://api.mangadex.org/manga/${mangaId}`);
        const mangaData = mangaResponse.data.data;
        
        // Extract relevant details such as title and latest chapter
        const title = mangaData.attributes.title["en"]; // Assuming you want the English title
        const latestChapter = mangaData.relationships.find(rel => rel.type === "chapter")?.id; // Get the ID of the latest chapter

        // Fetch cover art details from MangaDex API
        const coverArtRelation = mangaData.relationships.find(rel => rel.type === 'cover_art');
        let coverArtUrl = '';

        if (coverArtRelation) {
            const coverArtId = coverArtRelation.id;
            const coverArtResponse = await axios.get(`https://api.mangadex.org/cover/${coverArtId}`);
            const fileName = coverArtResponse.data.data.attributes.fileName;
            // Construct the cover art URL
            coverArtUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}`;
        }

        return { title, latestChapter, coverArtUrl };
    } catch (error) {
        console.error('Error fetching manga details with cover art:', error);
        return null;
    }
};
app.get('/api/favorite/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const db = await connectDB(); // Connect to MongoDB
        const readListCollection = db.collection('readList'); // Assuming readList is the collection name

        // Fetch user's favorite manga from readList collection
        const favorites = await readListCollection.find({ userId }).toArray();

        // Fetch manga details for each favorite manga including cover art
        const mangaDetailsPromises = favorites.map(async (favorite) => {
            const mangaId = favorite.mangaId;
            // Fetch manga details with cover art using the manga ID
            const mangaDetails = await fetchMangaDetailsWithCoverArt(mangaId);
            // Merge favorite and mangaDetails objects
            return { ...favorite, ...mangaDetails, status: favorite.status };
        });

        // Wait for all mangaDetailsPromises to resolve
        const mangaDetails = await Promise.all(mangaDetailsPromises);

        res.json(mangaDetails);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).send('Internal server error');
    }
});
app.put('/api/updateReadStatus', async (req, res) => {
    const { userId, mangaId, status } = req.body;

    try {
        const db = await connectDB(); // Connect to MongoDB
        const readListCollection = db.collection('readList'); // Assuming readList is the collection name

        // Assuming you have a MongoDB collection named 'readList'
        const result = await readListCollection.updateOne(
            { userId: userId, mangaId: mangaId },
            { $set: { status: status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Manga not found in the read list' });
        }

        res.json({ message: 'Read status updated successfully' });
    } catch (error) {
        console.error('Error updating read status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
