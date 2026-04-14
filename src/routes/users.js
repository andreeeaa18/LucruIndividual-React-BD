const router = require("express").Router();
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user's public profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Updated user
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Delete own account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account deleted
 *       403:
 *         description: Forbidden
 */
// GET /api/users/:id  — get a user's public profile
router.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id  — update own profile (auth required)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { name, email, password } = req.body;
    const user = await User.findById(req.params.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password; // pre-save hook will rehash

    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id  — delete own account (auth required)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
