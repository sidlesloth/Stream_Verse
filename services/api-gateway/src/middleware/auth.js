const jwt = require('jsonwebtoken');//this file just has functions to be called where we need to check if user has necessary auth, like checking before letting video upload etc

// Optional auth - sets req.userId if token valid, doesn't block if missing
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Optional Auth: No token provided');
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.headers['x-user-id'] = decoded.userId.toString();
    if (decoded.name) req.headers['x-user-name'] = decoded.name;
    console.log('Optional Auth: Valid token, set headers for', req.userId);
  } catch (e) {
    console.log('Optional Auth: Invalid token -', e.message);
    // Token invalid — continue without auth
  }
  next();
};

// Required auth - blocks if no valid token
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.headers['x-user-id'] = decoded.userId.toString();
    if (decoded.name) req.headers['x-user-name'] = decoded.name;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { optionalAuth, requireAuth };
