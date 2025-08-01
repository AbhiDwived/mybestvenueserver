import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false
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
    enum: [
      'Wedding', 'Christmas Party', 'New Year Party', 'Lohri Party', 'Valentine\'s Day',
      'Holi Party', 'Diwali Party', 'Sangeet Ceremony', 'Ring Ceremony', 'Pre Wedding Mehendi Party',
      'Baby Shower', 'Birthday Party', 'First Birthday Party', 'Bachelor Party', 'Bridal Shower',
      'Brand Promotion', 'Kids Birthday Party', 'Childrens Party', 'Christian Communion', 'Class Reunion',
      'Business Dinner', 'Conference', 'Corporate Offsite', 'Corporate Party', 'Cocktail Dinner',
      'Dealers Meet', 'Engagement', 'Exhibition', 'Corporate Training', 'Family Get together',
      'Farewell', 'Fashion Show', 'Family Function', 'Game Watch', 'Get Together',
      'Group Dining', 'Freshers Party', 'Meeting', 'Musical Concert', 'Naming Ceremony',
      'Kitty Party', 'Pool Party', 'House Party', 'Residential Conference', 'Photo Shoots',
      'Stage Event', 'Team Building', 'Team Outing', 'Social Mixer', 'Video Shoots',
      'Walk-in Interview', 'Wedding Anniversary', 'Training', 'Adventure Party', 'Annual Fest',
      'Aqueeqa ceremony', 'Wedding Reception', 'Nightlife', 'Live Sports Screening', 'MICE', 'Other'
    ],
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