const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/files');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/files', fileRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'file-storage-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'File Storage Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      uploadFile: 'POST /api/files',
      listFiles: 'GET /api/files',
      downloadFile: 'GET /api/files/:id',
      deleteFile: 'DELETE /api/files/:id'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`File Storage Service running on port ${PORT}`);
  logger.info(`Storage path: ${process.env.STORAGE_PATH || './storage'}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
