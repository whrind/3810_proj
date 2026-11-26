const mongoose = require('mongoose');
const Trail = require('../models/Trail');
const ForumPost = require('../models/ForumPost');

function listForumTrails() {
  return Trail.find({}, 'trailName').sort({ trailName: 1, _id: 1 }).lean();
}

async function linkForumTrail(payload, relatedTrailId) {
  if (relatedTrailId !== undefined) {
    if (relatedTrailId === '' || relatedTrailId === null) {
      return { ...payload, relatedTrailId: null, relatedTrail: 'General' };
    }
    if (!mongoose.isObjectIdOrHexString(relatedTrailId)) {
      throw new Error('Invalid related trail ID.');
    }
    const trail = await Trail.findById(relatedTrailId, 'trailName').lean();
    if (!trail) throw new Error('Related trail not found.');
    return { ...payload, relatedTrailId: trail._id, relatedTrail: trail.trailName };
  }

  if (payload.relatedTrail === undefined) return payload;
  if (payload.relatedTrail === 'General') return { ...payload, relatedTrailId: null };

  // Existing API clients can still send a trail name. Link only unambiguous names.
  const matches = await Trail.find({ trailName: payload.relatedTrail }, '_id').limit(2).lean();
  return { ...payload, relatedTrailId: matches.length === 1 ? matches[0]._id : null };
}

function showCurrentTrailNames(posts, trails) {
  const names = new Map(trails.map((trail) => [String(trail._id), trail.trailName]));
  return posts.map((post) => ({
    ...post,
    relatedTrail: names.get(String(post.relatedTrailId)) ?? post.relatedTrail
  }));
}

async function backfillForumTrailIds() {
  const legacyNames = await ForumPost.distinct('relatedTrail', {
    relatedTrailId: null,
    relatedTrail: { $ne: 'General' }
  });
  if (legacyNames.length === 0) return;

  const trails = await Trail.find({ trailName: { $in: legacyNames } }, 'trailName').lean();
  const ids = new Map();
  for (const { _id, trailName } of trails) {
    ids.set(trailName, ids.has(trailName) ? null : _id);
  }
  const updates = [...ids].filter(([, id]) => id).map(([relatedTrail, id]) => ({
    updateMany: {
      filter: { relatedTrail, relatedTrailId: null },
      update: { $set: { relatedTrailId: id } },
      timestamps: false
    }
  }));
  if (updates.length) await ForumPost.bulkWrite(updates);
}

module.exports = { listForumTrails, linkForumTrail, showCurrentTrailNames, backfillForumTrailIds };
