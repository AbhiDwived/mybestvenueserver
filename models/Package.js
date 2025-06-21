import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },
  packageName: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true,
  },
  services: {
    type: [String],
    required: [true, 'Services are required'],
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: [true, 'Package price is required'],
  },
  offerPrice: {
    type: Number,
    default: 0,
  },
  offerPercentage: {
    type: Number,
    default: 0,
  },
  valid: {
    type: Boolean,
    default: true,
  },
  image: {
    type: String,
  }
}, { timestamps: true }); 

// Ensures vendor can’t have two packages with same name
// packageSchema.index({ vendorId: 1, packageName: 1 }, { unique: true });

const Package = mongoose.model('Package', packageSchema);

export default Package;
