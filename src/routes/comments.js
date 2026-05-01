const router = require("express").Router({ mergeParams: true });
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const requireAuth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Post comments and replies
 */

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: List comments for a post (flat, sorted oldest first)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of comments (use parentId to build reply tree)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Comment' }
 *   post:
 *     summary: Add a comment or reply to a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:  { type: string }
 *               parentId: { type: string, description: "ID of parent comment for replies" }
 *     responses:
 *       201:
 *         description: Created comment
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       404:
 *         description: Post or parent comment not found
 *
 * /api/posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete own comment (also removes its replies)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */

// GET /api/posts/:postId/comments — list all comments for a post
router.get("/", async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("userId", "name email");
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:postId/comments — add a comment or reply (auth required)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    if (!content)
      return res.status(400).json({ message: "content is required" });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (parentId) {
      const parent = await Comment.findOne({
        _id: parentId,
        postId: req.params.postId,
      });
      if (!parent) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    const comment = await Comment.create({
      postId: req.params.postId,
      userId: req.userId,
      parentId: parentId || null,
      content,
    });

    await Post.findByIdAndUpdate(req.params.postId, {
      $inc: { commentCount: 1 },
    });

    await comment.populate("userId", "name email");
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:postId/comments/:commentId — delete own comment (auth required)
router.delete("/:commentId", requireAuth, async (req, res, next) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      postId: req.params.postId,
    });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const replies = await Comment.deleteMany({ parentId: comment._id });
    await comment.deleteOne();

    const totalDeleted = 1 + replies.deletedCount;
    await Post.findByIdAndUpdate(req.params.postId, {
      $inc: { commentCount: -totalDeleted },
    });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
