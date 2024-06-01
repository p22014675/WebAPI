const express = require('express');
const connectDB = require('./db.js');
const bodyParser = require('body-parser');
const authRoutes = require('./auth');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();

const app = express();

// Use CORS middleware
app.use(cors());

// Connect to the database
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));