import mongoose from 'mongoose';
import moment from 'moment';

const AnonymousInquirySchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    eventDate: {
        type: String,
        default: () => moment().format('DD/MM/YYYY'),
        match: [/^\d{2}\/\d{2}\/\d{4}$/, 'Please enter date in DD/MM/YYYY format']
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Replied"],
        default: "Pending"
    },
    vendorReply: {
        message: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
}, { timestamps: true });

const AnonymousInquiry = mongoose.model('AnonymousInquiry', AnonymousInquirySchema);
export default AnonymousInquiry; 