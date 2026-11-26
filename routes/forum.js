const express = require('express');
const mongoose = require('mongoose');
const ForumPost = require('../models/ForumPost');
const Trail = require('../models/Trail');
const { requireAuth, canModify, setFlash } = require('../middleware/auth');
const {
  FORUM_CATEGORIES,
  pickForumPayload,
  buildForumFilter,
  parsePagination
} = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const filter = buildForumFilter(req.query);
    const sortKey = req.query.sort || 'newest';
    const { page, limit, skip } = parsePagination(req.query, 6);

    const [allMatched, allPosts, trailList] = await Promise.all([
      ForumPost.find(filter).sort({ createdAt: sortKey === 'oldest' ? 1 : -1 }).lean(),
      ForumPost.find({}, 'category likes comments').lean(),
      Trail.find({}, 'trailName').sort({ trailName: 1 }).lean()
    ]);

    let sorted = allMatched;
    if (sortKey === 'most_liked') {
      sorted = [...allMatched].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortKey === 'most_commented') {
      sorted = [...allMatched].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }

    const matchedCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(matchedCount / limit));
    const posts = sorted.slice(skip, skip + limit);

    const categoryStats = FORUM_CATEGORIES.map((cat) => ({
      name: cat,
      count: allPosts.filter((p) => p.category === cat).length
    }));

    const forumStats = {
      totalPosts: allPosts.length,
      totalReplies: allPosts.reduce((sum, p) => sum + (p.comments ? p.comments.length : 0), 0),
      totalLikes: allPosts.reduce((sum, p) => sum + (p.likes ? p.likes.length : 0), 0),
      activeCategories: categoryStats.filter((c) => c.count > 0).length,
      totalCategories: FORUM_CATEGORIES.length
    };

    return res.render('forum', {
      pageTitle: 'Hiking Forum — TrailMate HK',
      posts,
      categoryStats,
      forumStats,
      totalPosts: allPosts.length,
      pagination: { page, limit, totalPages, matchedCount },
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

router.post('/', async (req, res) => {
  try {
    const payload = pickForumPayload(req.body, false);
    if (!payload.title || !payload.content) {
      setFlash(req, 'danger', 'Post title and content are required.');
      return res.redirect('/forum');
    }

    await ForumPost.create({
      ...payload,
      author: req.session.user.username,
      authorDisplayName: req.session.user.displayName
    });

    setFlash(req, 'success', 'Your discussion post has been published.');
    return res.redirect('/forum');
  } catch (err) {
    console.error('Create post error:', err);
    setFlash(req, 'danger', err.message || 'Could not create post.');
    return res.redirect('/forum');
  }
});

router.post('/:id/comment', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const text = (req.body.text || '').trim();
    if (!text) {
      setFlash(req, 'warning', 'Comment cannot be empty.');
      return res.redirect('/forum');
    }
    const updated = await ForumPost.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            author: req.session.user.username,
            authorDisplayName: req.session.user.displayName,
            text
          }
        }
      },
      { new: true }
    );
    if (!updated) {
      setFlash(req, 'danger', 'Post not found.');
      return res.redirect('/forum');
    }
    setFlash(req, 'success', 'Reply added.');
    return res.redirect(`/forum#post-${updated._id}`);
  } catch (err) {
    console.error('Comment error:', err);
    return res.redirect('/forum');
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const uname = req.session.user.username;
    const unliked = await ForumPost.findOneAndUpdate(
      { _id: req.params.id, likes: uname },
      { $pull: { likes: uname } },
      { new: true }
    );
    if (!unliked) {
      await ForumPost.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { likes: uname } }
      );
    }
    return res.redirect(req.get('Referer') || `/forum#post-${req.params.id}`);
  } catch (err) {
    console.error('Like error:', err);
    return res.redirect('/forum');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/forum');
    }
    const existing = await ForumPost.findById(req.params.id).lean();
    if (!existing) {
      setFlash(req, 'danger', 'Post not found.');
      return res.redirect('/forum');
    }
    if (!canModify(req.session.user, existing.author)) {
      setFlash(req, 'danger', 'Only the post author or an admin can delete this discussion.');
      return res.status(403).redirect('/forum');
    }
    await ForumPost.findByIdAndDelete(req.params.id);
    setFlash(req, 'success', `Deleted discussion "${existing.title}".`);
    return res.redirect('/forum');
  } catch (err) {
    console.error('Delete post error:', err);
    return res.redirect('/forum');
  }
});

module.exports = router;
