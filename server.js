require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const User = require('./models/User');
const Trail = require('./models/Trail');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trailmate_hk';
const SESSION_SECRET = process.env.SESSION_SECRET || 'comp3810sef-trailmate-hk-secret-2026';

const DISTRICTS = [
  'Hong Kong Island',
  'Kowloon',
  'New Territories',
  'Lantau Island',
  'Outlying Islands'
];
const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Expert'];
const STATUSES = ['Open', 'Caution - Weather', 'Maintenance'];

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
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  setFlash(req, 'warning', 'Please log in to access TrailMate HK pages.');
  return res.redirect('/login');
}

function parseListField(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTrailFilter(query) {
  const filter = {};
  const keyword = query.q ? String(query.q).trim() : '';
  const district = query.district ? String(query.district).trim() : '';
  const difficulty = query.difficulty ? String(query.difficulty).trim() : '';
  const status = query.status ? String(query.status).trim() : '';
  const maxDistance = query.maxDistance ? Number(query.maxDistance) : NaN;

  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { trailName: regex },
      { meetingPoint: regex },
      { description: regex },
      { gearChecklist: regex }
    ];
  }
  if (district && DISTRICTS.includes(district)) {
    filter.district = district;
  }
  if (difficulty && DIFFICULTIES.includes(difficulty)) {
    filter.difficulty = difficulty;
  }
  if (status && STATUSES.includes(status)) {
    filter.trailStatus = status;
  }
  if (!Number.isNaN(maxDistance) && maxDistance > 0) {
    filter.distanceKm = { $lte: maxDistance };
  }
  return filter;
}

