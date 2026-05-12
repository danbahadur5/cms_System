import { trimEnvQuotes } from './loadEnv.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { Course, Topic, Lesson } from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const IS_VERCEL = Boolean(process.env.VERCEL);
/** Vercel serverless FS is read-only except /tmp */
const UPLOADS_DIR = IS_VERCEL ? '/tmp/course-management-uploads' : path.join(SERVER_ROOT, 'uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  // Avoid crashing at module-load on serverless readonly environments.
  console.error('[uploads] failed to initialize upload directory:', e);
}

function extensionForMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };
  return map[mime] || '.file';
}

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = trimEnvQuotes(process.env.NODE_ENV || 'development');
const IS_PROD = NODE_ENV === 'production';
const MONGODB_URI =
  trimEnvQuotes(process.env.MONGODB_URI) ||
  'mongodb://127.0.0.1:27017/course_management';
const ADMIN_EMAIL = trimEnvQuotes(process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = trimEnvQuotes(process.env.ADMIN_PASSWORD || '');
const SITE_PASSWORD = trimEnvQuotes(process.env.SITE_PASSWORD || '');
const JWT_SECRET = trimEnvQuotes(process.env.JWT_SECRET || '');
const JWT_EXPIRES = '8h';
/** Optional, e.g. https://api.yoursite.com — prefix for local /uploads URLs when the SPA is on another host */
const API_PUBLIC_URL = trimEnvQuotes(process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
/** Optional: comma-separated allowlist e.g. "https://app.example.com,https://admin.example.com" */
const CORS_ORIGIN = trimEnvQuotes(process.env.CORS_ORIGIN || '');

const cloudName = trimEnvQuotes(process.env.CLOUDINARY_CLOUD_NAME || '');
const cloudKey = trimEnvQuotes(process.env.CLOUDINARY_API_KEY || '');
const cloudSecret = trimEnvQuotes(process.env.CLOUDINARY_API_SECRET || '');
const cloudinaryReady = Boolean(cloudName && cloudKey && cloudSecret);

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudKey,
    api_secret: cloudSecret,
  });
}

function timingSafeEqualString(a, b) {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function serializeCourse(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    name: o.name,
    description: o.description,
    icon: o.icon,
    color: o.color,
    image: o.image,
    order: o.order,
    createdAt: (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt)).toISOString(),
  };
}

function serializeTopic(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    courseId: o.courseId.toString(),
    name: o.name,
    description: o.description,
    icon: o.icon,
    color: o.color,
    image: o.image,
    order: o.order,
  };
}

function serializeLesson(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    topicId: o.topicId.toString(),
    day: o.day,
    title: o.title,
    content: o.content,
    type: o.type,
    order: o.order,
    images: o.images || [],
    attachments: o.attachments || [],
  };
}

function requireEnvForAuth() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || JWT_SECRET.length < 16) {
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    return res.status(503).json({ error: 'Server JWT is not configured' });
  }
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.sub !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.adminEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireSiteAccess(req, res, next) {
  if (!SITE_PASSWORD) return next();
  
  const header = req.headers['x-site-access'];
  if (!header) {
    return res.status(403).json({ error: 'Site access required' });
  }
  
  try {
    const payload = jwt.verify(header, JWT_SECRET);
    if (payload.sub !== 'site-access') {
      return res.status(403).json({ error: 'Invalid site access token' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Site access session expired' });
  }
}

const app = express();
app.disable('x-powered-by');
if (IS_PROD || IS_VERCEL) {
  app.set('trust proxy', 1);
}

const allowedOrigins = CORS_ORIGIN
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl/postman/server-to-server
      if (!allowedOrigins.length) return callback(null, true); // fallback: allow all if not configured
      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);

// Small security baseline without extra dependencies
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PROD || IS_VERCEL) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  if (!String(req.path || '').startsWith('/uploads')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
// Secure file serving with access control
app.use('/uploads', (req, res, next) => {
  // Allow admin users full access
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.sub === 'admin') {
        // Admin has full access - serve files normally
        return express.static(UPLOADS_DIR, {
          maxAge: '7d',
          immutable: false,
        })(req, res, next);
      }
    } catch (e) {
      // Invalid token, continue to restricted access
    }
  }
  
  // For non-admin or unauthenticated users:
  // Only allow image viewing, block downloads of other file types
  const ext = path.extname(req.path).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.heif'];
  
  if (imageExts.includes(ext)) {
    // Serve images with restrictive headers to prevent downloading
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return express.static(UPLOADS_DIR, {
      maxAge: '1h',
      immutable: false,
    })(req, res, next);
  }
  
  // Block all other file types (PDFs, documents, etc.) for non-admin users
  res.status(403).json({ 
    error: 'Access denied. Authentication required to download course materials.' 
  });
});

