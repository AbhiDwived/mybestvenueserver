import mongoose from "mongoose"

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "User Registration",
      "Vendor Registration",
      "Vendor Application",
      "Vendor Approved",
      "Vendor Rejected",
      "Review Submitted",
      "Review Reported",
      "Review Approved",
      "Review Deleted",
      "Blog Post Published",
      "Content Updated",
      "Login",
      "Logout",
      "Profile Updated",
      "System Maintenance",
      "Password Reset",
      "Account Suspended",
      "Account Activated",
      "Payment Processed",
      "Order Placed",
      "Order Completed",
      "Data Export",
      "Settings Updated",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  actor: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "vendor", "admin", "system"],
      required: true,
    },
    email: String,
  },
  target: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    name: String,
    type: String, // 'user', 'vendor', 'review', 'blog', 'order', etc.
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ["success", "failed", "pending", "cancelled"],
    default: "success",
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "low",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Indexes for better performance
activitySchema.index({ createdAt: -1 })
activitySchema.index({ "actor.id": 1 })
activitySchema.index({ type: 1 })
activitySchema.index({ status: 1 })
activitySchema.index({ severity: 1 })
activitySchema.index({ "actor.role": 1 })

// Update the updatedAt field before saving
activitySchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// Virtual for formatted date
activitySchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
})

// Static method to get activity counts by type
activitySchema.statics.getActivityCounts = async function (days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
}

// Static method to get daily activity data
activitySchema.statics.getDailyActivity = async function (days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
        types: { $addToSet: "$type" },
      },
    },
    { $sort: { _id: 1 } },
  ])
}

const Activity = mongoose.model("Activity", activitySchema)
export default Activity
