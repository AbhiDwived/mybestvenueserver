import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
    },
    eventDate: {
      type: Date,
    },
    eventTime: {
      type: String,
    },
    venue: {
      type: String,
    },
    guestCount: {
      type: Number,
      default: 0,
    },
    plannedAmount: {
      type: Number,
      required: [true, 'Planned amount is required'],
      min: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Export the model
const Booking = mongoose.model('Booking', bookingSchema);

export default Booking; 