let dbConnectPromise = null;
async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!dbConnectPromise) {
    dbConnectPromise = mongoose.connect(MONGODB_URI).catch((e) => {
      dbConnectPromise = null;
      throw e;
    });
  }
  await dbConnectPromise;
}

function createRateLimiter({ windowMs, max, keyPrefix }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const current = hits.get(key);
    if (!current || now - current.start >= windowMs) {
      hits.set(key, { count: 1, start: now });
      return next();
    }
    if (current.count >= max) {
      const retryAfter = Math.ceil((windowMs - (now - current.start)) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    current.count += 1;
    return next();
  };
}

const authLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 50, keyPrefix: 'auth' });
const uploadLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 200, keyPrefix: 'upload' });
const mutationLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 30, keyPrefix: 'mutations' });

function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // Remove potentially harmful HTML/JS characters but keep essential text
        sanitized[key] = value.replace(/[<>]/g, '').trim();
      } else if (Array.isArray(value)) {
        // Sanitize array items if they're strings
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? item.replace(/[<>]/g, '').trim() : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    req.body = sanitized;
  }
  next();
}

// Apply sanitization to mutation endpoints
app.use('/api/courses', sanitizeInputs);
app.use('/api/topics', sanitizeInputs);
app.use('/api/lessons', sanitizeInputs);

/** Ensure DB is ready for each request in serverless mode. */
app.use(async (_req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (e) {
    console.error('[mongo] connection failed:', e);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    // Support for PDF, PPT, Excel
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    const name = (file.originalname || '').toLowerCase();
    if (
      file.mimetype === 'application/octet-stream' &&
      /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg|pdf|ppt|pptx|xls|xlsx)$/i.test(name)
    ) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files, PDFs, PowerPoint presentations, and Excel spreadsheets are allowed (jpg, png, gif, webp, heic, pdf, ppt, pptx, xls, xlsx, etc.)'));
  },
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError || err?.name === 'MulterError') {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 60 MB).'
          : err.message || 'Upload error';
      return res.status(400).json({ error: message });
    }
    const msg = typeof err.message === 'string' ? err.message : '';
    if (msg.startsWith('Only ')) {
      return res.status(400).json({ error: msg });
    }
    console.error('[upload] multer:', err);
    return res.status(400).json({ error: msg || 'Upload failed' });
  });
}

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});

function uploadSingleAnyFile(req, res, next) {
  fileUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError || err?.name === 'MulterError') {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 60 MB).'
          : err.message || 'Upload error';
      return res.status(400).json({ error: message });
    }
    const msg = typeof err.message === 'string' ? err.message : '';
    console.error('[upload:file] multer:', err);
    return res.status(400).json({ error: msg || 'Upload failed' });
  });
}

async function saveUploadedBuffer(file) {
  let ext = extensionForMime(file.mimetype);
  if (ext === '.img') {
    const match = (file.originalname || '').match(/(\.[a-z0-9]+)$/i);
    if (match) ext = match[1].toLowerCase();
  }
  const filename = `${crypto.randomUUID()}${ext}`;
  const dest = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(dest, file.buffer);
  const pathOnly = `/uploads/${filename}`;
  const url = API_PUBLIC_URL ? `${API_PUBLIC_URL}${pathOnly}` : pathOnly;
  return { url, storage: 'local' };
}

/** Multer memory buffer → Cloudinary via upload_stream (avoids huge data-URI base64). */
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

function extFromOriginalName(originalname) {
  const match = String(originalname || '').match(/(\.[a-z0-9]{1,10})$/i);
  return match ? match[1].toLowerCase() : '';
}

