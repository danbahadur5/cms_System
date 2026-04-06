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
const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
  };
  return map[mime] || '.img';
}

const PORT = Number(process.env.PORT) || 4000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const NODE_ENV = trimEnvQuotes(process.env.NODE_ENV || 'development');
const IS_PROD = NODE_ENV === 'production';
const MONGODB_URI =
  trimEnvQuotes(process.env.MONGODB_URI) ||
  'mongodb://127.0.0.1:27017/course_management';
const ADMIN_EMAIL = trimEnvQuotes(process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = trimEnvQuotes(process.env.ADMIN_PASSWORD || '');
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
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '7d',
    immutable: false,
  })
);

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

const authLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20, keyPrefix: 'auth' });
const uploadLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 60, keyPrefix: 'upload' });

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
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    const name = (file.originalname || '').toLowerCase();
    if (
      file.mimetype === 'application/octet-stream' &&
      /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(name)
    ) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed (jpg, png, gif, webp, heic, etc.)'));
  },
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError || err?.name === 'MulterError') {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 12 MB).'
          : err.message || 'Upload error';
      return res.status(400).json({ error: message });
    }
    const msg = typeof err.message === 'string' ? err.message : '';
    if (msg.startsWith('Only image')) {
      return res.status(400).json({ error: msg });
    }
    console.error('[upload] multer:', err);
    return res.status(400).json({ error: msg || 'Upload failed' });
  });
}

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function uploadSingleAnyFile(req, res, next) {
  fileUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError || err?.name === 'MulterError') {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 25 MB).'
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
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get('/api/stats', async (_req, res) => {
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
app.get('/api/courses', async (_req, res) => {
  try {
    const list = await Course.find().sort({ createdAt: -1 }).exec();
    res.json(list.map(serializeCourse));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list courses' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
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

app.get('/api/courses/:courseId/topics', async (req, res) => {
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

app.get('/api/topics/:topicId', async (req, res) => {
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

app.get('/api/topics/:topicId/lessons', async (req, res) => {
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
      Course.find().sort({ createdAt: -1 }).exec(),
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

app.post('/api/courses', requireAdmin, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const course = await Course.create({
      name: name.trim(),
      description: String(description || ''),
      icon: String(icon || 'Briefcase'),
      color: String(color || '#4299E1'),
    });
    res.status(201).json(serializeCourse(course));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create course' });
  }
});

app.patch('/api/courses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const updates = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.description != null) updates.description = String(req.body.description);
    if (req.body.icon != null) updates.icon = String(req.body.icon);
    if (req.body.color != null) updates.color = String(req.body.color);
    const course = await Course.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(serializeCourse(course));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update course' });
  }
});

app.delete('/api/courses/:id', requireAdmin, async (req, res) => {
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

app.post('/api/courses/:courseId/topics', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }
    const parent = await Course.findById(courseId).exec();
    if (!parent) return res.status(404).json({ error: 'Course not found' });
    const { name, description, icon, color, order } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const topic = await Topic.create({
      courseId,
      name: name.trim(),
      description: String(description || ''),
      icon: String(icon || 'FileText'),
      color: String(color || '#4299E1'),
      order: Number(order) || 1,
    });
    res.status(201).json(serializeTopic(topic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create topic' });
  }
});

app.patch('/api/topics/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const updates = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.description != null) updates.description = String(req.body.description);
    if (req.body.icon != null) updates.icon = String(req.body.icon);
    if (req.body.color != null) updates.color = String(req.body.color);
    if (req.body.order != null) updates.order = Number(req.body.order);
    const topic = await Topic.findByIdAndUpdate(id, updates, { new: true }).exec();
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(serializeTopic(topic));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update topic' });
  }
});

app.delete('/api/topics/:id', requireAdmin, async (req, res) => {
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

app.post('/api/topics/:topicId/lessons', requireAdmin, async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.isValidObjectId(topicId)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }
    const parent = await Topic.findById(topicId).exec();
    if (!parent) return res.status(404).json({ error: 'Topic not found' });
    const { title, content, day, type, order, images, attachments } = req.body || {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const lesson = await Lesson.create({
      topicId,
      title: title.trim(),
      content: String(content || ''),
      day: Math.max(1, Number(day) || 1),
      type: ['teaching', 'practice', 'project'].includes(type) ? type : 'teaching',
      order: Number(order) || 1,
      images: Array.isArray(images) ? images.filter((u) => typeof u === 'string') : [],
      attachments: Array.isArray(attachments) ? attachments.filter((u) => typeof u === 'string') : [],
    });
    res.status(201).json(serializeLesson(lesson));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to create lesson' });
  }
});

app.patch('/api/lessons/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const updates = {};
    if (req.body.title != null) updates.title = String(req.body.title).trim();
    if (req.body.content != null) updates.content = String(req.body.content);
    if (req.body.day != null) updates.day = Math.max(1, Number(req.body.day));
    if (req.body.type != null && ['teaching', 'practice', 'project'].includes(req.body.type)) {
      updates.type = req.body.type;
    }
    if (req.body.order != null) updates.order = Number(req.body.order);
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

app.delete('/api/lessons/:id', requireAdmin, async (req, res) => {
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
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder,
          resource_type: 'image',
          /** Helps trace uploads; safe characters only */
          public_id: `lesson-${crypto.randomUUID()}`,
        });
        return res.json({
          url: result.secure_url,
          storage: 'cloudinary',
          publicId: result.public_id,
        });
      } catch (cloudErr) {
        console.warn('[upload] Cloudinary error, saving locally instead:', cloudErr?.message || cloudErr);
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
        const folder =
          trimEnvQuotes(process.env.CLOUDINARY_FOLDER || '') || 'course-management';
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder: `${folder}/files`,
          resource_type: 'raw',
          public_id: `file-${crypto.randomUUID()}`,
        });
        return res.json({
          url: result.secure_url,
          storage: 'cloudinary',
          publicId: result.public_id,
          originalName: req.file.originalname,
          mime: req.file.mimetype,
          bytes: req.file.size,
        });
      } catch (cloudErr) {
        console.warn('[upload:file] Cloudinary error, saving locally instead:', cloudErr?.message || cloudErr);
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
