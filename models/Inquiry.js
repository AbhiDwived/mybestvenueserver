import mongoose from 'mongoose';
import moment from 'moment';
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
    weddingDate: {
        type: String,

        default: () => moment().format('DD/MM/YYYY'),
        match: [/^\d{2}\/\d{2}\/\d{4}$/, 'Please enter date in DD/MM/YYYY format']
    },
    userMessage: [{
        message: {
            type: String,
            // required: true
        },
        vendorReply: {
            message: {
                type: String,

            },

            createdAt: {
                type: Date,
                default: Date.now,
            },
            updatedAt: {
                type: Date,
                default: Date.now,
            },
        },
        date: {
            type: Date,
            default: () => moment().format('DD/MM/YYYY'),
        },
        time: {
            type: String,
            default: () => moment().format('hh:mm:ss A'),


        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },

    }],


    replyStatus: {
        type: String,
        enum: ["Pending", "Replied"],
        default: "Pending"
    }
}, { timestamps: true })
const UserInquiry = mongoose.model('Inquiry', InquirySchema)
export default UserInquiry