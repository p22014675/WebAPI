const { MongoClient } = require('mongodb');


const url = 'mongodb+srv://p22014675:GcIq34ROYbneiGGD@clusters.3xpeqwi.mongodb.net/'; 
const dbName = 'mangaApp';

let db;

const connectDB = async () => {
    if (db) return db;

    const client = new MongoClient(url, { useUnifiedTopology: true });
    await client.connect();
    db = client.db(dbName);
    return db;
};

module.exports = { connectDB };





