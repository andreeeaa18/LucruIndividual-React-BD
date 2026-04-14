const router = require("express").Router();
const User = require("../models/User");
const requireAuth = require("../middleware/auth");

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
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      updatedAt: user.updatedAt,
    });
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
