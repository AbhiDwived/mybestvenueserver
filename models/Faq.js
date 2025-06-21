import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const FAQ = mongoose.model('FAQ', faqSchema);

export default FAQ; 