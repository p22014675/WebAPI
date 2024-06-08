const mongoose = require('mongoose');

const historyListSchema = new mongoose.Schema({
    mangaId: { type: String, required: true },
    chapter: { type: String, required: true },
    userId: { type: String, required: true }
});

const HistoryList = mongoose.model('HistoryList', historyListSchema);

module.exports = HistoryList;