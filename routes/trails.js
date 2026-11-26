const express = require('express');
const mongoose = require('mongoose');
const Trail = require('../models/Trail');
const { requireAuth, canModify, setFlash } = require('../middleware/auth');
const {
  DISTRICTS,
  parseListField,
  pickTrailPayload,
  buildTrailFilter,
  buildSortOption,
  parsePagination
} = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query, req.session.user.username);
    const sortOption = buildSortOption(req.query.sort);
    const { page, limit, skip } = parsePagination(req.query, 6);

    const [trails, matchedCount, allTrails] = await Promise.all([
      Trail.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
      Trail.countDocuments(filter),
      Trail.find({}, 'district distanceKm trailStatus participants bookmarkedBy').lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(matchedCount / limit));
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
      pagination: { page, limit, totalPages, matchedCount },
      filters: {
        q: req.query.q || '',
        district: req.query.district || '',
        difficulty: req.query.difficulty || '',
        status: req.query.status || '',
        maxDistance: req.query.maxDistance || '',
        sort: req.query.sort || 'newest',
        saved: req.query.saved || ''
      },
      stats: { totalCount, openCount, totalDistance, totalRsvps, savedCount }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).send('Failed to load trails.');
  }
});

router.get('/new', (req, res) => {
  return res.render('create', {
    pageTitle: 'Add New Trail — TrailMate HK',
    error: null,
    form: {}
  });
});

router.post('/', async (req, res) => {
  const payload = pickTrailPayload(req.body, false);
  payload.participants = [req.session.user.username];
  payload.createdBy = req.session.user.username;

  try {
    const created = await Trail.create(payload);
    setFlash(req, 'success', `Trail "${created.trailName}" was created.`);
    return res.redirect(`/trails/${created._id}`);
  } catch (err) {
    return res.status(400).render('create', {
      pageTitle: 'Add New Trail — TrailMate HK',
      error: err.message || 'Please check your input fields.',
      form: req.body
    });
  }
});

router.get('/:id', async (req, res) => {
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
      trail,
      canEdit: canModify(req.session.user, trail.createdBy)
    });
  } catch (err) {
    console.error('Detail error:', err);
    return res.redirect('/trails');
  }
});

router.get('/:id/edit', async (req, res) => {
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
    if (!canModify(req.session.user, trail.createdBy)) {
      setFlash(req, 'danger', 'Only the trail creator or an admin can edit this trail.');
      return res.status(403).redirect(`/trails/${trail._id}`);
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

router.post('/:id/update', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }
    const existing = await Trail.findById(req.params.id).lean();
    if (!existing) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    if (!canModify(req.session.user, existing.createdBy)) {
      setFlash(req, 'danger', 'Only the trail creator or an admin can update this trail.');
      return res.status(403).redirect(`/trails/${existing._id}`);
    }

    const updateData = pickTrailPayload(req.body, false);
    const updated = await Trail.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    setFlash(req, 'success', `Trail "${updated.trailName}" updated.`);
    return res.redirect(`/trails/${updated._id}`);
  } catch (err) {
    const fallbackTrail = {
      _id: req.params.id,
      ...req.body,
      gearChecklist: parseListField(req.body.gearChecklist)
    };
    return res.status(400).render('edit', {
      pageTitle: 'Edit Trail — TrailMate HK',
      trail: fallbackTrail,
      error: err.message || 'Update validation failed.'
    });
  }
});

router.post('/:id/join', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/trails');
    }
    const uname = req.session.user.username;
    const left = await Trail.findOneAndUpdate(
      { _id: req.params.id, participants: uname },
      { $pull: { participants: uname } },
      { new: true }
    );
    if (left) {
      setFlash(req, 'info', `You left "${left.trailName}".`);
      return res.redirect(req.get('Referer') || `/trails/${left._id}`);
    }

    const joined = await Trail.findOneAndUpdate(
      {
        _id: req.params.id,
        participants: { $ne: uname },
        $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] }
      },
      { $addToSet: { participants: uname } },
      { new: true }
    );

    if (joined) {
      setFlash(req, 'success', `You joined "${joined.trailName}"!`);
      return res.redirect(req.get('Referer') || `/trails/${joined._id}`);
    }

    const exists = await Trail.findById(req.params.id).lean();
    if (!exists) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    setFlash(req, 'warning', `Hike "${exists.trailName}" is already full.`);
    return res.redirect(req.get('Referer') || `/trails/${exists._id}`);
  } catch (err) {
    console.error('Join/leave error:', err);
    return res.redirect('/trails');
  }
});

router.post('/:id/bookmark', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/trails');
    }
    const uname = req.session.user.username;
    const removed = await Trail.findOneAndUpdate(
      { _id: req.params.id, bookmarkedBy: uname },
      { $pull: { bookmarkedBy: uname } },
      { new: true }
    );
    if (removed) {
      setFlash(req, 'info', `Removed "${removed.trailName}" from Saved Trails.`);
      return res.redirect(req.get('Referer') || `/trails/${removed._id}`);
    }

    const saved = await Trail.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { bookmarkedBy: uname } },
      { new: true }
    );
    if (saved) {
      setFlash(req, 'success', `Saved "${saved.trailName}" to your bookmarks.`);
      return res.redirect(req.get('Referer') || `/trails/${saved._id}`);
    }
    return res.redirect('/trails');
  } catch (err) {
    console.error('Bookmark error:', err);
    return res.redirect('/trails');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      setFlash(req, 'danger', 'Invalid trail ID.');
      return res.redirect('/trails');
    }
    const existing = await Trail.findById(req.params.id).lean();
    if (!existing) {
      setFlash(req, 'danger', 'Trail not found.');
      return res.redirect('/trails');
    }
    if (!canModify(req.session.user, existing.createdBy)) {
      setFlash(req, 'danger', 'Only the trail creator or an admin can delete this trail.');
      return res.status(403).redirect('/trails');
    }
    await Trail.findByIdAndDelete(req.params.id);
    setFlash(req, 'success', `Trail "${existing.trailName}" has been deleted.`);
    return res.redirect('/trails');
  } catch (err) {
    console.error('Delete error:', err);
    setFlash(req, 'danger', 'Could not delete trail.');
    return res.redirect('/trails');
  }
});

module.exports = router;
