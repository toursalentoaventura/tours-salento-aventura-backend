
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const indexRoutes = require('./routes/index.routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', indexRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'API Tour Salento Aventura funcionando correctamente'
  });
});

module.exports = app;



