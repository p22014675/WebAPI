const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const { connectDB } = require('./db');
const HistoryList = require('./historyListSchema');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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
// Configure nodemailer for forgot password request
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    host: "smtp.gmail.com",
    port: 465,
    secure: false, // No SSL/TLS cause localhost
    auth: {
        user: 'racolee147@gmail.com',
        pass: 'jxsq frxf rqwa fpgq'
    }
});
const fetchMangaData = async (queryParams) => {
    try {
        const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });
        return response.data.data;
    } catch (error) {
        throw new Error('Error fetching manga data');
    }
};
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}
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
app.get('/favorite',isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/favorite.html'));
});
app.get('/account',isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/account.html'));
});
app.get('/api/reset-password/:token', (req, res) => {
    // Serve the HTML file for resetting the password
    res.sendFile(path.join(__dirname, 'public/resetPassword.html'));
});
app.get('/api/request-password-reset', async (req, res) => {
    try {
        // Direct the user to the resetPassword.html page
        res.sendFile(path.join(__dirname, 'public/resetPassword.html'));
    } catch (error) {
        console.error('Error handling password reset request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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
app.post('/api/request-password-reset', async (req, res) => {
    const { email } = req.body;

    try {
        const db = await connectDB();
        const userCollection = db.collection('users');
        const user = await userCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const tokenExpiry = Date.now() + 3600000; // 1 hour expiry

        await userCollection.updateOne({ email }, { $set: { resetPasswordToken: token, resetPasswordExpires: tokenExpiry } });

        const resetLink = `http://localhost:3000/api/reset-password/${token}`;

        const mailOptions = {
            to: email,
            from: 'racolee147@gmail.com',
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                   Please click on the following link, or paste this into your browser to complete the process:\n\n
                   ${resetLink}\n\n
                   If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.post('/api/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        // Log the request body for debugging
        console.log('Request body:', req.body);

        // Ensure new password is provided
        if (!newPassword) {
            console.error('No new password provided');
            return res.status(400).json({ message: 'New password is required' });
        }

        const db = await connectDB();
        const userCollection = db.collection('users');

        // Find the user with the reset password token
        const user = await userCollection.findOne({ resetPasswordToken: token });

        // Check if the token is valid and not expired
        if (!user || user.resetPasswordExpires < Date.now()) {
            console.error('Invalid or expired token');
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Compare the new password with the old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            console.error('New password is the same as the old password');
            return res.status(400).json({ message: 'New password cannot be the same as the old password' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset token
        await userCollection.updateOne(
            { resetPasswordToken: token },
            { $set: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null } }
        );

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint to add manga to read(favorite) list
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
//, 'suggestive', 'erotica', 'pornographic'
app.get('/api/random', async (req, res) => {
    try {
        const queryParams = {
            'includes[]': ['manga', 'cover_art', 'author', 'artist', 'tag', 'creator'],
            'contentRating[]': ['safe'],
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
        console.log('Random Manga Data:', mangaDataWithCoverArt);
        res.json(mangaDataWithCoverArt);
    } catch (error) {
        console.error('Error fetching random manga:', error);
        res.status(500).json({ message: error.message });
    }
});

// Recent manga updates endpoint with query parameters
app.get('/api/recent-updates', async (req, res) => {
    try {
        const queryParams = {
            limit: 9,
            order: { latestUploadedChapter: 'desc' },
            'contentRating[]': ['safe'],
            includes: ['manga', 'cover_art'],
            hasAvailableChapters: 'true'
        };

        const response = await axios.get('https://api.mangadex.org/manga', { params: queryParams });
        const recentMangaUpdates = response.data.data;
        console.log('Recent Manga Updates:', recentMangaUpdates);
        res.json(recentMangaUpdates);
    } catch (error) {
        console.error('Error fetching recent manga updates:', error);
        res.status(500).json({ message: error.message });
    }
});
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
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
        console.log('Search Results:', mangas);
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
        const title = mangaData.attributes.title["en"]; 
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
app.get('/api/favorite/:userId',isAuthenticated, async (req, res) => {
    const userId = req.params.userId;
    try {
        const db = await connectDB(); // Connect to MongoDB
        const readListCollection = db.collection('readList'); 

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
app.put('/api/updateReadStatus',isAuthenticated,  async (req, res) => {
    const { userId, mangaId, status } = req.body;

    try {
        const db = await connectDB(); // Connect to MongoDB
        const readListCollection = db.collection('readList'); 

    
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

app.delete('/api/remove-favorite',isAuthenticated, async (req, res) => {
    const { userId, mangaId } = req.body;
    try {
        const db = await connectDB();
        const readListCollection = db.collection('readList');

        const result = await readListCollection.deleteOne({ userId: userId, mangaId: mangaId });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Manga removed successfully' });
        } else {
            res.status(404).json({ message: 'Manga not found' });
        }
    } catch (error) {
        console.error('Error removing manga:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Endpoint to get user details by userId
app.get('/api/user-details/:userId', isAuthenticated, async (req, res) => {
    try {
        // Get userId from URL parameters
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ message: 'User ID not provided' });
        }

        const db = await connectDB();
        const userCollection = db.collection('users');
        
        // Convert userId string to MongoDB ObjectId
        const objectId = new ObjectId(userId);

        // Find the user with the provided _id (MongoDB ObjectId)
        const user = await userCollection.findOne({ _id: objectId });

        if (user) {
            res.json({ username: user.username, email: user.email });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Endpoint to clear the last visited manga for a user
app.delete('/api/clear-last-visited/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const db = await connectDB();
        const historyListCollection = db.collection('historyList');

        const result = await historyListCollection.deleteMany({ userId: userId });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Last visited list cleared successfully' });
        } else {
            res.status(404).json({ message: 'No last visited items found for the user' });
        }
    } catch (error) {
        console.error('Error clearing last visited list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/api/clear-favorite/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const db = await connectDB();
        const readListCollection = db.collection('readList');

        const result = await readListCollection.deleteMany({ userId: userId });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'All favorites cleared successfully' });
        } else {
            res.status(404).json({ message: 'No favorites found for the user' });
        }
    } catch (error) {
        console.error('Error clearing favorites:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.put('/api/change-password/:userId', async (req, res) => {
    const userId = req.params.userId;
    const { password } = req.body;

    try {
        const db = await connectDB();
        const usersCollection = db.collection('users');
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the new password

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedPassword } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: 'Password changed successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.listen(port, () => {
    console.log(`manga app listening at http://localhost:${port}`);
});
