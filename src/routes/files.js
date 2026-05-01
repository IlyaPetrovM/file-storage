const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const router = express.Router();
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
      logger.info(`Created storage directory: ${STORAGE_PATH}`);
    }
    cb(null, STORAGE_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
  }
});

// POST /api/files - Upload file
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Upload attempt without file');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes) -> ${req.file.filename}`);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        path: req.file.path,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// GET /api/files - List all files
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      return res.json({ files: [] });
    }

    fs.readdir(STORAGE_PATH, (err, files) => {
      if (err) {
        logger.error('Failed to read storage directory:', err.message);
        return res.status(500).json({ error: 'Failed to read files' });
      }

      const fileDetails = files.map(filename => {
        const filePath = path.join(STORAGE_PATH, filename);
        const stats = fs.statSync(filePath);
        return {
          id: filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      });

      logger.info(`Listed ${files.length} files`);
      res.json({ count: files.length, files: fileDetails });
    });
  } catch (error) {
    logger.error('List files error:', error.message);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// GET /api/files/:id - Download file
router.get('/:id', (req, res) => {
  try {
    const filename = path.basename(req.params.id);
    const filePath = path.join(STORAGE_PATH, filename);

    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found: ${filename}`);
      return res.status(404).json({ error: 'File not found' });
    }

    logger.info(`Downloading file: ${filename}`);
    res.download(filePath);
  } catch (error) {
    logger.error('Download error:', error.message);
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', (req, res) => {
  try {
    const filename = path.basename(req.params.id);
    const filePath = path.join(STORAGE_PATH, filename);

    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found for deletion: ${filename}`);
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    logger.info(`File deleted: ${filename}`);
    res.json({ message: 'File deleted successfully', id: filename });
  } catch (error) {
    logger.error('Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

module.exports = router;
