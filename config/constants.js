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

const DISTRICT_IMAGES = {
  'Hong Kong Island': '/images/dragons-back.jpg',
  'Kowloon': '/images/lion-rock.jpg',
  'New Territories': '/images/sai-kung.jpg',
  'Lantau Island': '/images/sunset-peak.jpg',
  'Outlying Islands': '/images/dragons-back.jpg'
};

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

function sanitizeImageUrl(url, district) {
  const cleaned = url ? String(url).trim() : '';
  if (cleaned.startsWith('/images/') || /^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }
  return DISTRICT_IMAGES[district] || '/images/dragons-back.jpg';
}

function pickTrailPayload(body, isPartial = false) {
  const out = {};
  const assignStr = (key) => {
    if (body[key] !== undefined) out[key] = String(body[key]).trim();
  };
  const assignNum = (key) => {
    if (body[key] !== undefined && body[key] !== '') out[key] = Number(body[key]);
  };

  assignStr('trailName');
  if (body.district !== undefined) out.district = body.district;
  if (body.difficulty !== undefined) out.difficulty = body.difficulty;
  assignNum('distanceKm');
  assignNum('durationHrs');
  assignNum('elevationM');
  if (body.trailStatus !== undefined) out.trailStatus = body.trailStatus;
  assignStr('meetupDate');
  assignStr('meetingPoint');
  assignStr('nearestMtr');
  assignStr('busRoutes');
  assignStr('returnTransport');
  assignStr('googleMapsUrl');
  assignNum('maxParticipants');
  assignStr('description');
  assignStr('safetyNotes');

  if (body.gearChecklist !== undefined) {
    out.gearChecklist = parseListField(body.gearChecklist);
  }

  if (body.imageUrl !== undefined || !isPartial) {
    out.imageUrl = sanitizeImageUrl(body.imageUrl, body.district);
  }

  if (!isPartial && !out.googleMapsUrl && out.trailName) {
    out.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${out.trailName} Hong Kong`
    )}`;
  }

  return out;
}

function pickForumPayload(body, isPartial = false) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.content !== undefined) out.content = String(body.content).trim();
  if (body.category !== undefined && FORUM_CATEGORIES.includes(body.category)) {
    out.category = body.category;
  } else if (!isPartial) {
    out.category = 'Trail Conditions';
  }
  if (body.relatedTrail !== undefined) {
    out.relatedTrail = String(body.relatedTrail).trim() || 'General';
  } else if (!isPartial) {
    out.relatedTrail = 'General';
  }
  return out;
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
  if (district && DISTRICTS.includes(district)) filter.district = district;
  if (difficulty && DIFFICULTIES.includes(difficulty)) filter.difficulty = difficulty;
  if (status && STATUSES.includes(status)) filter.trailStatus = status;
  if (!Number.isNaN(maxDistance) && maxDistance > 0) filter.distanceKm = { $lte: maxDistance };
  if (savedOnly) filter.bookmarkedBy = currentUsername;
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
    filter.$or = [
      { title: regex },
      { content: regex },
      { relatedTrail: regex },
      { authorDisplayName: regex }
    ];
  }
  if (category && FORUM_CATEGORIES.includes(category)) filter.category = category;
  if (trail && trail !== 'All') filter.relatedTrail = trail;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const start = new Date(`${dateFrom}T00:00:00+08:00`);
      if (!Number.isNaN(start.getTime())) filter.createdAt.$gte = start;
    }
    if (dateTo) {
      const end = new Date(`${dateTo}T23:59:59.999+08:00`);
      if (!Number.isNaN(end.getTime())) filter.createdAt.$lte = end;
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }
  return filter;
}

function formatHkDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

function parsePagination(query, defaultLimit = 6) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = {
  DISTRICTS,
  DIFFICULTIES,
  STATUSES,
  FORUM_CATEGORIES,
  parseListField,
  pickTrailPayload,
  pickForumPayload,
  buildTrailFilter,
  buildSortOption,
  buildForumFilter,
  formatHkDate,
  parsePagination
};
