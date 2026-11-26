require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const User = require('./models/User');
const Trail = require('./models/Trail');
const ForumPost = require('./models/ForumPost');

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
const FORUM_CATEGORIES = [
  'Trail Conditions',
  'Gear & Tips',
  'Hiking Buddies',
  'Safety Alert',
  'Trip Report'
];

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
  res.locals.forumCategories = FORUM_CATEGORIES;
  res.locals.currentPath = req.path;
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

function buildTrailFilter(query, currentUsername) {
  const filter = {};
  const keyword = query.q ? String(query.q).trim() : '';
  const district = query.district ? String(query.district).trim() : '';
  const difficulty = query.difficulty ? String(query.difficulty).trim() : '';
  const status = query.status ? String(query.status).trim() : '';
  const maxDistance = query.maxDistance ? Number(query.maxDistance) : NaN;
  const savedOnly = query.saved === '1' && currentUsername;

  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { trailName: regex },
      { meetingPoint: regex },
      { nearestMtr: regex },
      { busRoutes: regex },
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
  if (savedOnly) {
    filter.bookmarkedBy = currentUsername;
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

function buildForumFilter(query) {
  const filter = {};
  const keyword = query.q ? String(query.q).trim() : '';
  const category = query.category ? String(query.category).trim() : '';
  const trail = query.trail ? String(query.trail).trim() : '';
  const dateFrom = query.dateFrom ? String(query.dateFrom).trim() : '';
  const dateTo = query.dateTo ? String(query.dateTo).trim() : '';

  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { content: regex }, { relatedTrail: regex }, { authorDisplayName: regex }];
  }
  if (category && FORUM_CATEGORIES.includes(category)) {
    filter.category = category;
  }
  if (trail && trail !== 'All') {
    filter.relatedTrail = trail;
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const start = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }
    if (dateTo) {
      const end = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) {
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }
  return filter;
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
        meetingPoint: 'Shau Kei Wan MTR Exit A3 (Bus 9 Terminus)',
        nearestMtr: 'Shau Kei Wan MTR Station (Island Line, Exit A3)',
        busRoutes: 'Citybus Route 9 (towards Shek O) — alight at To Tei Wan stop on Shek O Road (~20 mins)',
        returnTransport: 'Citybus Route 9 from Big Wave Bay / Shek O Road back to Shau Kei Wan MTR',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=To+Tei+Wan+Dragons+Back+Trailhead+Hong+Kong',
        maxParticipants: 15,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['admin'],
        gearChecklist: ['1.5L Water', 'Sunscreen', 'Cap', 'Trail Shoes'],
        description:
          'Iconic coastal ridge hike along Hong Kong Trail Section 8 overlooking Shek O, Tai Long Wan, and Big Wave Bay with sweeping sea views.',
        safetyNotes: 'Minimal shade along the ridge; carry sun protection and at least 1.5L of water.',
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
        meetingPoint: 'Wong Tai Sin MTR Exit E (Shatin Pass Road)',
        nearestMtr: 'Wong Tai Sin MTR Station (Kwun Tong Line, Exit E) or Lok Fu MTR Station',
        busRoutes: 'Green Minibus 18M from Shatin Pass Road to Fat Chong Temple, or Green Minibus 72 to Lion Rock Park (Chuk Yuen Road)',
        returnTransport: 'Walk down from Lion Rock Park (Chuk Yuen Road) or take Lung Cheung Road buses to Wong Tai Sin / Lok Fu MTR',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lion+Rock+Park+Chuk+Yuen+Road+Hong+Kong',
        maxParticipants: 12,
        participants: ['hiker1'],
        bookmarkedBy: ['hiker1'],
        gearChecklist: ['2L Water', 'Trekking Poles', 'Windbreaker'],
        description:
          'Classic Kowloon landmark ascent along MacLehose Trail Section 5 offering 360-degree views of Kowloon Peninsula, Victoria Harbour, and Sha Tin.',
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
        meetingPoint: 'Sai Kung Town (Minibus 29R Stop)',
        nearestMtr: 'Choi Hung / Hang Hau / Diamond Hill MTR (transfer to Sai Kung Town) or Sha Tin MTR',
        busRoutes: 'Minibus 29R from Sai Kung Town to Sai Wan Pavilion (~20 mins); or KMB 94 (Sai Kung) / 96R (Diamond Hill, Sun & PH) / 289R (Sha Tin, Sun & PH) to Pak Tam Au',
        returnTransport: 'KMB 94 (to Sai Kung), 96R (to Diamond Hill MTR, Sun & PH), or 289R (to Sha Tin Central, Sun & PH) from Pak Tam Au',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sai+Wan+Pavilion+Sai+Kung+Hong+Kong',
        maxParticipants: 10,
        participants: ['admin'],
        bookmarkedBy: ['admin'],
        gearChecklist: ['2.5L Water', 'Electrolytes', 'Headlamp', 'Snacks'],
        description:
          'Scenic Sai Kung coastal trek in Hong Kong UNESCO Global Geopark passing Tai Long Sai Wan, Ham Tin Wan white-sand beaches, and Chek Keng.',
        safetyNotes: 'Long distance with limited exit points; start before 09:00 AM and check 29R timetable.',
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
        meetingPoint: 'Tung Chung MTR Exit B (Bus Terminus)',
        nearestMtr: 'Tung Chung MTR Station (Tung Chung Line, Exit B)',
        busRoutes: 'New Lantao Bus (NLB) 3M, 11, 11A, or 23 from Tung Chung Bus Terminus — alight at Pak Kung Au',
        returnTransport: 'NLB 3M from Nam Shan / Mui Wo Ferry Pier to Tung Chung MTR, or Ferry from Mui Wo Pier to Central',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pak+Kung+Au+Lantau+Island+Hong+Kong',
        maxParticipants: 12,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['admin', 'hiker1'],
        gearChecklist: ['2L Water', 'Headlamp', 'Warm Layer', 'Grip Shoes'],
        description:
          'Hong Kong third-highest peak (869m) on Lantau Trail Section 2, famous for golden silvergrass fields in autumn and historic Lantau Mountain Camp stone cabins.',
        safetyNotes: 'Temperature drops sharply after sunset; headlamps and windbreakers are mandatory for descent.',
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
        meetingPoint: 'Diamond Hill MTR Exit C2 (KMB 91 Stop)',
        nearestMtr: 'Diamond Hill MTR (Exit C2), Po Lam MTR (Exit A2), or Tseung Kwan O MTR (Exit A1)',
        busRoutes: 'KMB 91 (Diamond Hill MTR), Green Minibus 16 (Po Lam MTR), or Green Minibus 103M (Tseung Kwan O MTR) — alight at Ng Fai Tin on Clear Water Bay Road',
        returnTransport: 'Green Minibus 16 from Po Toi O Village to Po Lam MTR (or KMB 91 / GMB 103M from Sheung Sze Wan stop)',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ng+Fai+Tin+High+Junk+Peak+Country+Trail+Hong+Kong',
        maxParticipants: 14,
        participants: ['hiker1'],
        bookmarkedBy: [],
        gearChecklist: ['2L Water', 'Gloves', 'Sun Hat', 'Grip Shoes'],
        description:
          'Sharp coastal peak in Clear Water Bay Country Park known as one of the Three Sharp Peaks of Hong Kong, finishing near Tin Hau Temple and Po Toi O fishing village.',
        safetyNotes: 'Loose gravel and steep scramble near the summit; non-slip hiking shoes recommended.',
        createdBy: 'admin'
      },
      {
        trailName: 'Lamma Island Family Trail (Yung Shue Wan to Sok Kwu Wan)',
        district: 'Outlying Islands',
        difficulty: 'Easy',
        distanceKm: 5.0,
        durationHrs: 2.0,
        elevationM: 120,
        trailStatus: 'Open',
        meetupDate: '2026-12-20',
        meetingPoint: 'Central Ferry Pier 4 (Yung Shue Wan Berth)',
        nearestMtr: 'Central MTR (Exit A) or Hong Kong MTR (Exit E1) — 8 min walk to Central Pier 4',
        busRoutes: 'HKKF Ferry from Central Pier 4 (Right berth to Yung Shue Wan ~27 mins; Left berth to Sok Kwu Wan ~35 mins)',
        returnTransport: 'HKKF Ferry from Sok Kwu Wan Ferry Pier (or Yung Shue Wan Pier) back to Central Pier 4',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Yung+Shue+Wan+Ferry+Pier+Lamma+Island+Hong+Kong',
        maxParticipants: 20,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['hiker1'],
        gearChecklist: ['1L Water', 'Camera', 'Comfortable Sneakers', 'Sun Hat'],
        description:
          'Paved island walk connecting Yung Shue Wan cafes, Hung Shing Yeh Beach, Lamma Lookout Pavilion, and Sok Kwu Wan seafood pier.',
        safetyNotes: 'Check HKKF return ferry timetable in advance on weekends.',
        createdBy: 'hiker1'
      }
    ];
    await Trail.insertMany(sampleTrails);
    console.log(`Seeded ${sampleTrails.length} sample Hong Kong trails with real transport info.`);
  }

  const forumCount = await ForumPost.countDocuments();
  if (forumCount === 0) {
    const samplePosts = [
      {
        title: 'Sunset Peak silvergrass condition update (Late November)',
        category: 'Trail Conditions',
        relatedTrail: 'Sunset Peak (Tai Tung Shan)',
        content:
          'Just hiked from Pak Kung Au via NLB Bus 11 this morning. The silvergrass near the stone cabins is still golden and super photogenic! Wind picks up hard after 4:30 PM, so definitely pack a windbreaker and headlamp.',
        author: 'hiker1',
        authorDisplayName: 'Alex Hiker',
        likes: ['admin', 'hiker1'],
        comments: [
          {
            author: 'admin',
            authorDisplayName: 'Trail Admin',
            text: 'Thanks for the update! How long was the queue for Bus 3M at Tung Chung?',
            createdAt: new Date('2026-11-24T10:15:00Z')
          }
        ],
        createdAt: new Date('2026-11-24T08:30:00Z')
      },
      {
        title: 'Looking for 2-3 buddies for MacLehose Sec 2 next Saturday',
        category: 'Hiking Buddies',
        relatedTrail: 'MacLehose Trail Section 2 (Sai Wan to Pak Tam Au)',
        content:
          'Planning to catch the 08:30 AM Minibus 29R from Sai Kung Town to Sai Wan Pavilion and hike all the way to Pak Tam Au. Moderate pace with a 45-min lunch stop at Ham Tin Beach. Reply here if you want to join!',
        author: 'admin',
        authorDisplayName: 'Trail Admin',
        likes: ['hiker1'],
        comments: [],
        createdAt: new Date('2026-11-25T12:00:00Z')
      },
      {
        title: 'Best budget grip shoes for High Junk Peak loose gravel?',
        category: 'Gear & Tips',
        relatedTrail: 'High Junk Peak (Tiu Yue Yung)',
        content:
          'Heading to High Junk Peak next month and heard the final ascent has loose scree and gravel. Any recommendations for trail runners under HK$700 that hold up well on dry HK granite?',
        author: 'hiker1',
        authorDisplayName: 'Alex Hiker',
        likes: ['admin'],
        comments: [
          {
            author: 'admin',
            authorDisplayName: 'Trail Admin',
            text: 'Decathlon Evadict MT2 or Merrell Agility Peak on sale are both solid choices with deep lugs.',
            createdAt: new Date('2026-11-22T14:20:00Z')
          }
        ],
        createdAt: new Date('2026-11-22T09:40:00Z')
      },
      {
        title: 'Reminder: Strong Monsoon Signal & Evening Temperature Drop',
        category: 'Safety Alert',
        relatedTrail: 'General',
        content:
          'With cooler northeast monsoon winds arriving across Hong Kong ridges this week, hilltop temperatures on Lantau and Kowloon peaks can feel 5-7°C colder than urban areas. Always check HKO warnings before heading out.',
        author: 'admin',
        authorDisplayName: 'Trail Admin',
        likes: ['admin', 'hiker1'],
        comments: [],
        createdAt: new Date('2026-11-26T04:00:00Z')
      }
    ];
    await ForumPost.insertMany(samplePosts);
    console.log(`Seeded ${samplePosts.length} hiking forum discussions.`);
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
// 2. PROTECTED CRUD WEB PAGES — TRAILS (Authorized Users Only)
// ============================================================

app.get('/trails', requireAuth, async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query, req.session.user.username);
    const sortOption = buildSortOption(req.query.sort);
    const [trails, allTrails] = await Promise.all([
      Trail.find(filter).sort(sortOption).lean(),
      Trail.find({}, 'district distanceKm trailStatus participants bookmarkedBy').lean()
    ]);

    const totalCount = allTrails.length;
    const openCount = allTrails.filter((t) => t.trailStatus === 'Open').length;
    const totalDistance = allTrails.reduce((sum, t) => sum + (t.distanceKm || 0), 0).toFixed(1);
    const totalRsvps = allTrails.reduce((sum, t) => sum + (t.participants ? t.participants.length : 0), 0);
    const savedCount = allTrails.filter(
      (t) => t.bookmarkedBy && t.bookmarkedBy.includes(req.session.user.username)
    ).length;

    const districtStats = DISTRICTS.map((name) => {
      const items = allTrails.filter((t) => t.district === name);
      const open = items.filter((t) => t.trailStatus === 'Open').length;
      const dist = items.reduce((s, t) => s + (t.distanceKm || 0), 0).toFixed(1);
      return { name, count: items.length, open, totalKm: dist };
    });

    return res.render('dashboard', {
      pageTitle: 'Trail Tracker — TrailMate HK',
      trails,
      districtStats,
      filters: {
        q: req.query.q || '',
        district: req.query.district || '',
        difficulty: req.query.difficulty || '',
        status: req.query.status || '',
        maxDistance: req.query.maxDistance || '',
        sort: req.query.sort || 'newest',
        saved: req.query.saved || ''
      },
      stats: {
        totalCount,
        openCount,
        totalDistance,
        totalRsvps,
        savedCount
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
  const trailName = (req.body.trailName || '').trim();
  const payload = {
    trailName,
    district: req.body.district,
    difficulty: req.body.difficulty,
    distanceKm: Number(req.body.distanceKm),
    durationHrs: Number(req.body.durationHrs),
    elevationM: Number(req.body.elevationM || 0),
    trailStatus: req.body.trailStatus || 'Open',
    meetupDate: (req.body.meetupDate || '').trim(),
    meetingPoint: (req.body.meetingPoint || '').trim(),
    nearestMtr: (req.body.nearestMtr || '').trim(),
    busRoutes: (req.body.busRoutes || '').trim(),
    returnTransport: (req.body.returnTransport || '').trim(),
    googleMapsUrl:
      (req.body.googleMapsUrl || '').trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${trailName} Hong Kong`)}`,
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
      nearestMtr: (req.body.nearestMtr || '').trim(),
      busRoutes: (req.body.busRoutes || '').trim(),
      returnTransport: (req.body.returnTransport || '').trim(),
      googleMapsUrl: (req.body.googleMapsUrl || '').trim(),
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

app.post('/trails/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const trail = await Trail.findById(req.params.id);
    if (!trail) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    const uname = req.session.user.username;
    if (!trail.bookmarkedBy) trail.bookmarkedBy = [];
    const idx = trail.bookmarkedBy.indexOf(uname);
    if (idx >= 0) {
      trail.bookmarkedBy.splice(idx, 1);
      setFlash(req, 'info', `Removed "${trail.trailName}" from Saved Trails.`);
    } else {
      trail.bookmarkedBy.push(uname);
      setFlash(req, 'success', `Saved "${trail.trailName}" to your bookmarks.`);
    }
    await trail.save();
    return res.redirect(req.get('Referer') || `/trails/${trail._id}`);
  } catch (err) {
    console.error('Bookmark error:', err);
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
// 3. PROTECTED HIKING DISCUSSION FORUM ROUTES
// ============================================================

app.get('/forum', requireAuth, async (req, res) => {
  try {
    const filter = buildForumFilter(req.query);
    const sortKey = req.query.sort || 'newest';

    const [postsRaw, allPosts, trailList] = await Promise.all([
      ForumPost.find(filter).sort({ createdAt: sortKey === 'oldest' ? 1 : -1 }).lean(),
      ForumPost.find({}, 'category').lean(),
      Trail.find({}, 'trailName').sort({ trailName: 1 }).lean()
    ]);

    let posts = postsRaw;
    if (sortKey === 'most_liked') {
      posts = [...postsRaw].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortKey === 'most_commented') {
      posts = [...postsRaw].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }

    const categoryStats = FORUM_CATEGORIES.map((cat) => ({
      name: cat,
      count: allPosts.filter((p) => p.category === cat).length
    }));

    return res.render('forum', {
      pageTitle: 'Hiking Forum — TrailMate HK',
      posts,
      categoryStats,
      totalPosts: allPosts.length,
      trailNames: trailList.map((t) => t.trailName),
      filters: {
        q: req.query.q || '',
        category: req.query.category || '',
        trail: req.query.trail || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        sort: sortKey
      }
    });
  } catch (err) {
    console.error('Forum error:', err);
    return res.status(500).send('Failed to load forum.');
  }
});

app.post('/forum', requireAuth, async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    const content = (req.body.content || '').trim();
    const category = FORUM_CATEGORIES.includes(req.body.category)
      ? req.body.category
      : 'Trail Conditions';
    const relatedTrail = (req.body.relatedTrail || 'General').trim() || 'General';

    if (!title || !content) {
      setFlash(req, 'danger', 'Post title and content are required.');
      return res.redirect('/forum');
    }

    await ForumPost.create({
      title,
      category,
      relatedTrail,
      content,
      author: req.session.user.username,
      authorDisplayName: req.session.user.displayName
    });

    setFlash(req, 'success', 'Your discussion post has been published!');
    return res.redirect('/forum');
  } catch (err) {
    console.error('Create post error:', err);
    setFlash(req, 'danger', err.message || 'Could not create post.');
    return res.redirect('/forum');
  }
});

app.post('/forum/:id/comment', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const text = (req.body.text || '').trim();
    if (!text) {
      setFlash(req, 'warning', 'Comment cannot be empty.');
      return res.redirect('/forum');
    }
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      setFlash(req, 'danger', 'Post not found.');
      return res.redirect('/forum');
    }
    post.comments.push({
      author: req.session.user.username,
      authorDisplayName: req.session.user.displayName,
      text
    });
    await post.save();
    setFlash(req, 'success', 'Reply added!');
    return res.redirect(`/forum#post-${post._id}`);
  } catch (err) {
    console.error('Comment error:', err);
    return res.redirect('/forum');
  }
});

app.post('/forum/:id/like', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.redirect('/forum');
    const uname = req.session.user.username;
    const idx = post.likes.indexOf(uname);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(uname);
    }
    await post.save();
    return res.redirect(req.get('Referer') || `/forum#post-${post._id}`);
  } catch (err) {
    console.error('Like error:', err);
    return res.redirect('/forum');
  }
});

