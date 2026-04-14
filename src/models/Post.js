const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image:       { type: String, trim: true },
    authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments:    [commentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
