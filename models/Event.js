import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  eventType: {
    type: String,
    enum: ['Wedding', 'Reception', 'Engagement', 'Birthday', 'Corporate', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  guestCount: {
    type: Number,
    min: 0
  },
  venue: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  clientEmail: {
    type: String,
    trim: true
  },
  budget: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
eventSchema.index({ vendorId: 1, eventDate: 1 });
eventSchema.index({ eventDate: 1 });

// Virtual for formatted date
eventSchema.virtual('formattedDate').get(function() {
  return this.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Ensure virtuals are serialized
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);

export default Event; 