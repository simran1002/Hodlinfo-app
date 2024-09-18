const express = require('express');
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database connection using Sequelize (PostgreSQL)
const sequelize = new Sequelize('hodlinfo', 'postgres', 'nodejs', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false, // Optional: disable SQL query logs
});

// Define a Ticker model
const Ticker = sequelize.define('Ticker', {
  name: { type: DataTypes.STRING, unique: true }, // Ensure the ticker name is unique
  last: { type: DataTypes.FLOAT },
  buy: { type: DataTypes.FLOAT },
  sell: { type: DataTypes.FLOAT },
  volume: { type: DataTypes.FLOAT },
  base_unit: { type: DataTypes.STRING },
});

// Sync the database (use {force: true} only in development to reset the schema)
sequelize.sync({ alter: true });

// Route to fetch and store the top 10 tickers
app.get('/fetch-tickers', async (req, res) => {
  try {
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const tickers = response.data;

    // Extracting the top 10 results
    const top10 = Object.keys(tickers).slice(0, 10).map(key => ({
      name: key,
      last: parseFloat(tickers[key].last),
      buy: parseFloat(tickers[key].buy),
      sell: parseFloat(tickers[key].sell),
      volume: parseFloat(tickers[key].volume),
      base_unit: tickers[key].base_unit,
    }));

    // Store the top 10 tickers in the database using upsert to avoid duplicates
    await Promise.all(
      top10.map(async (ticker) => {
        await Ticker.upsert(ticker); // Upsert will insert if not existing or update if it does
      })
    );

    res.status(200).json({ message: 'Tickers fetched and stored successfully!' });
  } catch (error) {
    console.error('Error fetching tickers data:', error);
    res.status(500).json({ error: 'Error fetching tickers data' });
  }
});

// Route to get stored tickers
app.get('/get-tickers', async (req, res) => {
  try {
    const tickers = await Ticker.findAll();
    res.status(200).json(tickers);
  } catch (error) {
    console.error('Error fetching data from database:', error);
    res.status(500).json({ error: 'Error fetching data from database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
