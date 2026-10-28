import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [120, 'Option text cannot exceed 120 characters'],
    },
    votes: {
      type: Number,
      default: 0,
      min: [0, 'Votes count cannot be negative'],
    },
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Poll question/title is required'],
      trim: true,
      maxlength: [240, 'Poll title cannot exceed 240 characters'],
    },
    options: {
      type: [optionSchema],
      validate: [
        {
          validator: (val) => Array.isArray(val) && val.length >= 2,
          message: 'A poll must have at least 2 options',
        },
        {
          validator: (val) => Array.isArray(val) && val.length <= 10,
          message: 'A poll cannot exceed 10 options',
        },
      ],
    },
    voterHashes: {
      type: [String],
      default: [],
      select: false, // SHA-256 browser-token digests; hidden from public API responses
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for high-concurrency read queries & fast deduplication
pollSchema.index({ createdAt: -1 });
pollSchema.index({ isActive: 1, expiresAt: 1 });
pollSchema.index({ _id: 1, voterHashes: 1 });

// Virtual to calculate total votes dynamically
pollSchema.virtual('totalVotes').get(function () {
  if (!this.options || !this.options.length) return 0;
  return this.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
});

// Virtual to determine if the poll is currently expired
pollSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

export const Poll = mongoose.model('Poll', pollSchema);
