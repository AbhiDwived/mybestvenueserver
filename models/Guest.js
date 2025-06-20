import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Make sure at least email or phone is provided
guestSchema.pre('save', function(next) {
  if (!this.email && !this.phone) {
    next(new Error('At least email or phone must be provided'));
  } else {
    next();
  }
});

const Guest = mongoose.model('Guest', guestSchema);

export default Guest;