function buildSortOption(sortKey) {
  switch (sortKey) {
    case 'distance_asc':
      return { distanceKm: 1 };
    case 'distance_desc':
      return { distanceKm: -1 };
    case 'elevation_desc':
      return { elevationM: -1 };
    case 'meetup_asc':
      return { meetupDate: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

async function seedInitialData() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const demoUsers = [
      {
        username: 'admin',
        displayName: 'Trail Admin',
        email: 'admin@trailmate.hk',
        password: 'password123',
        role: 'admin'
      },
      {
        username: 'hiker1',
        displayName: 'Alex Hiker',
        email: 'hiker1@trailmate.hk',
        password: 'password123',
        role: 'organizer'
      }
    ];
    for (const u of demoUsers) {
      await User.create(u);
    }
    console.log('Seeded default demo users: admin / password123, hiker1 / password123');
  }

  const trailCount = await Trail.countDocuments();
  if (trailCount === 0) {
    const sampleTrails = [
      {
        trailName: "Dragon's Back (Shek O Peak)",
        district: 'Hong Kong Island',
        difficulty: 'Easy',
        distanceKm: 8.5,
        durationHrs: 3.5,
        elevationM: 284,
        trailStatus: 'Open',
        meetupDate: '2026-12-05',
        meetingPoint: 'Shau Kei Wan MTR Exit A3 (Bus 9 Stop)',
        maxParticipants: 15,
        participants: ['admin', 'hiker1'],
        gearChecklist: ['1.5L Water', 'Sunscreen', 'Cap', 'Trail Shoes'],
        description:
          'Iconic coastal ridge hike overlooking Shek O, Tai Long Wan, and Big Wave Bay with gentle inclines and sweeping sea views.',
        safetyNotes: 'Minimal shade along the ridge; carry sun protection and extra water.',
        createdBy: 'admin'
      },
      {
        trailName: 'Lion Rock Peak',
        district: 'Kowloon',
        difficulty: 'Moderate',
        distanceKm: 6.2,
        durationHrs: 3.0,
        elevationM: 495,
        trailStatus: 'Open',
        meetupDate: '2026-12-06',
        meetingPoint: 'Wong Tai Sin MTR Exit B3',
        maxParticipants: 12,
        participants: ['hiker1'],
        gearChecklist: ['2L Water', 'Trekking Poles', 'Windbreaker'],
        description:
          'Classic Kowloon landmark ascent offering panoramic 360-degree views of Kowloon Peninsula, Victoria Harbour, and Sha Tin.',
        safetyNotes: 'Steep rocky steps near the summit; watch for loose gravel and strong gusts.',
        createdBy: 'hiker1'
      },
      {
        trailName: 'MacLehose Trail Section 2 (Sai Wan to Pak Tam Au)',
        district: 'New Territories',
        difficulty: 'Challenging',
        distanceKm: 13.5,
        durationHrs: 5.5,
        elevationM: 520,
        trailStatus: 'Open',
        meetupDate: '2026-12-12',
        meetingPoint: 'Sai Kung Bus Terminus (Village Bus 29R)',
        maxParticipants: 10,
        participants: ['admin'],
        gearChecklist: ['2.5L Water', 'Electrolytes', 'Headlamp', 'Snacks'],
        description:
          'Scenic Sai Kung coastal trek passing Tai Long Sai Wan, Ham Tin Wan white-sand beaches, and Chek Keng.',
        safetyNotes: 'Long distance with limited exit points; start before 09:00 AM.',
        createdBy: 'admin'
      },
      {
        trailName: 'Sunset Peak (Tai Tung Shan)',
        district: 'Lantau Island',
        difficulty: 'Challenging',
        distanceKm: 9.0,
        durationHrs: 4.5,
        elevationM: 869,
        trailStatus: 'Caution - Weather',
        meetupDate: '2026-12-13',
        meetingPoint: 'Tung Chung MTR Exit B (Bus 11 to Pak Kung Au)',
        maxParticipants: 12,
        participants: ['admin', 'hiker1'],
        gearChecklist: ['2L Water', 'Headlamp', 'Warm Layer', 'Grip Shoes'],
        description:
          'Hong Kong third-highest peak famous for golden silvergrass fields in autumn and historic stone cabins.',
        safetyNotes: 'Temperature drops sharply after sunset; headlamps are mandatory for descent.',
        createdBy: 'hiker1'
      },
      {
        trailName: 'High Junk Peak (Tiu Yue Yung)',
        district: 'New Territories',
        difficulty: 'Moderate',
        distanceKm: 6.8,
        durationHrs: 3.5,
        elevationM: 344,
        trailStatus: 'Open',
        meetupDate: '2026-12-19',
        meetingPoint: 'Diamond Hill MTR Exit C2 (Bus 91 to Ng Fai Tin)',
        maxParticipants: 14,
        participants: ['hiker1'],
        gearChecklist: ['2L Water', 'Gloves', 'Sun Hat'],
        description:
          'Sharp coastal peak in Clear Water Bay Country Park known as one of the Three Sharp Peaks of Hong Kong.',
        safetyNotes: 'Short steep scramble near the peak; non-slip hiking shoes recommended.',
        createdBy: 'admin'
      },
      {
        trailName: 'Lamma Island Family Trail (Yung Shue Wan to Sok Kwu Wan)',
        district: 'Outlying Islands',
        difficulty: 'Easy',
        distanceKm: 5.2,
        durationHrs: 2.0,
        elevationM: 120,
        trailStatus: 'Open',
        meetupDate: '2026-12-20',
        meetingPoint: 'Central Pier 4 (Lamma Ferry)',
        maxParticipants: 20,
        participants: ['admin', 'hiker1'],
        gearChecklist: ['1L Water', 'Camera', 'Comfortable Sneakers'],
        description:
          'Paved island walk connecting bohemian cafes, Hung Shing Yeh Beach, wind turbine lookout, and seafood pier.',
        safetyNotes: 'Check ferry return timetable in advance on weekends.',
        createdBy: 'hiker1'
      }
    ];
    await Trail.insertMany(sampleTrails);
    console.log(`Seeded ${sampleTrails.length} sample Hong Kong trails.`);
  }
}

// ============================================================
// 1. AUTHENTICATION WEB ROUTES (Login / Register / Logout)
// ============================================================

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.render('login', { pageTitle: 'Sign In — TrailMate HK', error: null, username: '' });
});

app.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    if (!username || !password) {
      return res.status(400).render('login', {
        pageTitle: 'Sign In — TrailMate HK',
        error: 'Please enter both username and password.',
        username
      });
    }

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).render('login', {
        pageTitle: 'Sign In — TrailMate HK',
        error: 'Invalid username or password. Try admin / password123.',
        username
      });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    setFlash(req, 'success', `Welcome back, ${user.displayName}!`);
    return res.redirect('/trails');
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).render('login', {
      pageTitle: 'Sign In — TrailMate HK',
      error: 'An unexpected server error occurred. Please try again.',
      username: req.body.username || ''
    });
  }
});

app.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.render('register', {
    pageTitle: 'Create Account — TrailMate HK',
    error: null,
    form: {}
  });
});

