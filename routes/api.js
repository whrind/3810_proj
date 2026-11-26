const express = require('express');
const mongoose = require('mongoose');
const Trail = require('../models/Trail');
const ForumPost = require('../models/ForumPost');
const { listForumTrails, linkForumTrail, showCurrentTrailNames } = require('../config/forumTrails');
const {
  pickTrailPayload,
  pickForumPayload,
  buildTrailFilter,
  buildSortOption,
  buildForumFilter,
  parsePagination
} = require('../config/constants');

const router = express.Router();

router.get('/trails', async (req, res) => {
  try {
    const filter = buildTrailFilter(req.query, null);
    const sortOption = buildSortOption(req.query.sort);
    const hasPaging = req.query.page || req.query.limit;

    if (hasPaging) {
      const { page, limit, skip } = parsePagination(req.query, 10);
      const [trails, total] = await Promise.all([
        Trail.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
        Trail.countDocuments(filter)
      ]);
      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        count: trails.length,
        data: trails
      });
    }

    const trails = await Trail.find(filter).sort(sortOption).lean();
    return res.status(200).json({ success: true, count: trails.length, data: trails });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trails/:id', async (req, res) => {
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

router.post('/trails', async (req, res) => {
  try {
    const payload = pickTrailPayload(req.body, false);
    payload.createdBy = 'api-client';
    const created = await Trail.create(payload);
    return res.status(201).json({
      success: true,
      message: 'Trail created successfully',
      data: created
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/trails/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid trail ID format' });
    }
    const payload = pickTrailPayload(req.body, true);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updatable fields provided' });
    }
    const updated = await Trail.updateDetails(req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Trail not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Trail updated successfully',
      data: updated
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

router.delete('/trails/:id', async (req, res) => {
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

router.get('/forum', async (req, res) => {
  try {
    const trails = await listForumTrails();
    const filter = buildForumFilter(req.query, trails);
    const hasPaging = req.query.page || req.query.limit;

    if (hasPaging) {
      const { page, limit, skip } = parsePagination(req.query, 10);
      const [posts, total] = await Promise.all([
        ForumPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ForumPost.countDocuments(filter)
      ]);
      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        count: posts.length,
        data: showCurrentTrailNames(posts, trails)
      });
    }

    const posts = await ForumPost.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: posts.length, data: showCurrentTrailNames(posts, trails) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/forum', async (req, res) => {
  try {
    const payload = await linkForumTrail(pickForumPayload(req.body, false), req.body.relatedTrailId);
    const created = await ForumPost.create({
      ...payload,
      author: 'api-client',
      authorDisplayName: (req.body.authorDisplayName || 'API Hiker').trim()
    });
    return res.status(201).json({ success: true, message: 'Forum post created', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/forum/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid post ID format' });
    }
    const payload = await linkForumTrail(pickForumPayload(req.body, true), req.body.relatedTrailId);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updatable fields provided' });
    }
    const updated = await ForumPost.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Forum post not found' });
    }
    const trail = updated.relatedTrailId && await Trail.findById(updated.relatedTrailId, 'trailName').lean();
    const [data] = showCurrentTrailNames([updated.toObject()], trail ? [trail] : []);
    return res.status(200).json({ success: true, message: 'Forum post updated', data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/forum/:id', async (req, res) => {
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

router.get('/stats', async (req, res) => {
  try {
    const [byDistrict, totalTrails, totalForumPosts] = await Promise.all([
      Trail.aggregate([
        {
          $group: {
            _id: '$district',
            trailCount: { $sum: 1 },
            avgDistanceKm: { $avg: '$distanceKm' }
          }
        },
        { $sort: { trailCount: -1 } }
      ]),
      Trail.countDocuments(),
      ForumPost.countDocuments()
    ]);
    return res.status(200).json({ success: true, totalTrails, totalForumPosts, byDistrict });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
