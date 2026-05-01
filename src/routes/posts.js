const router = require("express").Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const requireAuth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post CRUD and likes
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: List all posts (newest first)
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Array of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Post' }
 *   post:
 *     summary: Create a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               image:       { type: string }
 *     responses:
 *       201:
 *         description: Created post
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 *
 * /api/posts/{id}:
 *   get:
 *     summary: Get a single post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post object
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Post' }
 *       404:
 *         description: Post not found
 *   put:
 *     summary: Update own post
 *     tags: [Posts]
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
 *               title:       { type: string }
 *               description: { type: string }
 *               image:       { type: string }
 *     responses:
 *       200:
 *         description: Updated post
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Delete own post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post deleted
 *       403:
 *         description: Forbidden
 *
 * /api/posts/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:     { type: boolean }
 *                 likeCount: { type: integer }
 */

// GET /api/posts — list all posts (newest first)
router.get("/", async (req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .select("-likes")
      .populate("authorId", "name email");
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id — get a single post
router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "authorId",
      "name email",
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts — create a post (auth required)
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

// PUT /api/posts/:id — update own post (auth required)
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

// DELETE /api/posts/:id — delete own post (auth required)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await post.deleteOne();
    await Comment.deleteMany({ postId: post._id });
    res.json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:id/like — toggle like (auth required)
router.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select("likes likeCount");
    if (!post) return res.status(404).json({ message: "Post not found" });

    const alreadyLiked = post.likes.some(
      (uid) => uid.toString() === req.userId,
    );

    if (alreadyLiked) {
      await Post.findByIdAndUpdate(req.params.id, {
        $pull: { likes: req.userId },
        $inc: { likeCount: -1 },
      });
      return res.json({ liked: false, likeCount: post.likeCount - 1 });
    } else {
      await Post.findByIdAndUpdate(req.params.id, {
        $addToSet: { likes: req.userId },
        $inc: { likeCount: 1 },
      });
      return res.json({ liked: true, likeCount: post.likeCount + 1 });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