app.post('/register', async (req, res) => {
  const form = {
    username: (req.body.username || '').trim(),
    displayName: (req.body.displayName || '').trim(),
    email: (req.body.email || '').trim().toLowerCase()
  };
  const password = req.body.password || '';
  const confirmPassword = req.body.confirmPassword || '';

  try {
    if (!form.username || !form.displayName || !form.email || !password) {
      return res.status(400).render('register', {
        pageTitle: 'Create Account — TrailMate HK',
        error: 'All fields are required.',
        form
      });
    }
    if (password.length < 6) {
      return res.status(400).render('register', {
        pageTitle: 'Create Account — TrailMate HK',
        error: 'Password must be at least 6 characters long.',
        form
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).render('register', {
        pageTitle: 'Create Account — TrailMate HK',
        error: 'Passwords do not match.',
        form
      });
    }

    const existing = await User.findOne({
      $or: [{ username: form.username }, { email: form.email }]
    });
    if (existing) {
      return res.status(409).render('register', {
        pageTitle: 'Create Account — TrailMate HK',
        error: 'Username or email is already registered.',
        form
      });
    }

    const newUser = await User.create({
      username: form.username,
      displayName: form.displayName,
      email: form.email,
      password,
      role: 'member'
    });

    req.session.user = {
      id: newUser._id.toString(),
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role
    };
    setFlash(req, 'success', `Account created! Welcome to TrailMate HK, ${newUser.displayName}.`);
    return res.redirect('/trails');
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).render('register', {
      pageTitle: 'Create Account — TrailMate HK',
      error: err.message || 'Could not create account.',
      form
    });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('trailmate.sid');
    return res.redirect('/login');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('trailmate.sid');
    return res.redirect('/login');
  });
});

// ============================================================
// 2. PROTECTED CRUD WEB PAGES (Authorized Users Only)
// ============================================================

app.get('/trails', requireAuth, async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query);
    const sortOption = buildSortOption(req.query.sort);
    const [trails, totalCount, openCount, allTrails] = await Promise.all([
      Trail.find(filter).sort(sortOption).lean(),
      Trail.countDocuments(),
      Trail.countDocuments({ trailStatus: 'Open' }),
      Trail.find({}, 'distanceKm participants').lean()
    ]);

    const totalDistance = allTrails.reduce((sum, t) => sum + (t.distanceKm || 0), 0).toFixed(1);
    const totalRsvps = allTrails.reduce((sum, t) => sum + (t.participants ? t.participants.length : 0), 0);

    return res.render('dashboard', {
      pageTitle: 'Explore Trails — TrailMate HK',
      trails,
      filters: {
        q: req.query.q || '',
        district: req.query.district || '',
        difficulty: req.query.difficulty || '',
        status: req.query.status || '',
        maxDistance: req.query.maxDistance || '',
        sort: req.query.sort || 'newest'
      },
      stats: {
        totalCount,
        openCount,
        totalDistance,
        totalRsvps
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).send('Failed to load trails.');
  }
});

app.get('/trails/new', requireAuth, (req, res) => {
  return res.render('create', {
    pageTitle: 'Add New Trail — TrailMate HK',
    error: null,
    form: {}
  });
});

app.post('/trails', requireAuth, async (req, res) => {
  const payload = {
    trailName: (req.body.trailName || '').trim(),
    district: req.body.district,
    difficulty: req.body.difficulty,
    distanceKm: Number(req.body.distanceKm),
    durationHrs: Number(req.body.durationHrs),
    elevationM: Number(req.body.elevationM || 0),
    trailStatus: req.body.trailStatus || 'Open',
    meetupDate: (req.body.meetupDate || '').trim(),
    meetingPoint: (req.body.meetingPoint || '').trim(),
    maxParticipants: Number(req.body.maxParticipants || 12),
    gearChecklist: parseListField(req.body.gearChecklist),
    description: (req.body.description || '').trim(),
    safetyNotes: (req.body.safetyNotes || '').trim(),
    participants: [req.session.user.username],
    createdBy: req.session.user.username
  };

  try {
    const created = await Trail.create(payload);
    setFlash(req, 'success', `Trail "${created.trailName}" was created successfully.`);
    return res.redirect(`/trails/${created._id}`);
  } catch (err) {
    return res.status(400).render('create', {
      pageTitle: 'Add New Trail — TrailMate HK',
      error: err.message || 'Please check your input fields.',
      form: req.body
    });
  }
});

app.get('/trails/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }
    const trail = await Trail.findById(req.params.id).lean();
    if (!trail) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    return res.render('detail', {
      pageTitle: `${trail.trailName} — TrailMate HK`,
      trail
    });
  } catch (err) {
    console.error('Detail error:', err);
    return res.redirect('/trails');
  }
});

app.get('/trails/:id/edit', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }
    const trail = await Trail.findById(req.params.id).lean();
    if (!trail) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    return res.render('edit', {
      pageTitle: `Edit ${trail.trailName} — TrailMate HK`,
      trail,
      error: null
    });
  } catch (err) {
    console.error('Edit page error:', err);
    return res.redirect('/trails');
  }
});

