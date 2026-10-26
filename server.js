import 'dotenv/config';
import dns from 'dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './Routes/apiRoutes.js';
import { seedDefaultAdmin } from './Controllers/adminAuthController.js';
import { seedContactPageContent } from './Controllers/contactPageController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(['8.8.8.8', '1.1.1.1']);

const allowedOrigins = [
  'https://gcaalumniassociation.com',
  'https://gcaalumniassociation.com/',
  'http://gcaalumniassociation.com',
  'http://gcaalumniassociation.com/',
  'https://www.gcaalumniassociation.com',
  'http://www.gcaalumniassociation.com',
  'https://admin.gcaalumniassociation.com',
  'http://admin.gcaalumniassociation.com',
  'https://api.gcaalumniassociation.com',
  'http://api.gcaalumniassociation.com',
  'https://gcaa-project.onrender.com',
  'http://gcaa-project.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = String(origin).trim().replace(/\/+$/, '');
    const cleanHost = cleanOrigin.replace(/^https?:\/\//, '').split(':')[0];

    // Check if origin matches allowed domains or subdomains
    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      cleanHost === 'gcaalumniassociation.com' ||
      cleanHost.endsWith('.gcaalumniassociation.com') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      /\.vercel\.app$/.test(cleanOrigin) ||
      /\.onrender\.com$/.test(cleanOrigin);

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin: ${origin}`);
    return callback(new Error(`CORS Error: Origin ${origin} not allowed by GCAAA security policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400,
};

const app = express();

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security & Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Consolidated API Routes from Routes/apiRoutes.js
console.log("-----route wala api start------")
app.use('/api', apiRoutes);
console.log("-----route wala api end------")

// Root route: Renders EJS status dashboard with safe JSON fallback
console.log("-----Default api start------")
app.get('/', (req, res) => {
  // If request explicitly asks for JSON (e.g. Postman, cURL)
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({
      success: true,
      message: 'GCAAA Alumni Association Backend API is running!',
      status: 'Healthy',
      environment: process.env.NODE_ENV || 'production',
      uptime: `${Math.floor(process.uptime())} seconds`,
      endpoints: {
        adminAuth: '/api/admin/auth',
        registeredMembers: '/api/registered-members',
        batchAlumni: '/api/batch-alumni',
        electionNominations: '/api/election-nominations',
        blogs: '/api/blogs',
        stats: '/api/registered-members/stats',
        health: '/api/health',
      },
    });
  }

  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const formattedUptime = `${hours}h ${minutes}m ${seconds}s`;

  const isDbConnected = mongoose.connection.readyState === 1;

  // Safe render with error callback to avoid 500 error if views folder is absent
  res.render('index', {
    status: 'Healthy',
    dbStatus: isDbConnected ? 'Connected (Atlas)' : 'Ready / Active',
    uptime: formattedUptime,
    uptimeSec: uptimeSec,
    environment: process.env.NODE_ENV || 'production',
  }, (err, html) => {
    if (err) {
      return res.status(200).json({
        success: true,
        message: 'GCAAA Alumni Association Backend API is running!',
        status: 'Healthy',
        dbStatus: isDbConnected ? 'Connected (Atlas)' : 'Ready / Active',
        uptime: formattedUptime,
        environment: process.env.NODE_ENV || 'production',
      });
    }
    res.send(html);
  });
});
console.log("-----Default api end------")

// Standalone health check ping
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// MongoDB connection & Server Boot
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Atlas connected successfully!');
    await seedDefaultAdmin();
    await seedContactPageContent();
    app.listen(PORT, () => {
      console.log(`GCAAA Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB Atlas connection failed:', error.message);
    process.exit(1);
  });
