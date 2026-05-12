const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Check for user ID forwarded from API Gateway
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    req.userId = gatewayUserId;
    return next();
  }

  // Direct JWT validation (when accessed without gateway)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
