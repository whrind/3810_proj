require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const {
  DISTRICTS,
  DIFFICULTIES,
  STATUSES,
  FORUM_CATEGORIES,
  formatHkDate
} = require('./config/constants');
const { seedInitialData } = require('./config/seed');
const { backfillForumTrailIds } = require('./config/forumTrails');
const { canModify } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const trailRoutes = require('./routes/trails');
const forumRoutes = require('./routes/forum');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trailmate_hk';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    name: 'trailmate.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true',
      maxAge: 1000 * 60 * 60 * 6
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.districts = DISTRICTS;
  res.locals.difficulties = DIFFICULTIES;
  res.locals.statuses = STATUSES;
  res.locals.forumCategories = FORUM_CATEGORIES;
  res.locals.currentPath = req.path;
  res.locals.canModify = canModify;
  res.locals.formatHkDate = formatHkDate;
  next();
});

app.use('/', authRoutes);
app.use('/trails', trailRoutes);
app.use('/forum', forumRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  return res.status(404).send('404 — Page not found');
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB: ${MONGODB_URI}`);
    await seedInitialData();
    await backfillForumTrailIds();
    app.listen(PORT, () => {
      console.log(`TrailMate HK running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
