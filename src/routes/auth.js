const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Register and login
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password]
 *             properties:
 *               email:    { type: string }
 *               name:     { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       201:
 *         description: User created, returns JWT
 *       409:
 *         description: Email already in use
 */ // POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ message: "email, name and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already in use" });

    const user = await User.create({ email, name, password });
    const token = signToken(user._id);

    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Returns JWT
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function safeUser(user) {
  const { id, email, name, createdAt } = user.toJSON();
  return { id, email, name, createdAt };
}

module.exports = router;