app.post('/forum/:id/delete', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const deleted = await ForumPost.findByIdAndDelete(req.params.id);
    if (deleted) {
      setFlash(req, 'success', `Deleted forum post "${deleted.title}".`);
    }
    return res.redirect('/forum');
  } catch (err) {
    console.error('Delete post error:', err);
    return res.redirect('/forum');
  }
});

// ============================================================
// 4. RESTFUL CRUD API SERVICES (No Authentication Required)
// ============================================================

// TRAILS REST API
app.get('/api/trails', async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query, null);
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
    const [totalTrails, totalForumPosts] = await Promise.all([
      Trail.countDocuments(),
      ForumPost.countDocuments()
    ]);
    return res.status(200).json({
      success: true,
      totalTrails,
      totalForumPosts,
      byDistrict
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

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

// FORUM REST API
app.get('/api/forum', async (req, res) => {
  try {
    const filter = buildForumFilter(req.query);
    const posts = await ForumPost.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/forum', async (req, res) => {
  try {
    const body = {
      title: req.body.title,
      category: req.body.category || 'Trail Conditions',
      relatedTrail: req.body.relatedTrail || 'General',
      content: req.body.content,
      author: req.body.author || 'api-client',
      authorDisplayName: req.body.authorDisplayName || 'API Hiker'
    };
    const created = await ForumPost.create(body);
    return res.status(201).json({ success: true, message: 'Forum post created', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/forum/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID format' });
    }
    const updated = await ForumPost.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Forum post not found' });
    }
    return res.status(200).json({ success: true, message: 'Forum post updated', data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/forum/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID format' });
    }
    const deleted = await ForumPost.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Forum post not found' });
    }
    return res.status(200).json({ success: true, message: 'Forum post deleted', deletedId: deleted._id });
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