async function saveUploadedBufferGeneric(file, prefix) {
  const ext = extFromOriginalName(file.originalname) || extensionForMime(file.mimetype);
  const safePrefix = prefix ? `${prefix}-` : '';
  const filename = `${safePrefix}${crypto.randomUUID()}${ext || ''}`;
  const dest = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(dest, file.buffer);
  const pathOnly = `/uploads/${filename}`;
  const url = API_PUBLIC_URL ? `${API_PUBLIC_URL}${pathOnly}` : pathOnly;
  return { url, storage: 'local' };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    vercel: IS_VERCEL,
    mongo: mongoose.connection.readyState === 1,
    cloudinary: cloudinaryReady,
    cloudinaryCloud: cloudName || null,
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get('/api/stats', requireSiteAccess, async (_req, res) => {
  try {
    const [courseCount, lessonCount] = await Promise.all([
      Course.countDocuments().exec(),
      Lesson.countDocuments().exec(),
    ]);
    res.json({ courses: courseCount, lessons: lessonCount });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load stats' });
  }
});

app.post('/api/auth/verify-site', authLimiter, (req, res) => {
  const password = String(req.body?.password || '');
  if (!SITE_PASSWORD) {
    // If no site password is set, allow access
    return res.json({ success: true, message: 'No password protection configured' });
  }
  if (timingSafeEqualString(password, SITE_PASSWORD)) {
    // Return a simple token or just success. For better security, we could return a signed JWT.
    // Let's return a simple JWT that marks site-access.
    const token = jwt.sign({ sub: 'site-access' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: 'Incorrect password' });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  if (!requireEnvForAuth()) {
    return res.status(503).json({
      error: 'Server auth is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET (min 16 chars) in server .env.',
    });
  }
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');
  if (!timingSafeEqualString(email, ADMIN_EMAIL) || !timingSafeEqualString(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = jwt.sign({ sub: 'admin', email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ token, email: ADMIN_EMAIL });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ email: req.adminEmail });
});

/** Public: all courses */
app.get('/api/courses', requireSiteAccess, async (_req, res) => {
  try {
    const list = await Course.find().sort({ order: 1, createdAt: -1 }).exec();
    res.json(list.map(serializeCourse));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list courses' });
  }
});

app.get('/api/courses/:id', requireSiteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const course = await Course.findById(req.params.id).exec();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(serializeCourse(course));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load course' });
  }
});

app.get('/api/courses/:courseId/topics', requireSiteAccess, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.json([]);
    }
    const topics = await Topic.find({ courseId }).sort({ order: 1 }).exec();
    res.json(topics.map(serializeTopic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list topics' });
  }
});

app.get('/api/topics/:topicId', requireSiteAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.topicId)) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const topic = await Topic.findById(req.params.topicId).exec();
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(serializeTopic(topic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load topic' });
  }
});

app.get('/api/topics/:topicId/lessons', requireSiteAccess, async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.isValidObjectId(topicId)) {
      return res.json([]);
    }
    const lessons = await Lesson.find({ topicId }).sort({ day: 1, order: 1 }).exec();
    res.json(lessons.map(serializeLesson));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list lessons' });
  }
});

/** Admin: full tree */
app.get('/api/admin/tree', requireAdmin, async (_req, res) => {
  try {
    const [courses, topics, lessons] = await Promise.all([
      Course.find().sort({ order: 1, createdAt: -1 }).exec(),
      Topic.find().sort({ order: 1 }).exec(),
      Lesson.find().sort({ day: 1, order: 1 }).exec(),
    ]);
    res.json({
      courses: courses.map(serializeCourse),
      topics: topics.map(serializeTopic),
      lessons: lessons.map(serializeLesson),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load catalog' });
  }
});

const allowedIcons = [
  "Briefcase", "Code", "Palette", "FileText", "Sheet", "Presentation",
  "Layout", "Braces", "Database", "Globe", "Smartphone", "Camera",
  "Book", "GraduationCap", "Users", "Zap", "Settings", "Heart",
  "Star", "Lightbulb", "Puzzle", "Target", "Rocket", "Shield"
];
const allowedLessonTypes = ['teaching', 'practice', 'project'];

app.post('/api/courses', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { name, description, icon, color, order, image } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    // Validate icon
    if (icon && !allowedIcons.includes(icon)) {
      return res.status(400).json({ error: 'Invalid icon selection' });
    }
    // Validate color format
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }
    // Validate order is a positive number
    if (order !== undefined && (isNaN(Number(order)) || Number(order) < 1)) {
      return res.status(400).json({ error: 'Order must be a positive number' });
    }
    
    const course = await Course.create({
      name: name.trim(),
      description: String(description || ''),
      icon: String(icon || 'Briefcase'),
      color: String(color || '#4299E1'),
      image: String(image || ''),
      order: Number(order) || 1,
    });
    res.status(201).json(serializeCourse(course));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create course' });
  }
});

app.patch('/api/courses/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const updates = {};
    if (req.body.name != null) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      updates.name = String(req.body.name).trim();
    }
    if (req.body.description != null) updates.description = String(req.body.description);
    if (req.body.icon != null) {
      if (!allowedIcons.includes(req.body.icon)) {
        return res.status(400).json({ error: 'Invalid icon selection' });
      }
      updates.icon = String(req.body.icon);
    }
    if (req.body.color != null) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color format' });
      }
      updates.color = String(req.body.color);
    }
    if (req.body.image != null) updates.image = String(req.body.image);
    if (req.body.order != null) {
      if (isNaN(Number(req.body.order)) || Number(req.body.order) < 1) {
        return res.status(400).json({ error: 'Order must be a positive number' });
      }
      updates.order = Number(req.body.order);
    }
    const course = await Course.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(serializeCourse(course));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update course' });
  }
});

