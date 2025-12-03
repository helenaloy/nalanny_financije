const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const uploadRoutes = require('./routes/upload');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const travelOrderRoutes = require('./routes/travelOrders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/build')));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/travel-orders', travelOrderRoutes);

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Initialize database
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;

