const router = require("express").Router();
const Post = require("../models/Post");
const requireAuth = require("../middleware/auth");

// ─── CRUD ────────────────────────────────────────────────────────────────────

// GET /api/posts  — list all posts (newest first)
router.get("/", async (req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("authorId", "name email")
      .populate("likes", "name")
      .populate("comments.userId", "name");
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id  — get a single post
router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("authorId", "name email")
      .populate("likes", "name")
      .populate("comments.userId", "name");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts  — create a post (auth required)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, description, image } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "title and description are required" });
    }

    const post = await Post.create({
      title,
      description,
      image,
      authorId: req.userId,
    });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:id  — update a post (author only)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, description, image } = req.body;
    if (title) post.title = title;
    if (description) post.description = description;
    if (image !== undefined) post.image = image;

    await post.save();
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id  — delete a post (author only)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
});

// ─── LIKES ───────────────────────────────────────────────────────────────────

// POST /api/posts/:id/like  — toggle like
router.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const alreadyLiked = post.likes.some(
      (uid) => uid.toString() === req.userId,
    );
    if (alreadyLiked) {
      post.likes = post.likes.filter((uid) => uid.toString() !== req.userId);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    next(err);
  }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

// POST /api/posts/:id/comments  — add a comment
router.post("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ userId: req.userId, text });
    await post.save();

    const newComment = post.comments[post.comments.length - 1];
    res.status(201).json(newComment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id/comments/:commentId  — delete own comment
router.delete(
  "/:id/comments/:commentId",
  requireAuth,
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const comment = post.comments.id(req.params.commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });
      if (comment.userId.toString() !== req.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      comment.deleteOne();
      await post.save();
      res.json({ message: "Comment deleted" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
