const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      trim: true
    },
    authorDisplayName: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [600, 'Comment cannot exceed 600 characters']
    }
  },
  {
    timestamps: true
  }
);

const forumPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Trail Conditions',
        'Gear & Tips',
        'Hiking Buddies',
        'Safety Alert',
        'Trip Report'
      ],
      default: 'Trail Conditions'
    },
    relatedTrail: {
      type: String,
      trim: true,
      default: 'General'
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    authorDisplayName: {
      type: String,
      required: true,
      trim: true
    },
    likes: {
      type: [String],
      default: []
    },
    comments: {
      type: [commentSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

forumPostSchema.index({ title: 'text', content: 'text', relatedTrail: 'text' });

module.exports = mongoose.model('ForumPost', forumPostSchema);
