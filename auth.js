const jwt = require('jsonwebtoken');

// Login route
router.post('/login', async (req, res) => {
  // Check if the user credentials are valid
  // Assuming user is found and password is correct
  const user = { id: 1, username: 'example' };
  const token = jwt.sign({ user }, '123456', { expiresIn: '1h' });
  res.json({ token });
});
