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

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/travel-orders', travelOrderRoutes);

// Serve static files from React app (samo za lokalno)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Catch all handler: send back React's index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Initialize database i export app
if (process.env.NODE_ENV !== 'production') {
  db.init().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
} else {
  // Za Vercel, samo inicijaliziraj bazu
  db.init().catch(err => console.error('DB init error:', err));
}

module.exports = app;