app.delete('/api/courses/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const topics = await Topic.find({ courseId: id }).select('_id').exec();
    const topicIds = topics.map((t) => t._id);
    await Lesson.deleteMany({ topicId: { $in: topicIds } }).exec();
    await Topic.deleteMany({ courseId: id }).exec();
    const deleted = await Course.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ error: 'Course not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to delete course' });
  }
});

app.post('/api/courses/:courseId/topics', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }
    const parent = await Course.findById(courseId).exec();
    if (!parent) return res.status(404).json({ error: 'Course not found' });
    const { name, description, icon, color, order, image } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    // Validate icon
    if (icon && !allowedIcons.includes(icon)) {
      return res.status(400).json({ error: 'Invalid icon selection' });
    }
    // Validate color format
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }
    // Validate order
    if (order !== undefined && (isNaN(Number(order)) || Number(order) < 1)) {
      return res.status(400).json({ error: 'Order must be a positive number' });
    }
    
    const topic = await Topic.create({
      courseId,
      name: name.trim(),
      description: String(description || ''),
      icon: String(icon || 'FileText'),
      color: String(color || '#4299E1'),
      image: String(image || ''),
      order: Number(order) || 1,
    });
    res.status(201).json(serializeTopic(topic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create topic' });
  }
});

app.patch('/api/topics/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const updates = {};
    if (req.body.name != null) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      updates.name = String(req.body.name).trim();
    }
    if (req.body.description != null) updates.description = String(req.body.description);
    if (req.body.icon != null) {
      if (!allowedIcons.includes(req.body.icon)) {
        return res.status(400).json({ error: 'Invalid icon selection' });
      }
      updates.icon = String(req.body.icon);
    }
    if (req.body.color != null) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color format' });
      }
      updates.color = String(req.body.color);
    }
    if (req.body.image != null) updates.image = String(req.body.image);
    if (req.body.order != null) {
      if (isNaN(Number(req.body.order)) || Number(req.body.order) < 1) {
        return res.status(400).json({ error: 'Order must be a positive number' });
      }
      updates.order = Number(req.body.order);
    }
    const topic = await Topic.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(serializeTopic(topic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update topic' });
  }
});

app.delete('/api/topics/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    await Lesson.deleteMany({ topicId: id }).exec();
    const deleted = await Topic.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ error: 'Topic not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to delete topic' });
  }
});

app.post('/api/topics/:topicId/lessons', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.isValidObjectId(topicId)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }
    const parent = await Topic.findById(topicId).exec();
    if (!parent) return res.status(404).json({ error: 'Topic not found' });
    const { title, content, day, type, order, images, attachments, duration } = req.body || {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    // Validate lesson type
    if (type && !allowedLessonTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid lesson type' });
    }
    // Validate day and order
    if (day !== undefined && (isNaN(Number(day)) || Number(day) < 1)) {
      return res.status(400).json({ error: 'Day must be a positive number' });
    }
    if (order !== undefined && (isNaN(Number(order)) || Number(order) < 1)) {
      return res.status(400).json({ error: 'Order must be a positive number' });
    }
    // Validate duration if provided
    if (duration !== undefined && (isNaN(Number(duration)) || Number(duration) < 0)) {
      return res.status(400).json({ error: 'Duration must be a non-negative number' });
    }
    
    const lesson = await Lesson.create({
      topicId,
      title: title.trim(),
      content: String(content || ''),
      day: Math.max(1, Number(day) || 1),
      type: ['teaching', 'practice', 'project'].includes(type) ? type : 'teaching',
      duration: Number(duration) || 1,
      order: Number(order) || 1,
      images: Array.isArray(images) ? images.filter((u) => typeof u === 'string') : [],
      attachments: Array.isArray(attachments) ? attachments.filter((u) => typeof u === 'string') : [],
    });
    res.status(201).json(serializeLesson(lesson));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create lesson' });
  }
});