app.post('/trails/:id/update', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }

    const updateData = {
      trailName: (req.body.trailName || '').trim(),
      district: req.body.district,
      difficulty: req.body.difficulty,
      distanceKm: Number(req.body.distanceKm),
      durationHrs: Number(req.body.durationHrs),
      elevationM: Number(req.body.elevationM || 0),
      trailStatus: req.body.trailStatus || 'Open',
      meetupDate: (req.body.meetupDate || '').trim(),
      meetingPoint: (req.body.meetingPoint || '').trim(),
      maxParticipants: Number(req.body.maxParticipants || 12),
      gearChecklist: parseListField(req.body.gearChecklist),
      description: (req.body.description || '').trim(),
      safetyNotes: (req.body.safetyNotes || '').trim()
    };

    const updated = await Trail.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }

    setFlash(req, 'success', `Trail "${updated.trailName}" updated successfully.`);
    return res.redirect(`/trails/${updated._id}`);
  } catch (err) {
    const fallbackTrail = { _id: req.params.id, ...req.body, gearChecklist: parseListField(req.body.gearChecklist) };
    return res.status(400).render('edit', {
      pageTitle: 'Edit Trail — TrailMate HK',
      trail: fallbackTrail,
      error: err.message || 'Update validation failed.'
    });
  }
});

app.post('/trails/:id/join', requireAuth, async (req, res) => {
  try {
    const trail = await Trail.findById(req.params.id);
    if (!trail) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    const uname = req.session.user.username;
    const idx = trail.participants.indexOf(uname);
    if (idx >= 0) {
      trail.participants.splice(idx, 1);
      setFlash(req, 'info', `You left the hike "${trail.trailName}".`);
    } else if (trail.participants.length >= trail.maxParticipants) {
      setFlash(req, 'warning', `Hike "${trail.trailName}" is already full.`);
    } else {
      trail.participants.push(uname);
      setFlash(req, 'success', `You joined the hike "${trail.trailName}"!`);
    }
    await trail.save();
    return res.redirect(req.get('Referer') || `/trails/${trail._id}`);
  } catch (err) {
    console.error('Join/leave error:', err);
    return res.redirect('/trails');
  }
});

app.post('/trails/:id/delete', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }
    const deleted = await Trail.findByIdAndDelete(req.params.id);
    if (!deleted) {
      setFlash(req, 'danger', 'Trail not found.');
    } else {
      setFlash(req, 'success', `Trail "${deleted.trailName}" has been deleted.`);
    }
    return res.redirect('/trails');
  } catch (err) {
    console.error('Delete error:', err);
    setFlash(req, 'danger', 'Could not delete trail.');
    return res.redirect('/trails');
  }
});

// ============================================================
// 3. RESTFUL CRUD API SERVICES (No Authentication Required)
// ============================================================

// READ (All / Filtered) - HTTP GET
app.get('/api/trails', async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query);
    const sortOption = buildSortOption(req.query.sort);
    const trails = await Trail.find(filter).sort(sortOption).lean();
    return res.status(200).json({
      success: true,
      count: trails.length,
      data: trails
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// READ (Single by ID) - HTTP GET
app.get('/api/trails/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid trail ID format' });
    }
    const trail = await Trail.findById(req.params.id).lean();
    if (!trail) {
      return res.status(404).json({ success: false, error: 'Trail not found' });
    }
    return res.status(200).json({ success: true, data: trail });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// READ (Aggregate Statistics) - HTTP GET
app.get('/api/stats', async (req, res) => {
  try {
    const byDistrict = await Trail.aggregate([
      {
        $group: {
          _id: '$district',
          trailCount: { $sum: 1 },
          avgDistanceKm: { $avg: '$distanceKm' }
        }
      },
      { $sort: { trailCount: -1 } }
    ]);
    const totalTrails = await Trail.countDocuments();
    return res.status(200).json({
      success: true,
      totalTrails,
      byDistrict
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE - HTTP POST
app.post('/api/trails', async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.gearChecklist) {
      body.gearChecklist = parseListField(body.gearChecklist);
    }
    if (!body.createdBy) {
      body.createdBy = 'api-client';
    }
    const created = await Trail.create(body);
    return res.status(201).json({
      success: true,
      message: 'Trail created successfully',
      data: created
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE - HTTP PUT
app.put('/api/trails/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid trail ID format' });
    }
    const body = { ...req.body };
    if (body.gearChecklist !== undefined) {
      body.gearChecklist = parseListField(body.gearChecklist);
    }
    const updated = await Trail.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Trail not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Trail updated successfully',
      data: updated
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE - HTTP DELETE
app.delete('/api/trails/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid trail ID format' });
    }
    const deleted = await Trail.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Trail not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Trail deleted successfully',
      deletedId: deleted._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
    app.listen(PORT, () => {
      console.log(`TrailMate HK server running at http://localhost:${PORT}`);
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
