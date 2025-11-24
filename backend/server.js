const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routeRoutes = require('./routes/route');
const reportRoutes = require('./routes/report');
const panicRoutes = require('./routes/panic');
const zoneRoutes = require('./routes/zone');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/route', routeRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/zone-status', zoneRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SafeWalk API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SafeWalk API server running on port ${PORT}`);
});

module.exports = app;

