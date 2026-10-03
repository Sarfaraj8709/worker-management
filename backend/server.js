import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import workerRoutes from './routes/worker.js';
import workersDirectoryRoutes from './routes/workers.js';
import requestRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';
import adminPlatformRoutes from './routes/adminPlatform.js';
import chatRoutes from './routes/chat.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Socket.io real-time server
import { initSocketServer } from './socket/socketServer.js';

// Load env variables
dotenv.config();

// Fail fast if the JWT secret is missing or too weak - never start with
// a publicly known signing key.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'FATAL: JWT_SECRET is missing or shorter than 32 characters. ' +
      'Set a strong secret in backend/.env before starting the server.'
  );
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();

// Set up directory resolution for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration - Allow credentials for HTTP-only cookies
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parser & cookie parser
app.use(express.json());
app.use(cookieParser());

// Global rate limiting for all /api routes
app.use('/api', apiLimiter);

// Set static folder for image uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/workers', workersDirectoryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminPlatformRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Worker Management API is healthy',
    timestamp: new Date(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Unhandled Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Real-time communication (Socket.io) with JWT-authenticated socket connections
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