app.patch('/api/lessons/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const updates = {};
    if (req.body.title != null) {
      if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      updates.title = String(req.body.title).trim();
    }
    if (req.body.content != null) updates.content = String(req.body.content);
    if (req.body.day != null) {
      if (isNaN(Number(req.body.day)) || Number(req.body.day) < 1) {
        return res.status(400).json({ error: 'Day must be a positive number' });
      }
      updates.day = Math.max(1, Number(req.body.day));
    }
    if (req.body.type != null) {
      if (!allowedLessonTypes.includes(req.body.type)) {
        return res.status(400).json({ error: 'Invalid lesson type' });
      }
      updates.type = req.body.type;
    }
    if (req.body.duration != null) {
      if (isNaN(Number(req.body.duration)) || Number(req.body.duration) < 0) {
        return res.status(400).json({ error: 'Duration must be a non-negative number' });
      }
      updates.duration = Number(req.body.duration);
    }
    if (req.body.order != null) {
      if (isNaN(Number(req.body.order)) || Number(req.body.order) < 1) {
        return res.status(400).json({ error: 'Order must be a positive number' });
      }
      updates.order = Number(req.body.order);
    }
    if (req.body.images != null) {
      updates.images = Array.isArray(req.body.images) ? req.body.images.filter((u) => typeof u === 'string') : [];
    }
    if (req.body.attachments != null) {
      updates.attachments = Array.isArray(req.body.attachments)
        ? req.body.attachments.filter((u) => typeof u === 'string')
        : [];
    }
    const lesson = await Lesson.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(serializeLesson(lesson));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update lesson' });
  }
});

app.delete('/api/lessons/:id', requireAdmin, mutationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const deleted = await Lesson.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to delete lesson' });
  }
});

app.post('/api/upload', uploadLimiter, requireAdmin, uploadSingleFile, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        error:
          'No file received. Use field name "file" and send multipart/form-data.',
      });
    }

    if (cloudinaryReady) {
      try {
        const folder = trimEnvQuotes(process.env.CLOUDINARY_FOLDER || '') || 'course-management';
        console.log(`[upload] sending to Cloudinary folder: ${folder}`);
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder,
          resource_type: 'auto',
          public_id: `lesson-${crypto.randomUUID()}`,
          access_mode: 'public',
        });
        console.log(`[upload] Cloudinary success: ${result.secure_url}`);
        return res.json({
          url: result.secure_url,
          storage: 'cloudinary',
          publicId: result.public_id,
        });
      } catch (cloudErr) {
        console.error('[upload] Cloudinary error:', cloudErr?.message || cloudErr);
        // If Cloudinary is configured but fails, we should return an error to let the user know
        return res.status(500).json({ 
          error: `Cloudinary upload failed: ${cloudErr?.message || 'Unknown error'}.` 
        });
      }
    }

    const saved = await saveUploadedBuffer(req.file);
    return res.json({ ...saved, storage: 'local' });
  } catch (e) {
    console.error('[upload]', e);
    return res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

app.post('/api/upload/file', uploadLimiter, requireAdmin, uploadSingleAnyFile, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        error: 'No file received. Use field name "file" and send multipart/form-data.',
      });
    }

    if (cloudinaryReady) {
      try {
        const folder = trimEnvQuotes(process.env.CLOUDINARY_FOLDER || '') || 'course-management';
        const fileFolder = `${folder}/files`;
        console.log(`[upload:file] sending to Cloudinary folder: ${fileFolder}`);
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder: fileFolder,
          resource_type: 'auto',
          public_id: `file-${crypto.randomUUID()}`,
          access_mode: 'public',
        });
        console.log(`[upload:file] Cloudinary success: ${result.secure_url}`);
        return res.json({
          url: result.secure_url,
          storage: 'cloudinary',
          publicId: result.public_id,
          originalName: req.file.originalname,
          mime: req.file.mimetype,
          bytes: req.file.size,
        });
      } catch (cloudErr) {
        console.error('[upload:file] Cloudinary error:', cloudErr?.message || cloudErr);
        return res.status(500).json({ 
          error: `Cloudinary upload failed: ${cloudErr?.message || 'Unknown error'}.` 
        });
      }
    }

    const saved = await saveUploadedBufferGeneric(req.file, 'file');
    return res.json({
      ...saved,
      storage: 'local',
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      bytes: req.file.size,
    });
  } catch (e) {
    console.error('[upload:file]', e);
    return res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    console.warn('[warn] JWT_SECRET missing or too short — auth routes will return 503 until fixed.');
  }
  if (!cloudinaryReady) {
    console.warn('[warn] Cloudinary not configured — uploads will use local disk fallback (ephemeral on serverless).');
  }
  if (IS_PROD && !allowedOrigins.length) {
    console.warn('[warn] CORS_ORIGIN not set in production — allowing all origins.');
  }
  await ensureDbConnected();
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`[shutdown] ${signal}`);
      server.close();
      await mongoose.connection.close();
      process.exit(0);
    } catch (e) {
      console.error('[shutdown] failed:', e);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

if (!IS_VERCEL) {
  start().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export default app;
