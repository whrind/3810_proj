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
      maxlength: [140, 'Meeting point cannot exceed 140 characters']
    },
    nearestMtr: {
      type: String,
      trim: true,
      default: ''
    },
    busRoutes: {
      type: String,
      trim: true,
      default: ''
    },
    returnTransport: {
      type: String,
      trim: true,
      default: ''
    },
    googleMapsUrl: {
      type: String,
      trim: true,
      default: ''
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '/images/dragons-back.jpg'
    },
    maxParticipants: {
      type: Number,
      default: 12,
      min: [1, 'Max participants must be at least 1'],
      max: [100, 'Max participants cannot exceed 100'],
      validate: [Number.isInteger, 'Max participants must be a whole number']
    },
    participants: {
      type: [String],
      default: []
    },
    bookmarkedBy: {
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
      default: 'Bring at least 1.5L of water and check HKO weather warnings before departure.'
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

trailSchema.index({
  trailName: 'text',
  meetingPoint: 'text',
  nearestMtr: 'text',
  busRoutes: 'text',
  description: 'text'
});

trailSchema.statics.updateDetails = async function updateDetails(id, changes) {
  const filter = { _id: id };
  const capacity = changes.maxParticipants;
  if (Number.isInteger(capacity) && capacity >= 1 && capacity <= 100) {
    filter.$expr = { $lte: [{ $size: { $ifNull: ['$participants', []] } }, capacity] };
  }

  const updated = await this.findOneAndUpdate(filter, changes, {
    new: true,
    runValidators: true
  });
  if (!updated && filter.$expr && await this.exists({ _id: id })) {
    const error = new Error('Max participants cannot be lower than the current number of participants.');
    error.statusCode = 409;
    throw error;
  }
  return updated;
};

module.exports = mongoose.model('Trail', trailSchema);
