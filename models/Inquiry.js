import mongoose from 'mongoose';
import moment from 'moment';

// Sub-schema for a vendor reply
const vendorReplySchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // No _id for embedded replies

// Sub-schema for a user message (with vendor replies as an array)
const userMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  vendorReply: {
    type: [vendorReplySchema], // ✅ ARRAY of replies
    default: []
  },
  date: {
    type: String,
    default: () => moment().format('DD/MM/YYYY')
  },
  time: {
    type: String,
    default: () => moment().format('hh:mm:ss A')
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Main inquiry schema
const InquirySchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  eventDate: {
    type: String,
    default: () => moment().format('DD/MM/YYYY'),
    match: [/^\d{2}\/\d{2}\/\d{4}$/, 'Please enter date in DD/MM/YYYY format']
  },
  userMessage: {
    type: [userMessageSchema],
    default: []
  },
  replyStatus: {
    type: String,
    enum: ["Pending", "Replied"],
    default: "Pending"
  }
}, { timestamps: true });

const UserInquiry = mongoose.model('Inquiry', InquirySchema);
export default UserInquiry;

