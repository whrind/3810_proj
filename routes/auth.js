const express = require('express');
const User = require('../models/User');
const { setFlash } = require('../middleware/auth');

const router = express.Router();

function establishSession(req, user, flashMessage, res) {
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).send('Session initialization failed.');
    }
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    setFlash(req, 'success', flashMessage);
    return req.session.save(() => res.redirect('/trails'));
  });
}

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.render('login', { pageTitle: 'Sign In — TrailMate HK', error: null, username: '' });
});

router.post('/login', async (req, res) => {
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
        error: 'Invalid username or password.',
        username
      });
    }

    return establishSession(req, user, `Welcome back, ${user.displayName}!`, res);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).render('login', {
      pageTitle: 'Sign In — TrailMate HK',
      error: 'Server error during sign-in. Please try again.',
      username: req.body.username || ''
    });
  }
});

router.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/trails');
  }
  return res.render('register', {
    pageTitle: 'Create Account — TrailMate HK',
    error: null,
    form: {}
  });
});

router.post('/register', async (req, res) => {
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

    return establishSession(
      req,
      newUser,
      `Account created! Welcome to TrailMate HK, ${newUser.displayName}.`,
      res
    );
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).render('register', {
      pageTitle: 'Create Account — TrailMate HK',
      error: err.message || 'Could not create account.',
      form
    });
  }
});

function handleLogout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('trailmate.sid');
    return res.redirect('/login');
  });
}

router.post('/logout', handleLogout);
router.get('/logout', handleLogout);

module.exports = router;
