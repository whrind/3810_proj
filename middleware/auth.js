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

function canModify(user, ownerUsername) {
  if (!user) return false;
  return user.role === 'admin' || user.username === ownerUsername;
}

module.exports = { setFlash, requireAuth, canModify };
