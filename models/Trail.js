const mongoose = require('mongoose');

const trailSchema = new mongoose.Schema(
  {
    trailName: {
      type: String,
      required: [true, 'Trail name is required'],
      trim: true,
      maxlength: [100, 'Trail name cannot exceed 100 characters']
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      enum: [
        'Hong Kong Island',
        'Kowloon',
        'New Territories',
        'Lantau Island',
        'Outlying Islands'
      ]
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty level is required'],
      enum: ['Easy', 'Moderate', 'Challenging', 'Expert']
    },
    distanceKm: {
      type: Number,
      required: [true, 'Distance (km) is required'],
      min: [0.5, 'Distance must be at least 0.5 km'],
      max: [150, 'Distance cannot exceed 150 km']
    },
    durationHrs: {
      type: Number,
      required: [true, 'Estimated duration (hours) is required'],
      min: [0.5, 'Duration must be at least 0.5 hours'],
      max: [48, 'Duration cannot exceed 48 hours']
    },
    elevationM: {
      type: Number,
      default: 0,
      min: [0, 'Elevation gain cannot be negative']
    },
    trailStatus: {
      type: String,
      enum: ['Open', 'Caution - Weather', 'Maintenance'],
      default: 'Open'
    },
    meetupDate: {
      type: String,
      trim: true,
      default: ''
    },
    meetingPoint: {
      type: String,
      required: [true, 'Meeting point is required'],
      trim: true,
      maxlength: [120, 'Meeting point cannot exceed 120 characters']
    },
    maxParticipants: {
      type: Number,
      default: 12,
      min: [1, 'Max participants must be at least 1'],
      max: [100, 'Max participants cannot exceed 100']
    },
    participants: {
      type: [String],
      default: []
    },
    gearChecklist: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      required: [true, 'Trail description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    safetyNotes: {
      type: String,
      trim: true,
      default: 'Bring at least 1.5L of water, check HKO weather warnings before departure.'
    },
    createdBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true
  }
);

trailSchema.index({ trailName: 'text', meetingPoint: 'text', description: 'text' });

module.exports = mongoose.model('Trail', trailSchema);
