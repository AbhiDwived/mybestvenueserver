import Activity from "../models/Activity.js"

// Utility functions for common activity logging scenarios

// Base activity logging function
export const logActivity = async ({
  type,
  description,
  actor,
  target = null,
  meta = {},
  status = "success",
  severity = "low",
  req = null,
}) => {
  try {
    const activityData = {
      type,
      description,
      actor: {
        id: actor.id || null,
        name: actor.name,
        role: actor.role,
        email: actor.email || null,
      },
      meta,
      status,
      severity,
    }

    // Add target if provided
    if (target) {
      activityData.target = {
        id: target.id || null,
        name: target.name,
        type: target.type,
      }
    }

    // Add request info if available
    if (req) {
      activityData.ipAddress = req.ip || req.connection?.remoteAddress
      activityData.userAgent = req.get("User-Agent")
    }

    const activity = new Activity(activityData)
    await activity.save()

    console.log(`✅ Activity logged: ${type} by ${actor.name}`)
    return activity
  } catch (error) {
    console.error("❌ Failed to log activity:", error)
    // Don't throw error to prevent breaking main functionality
    return null
  }
}

export const logUserRegistration = async (user, req = null) => {
  return await logActivity({
    type: "User Registration",
    description: `New user ${user.name} registered with email ${user.email}`,
    actor: {
      id: user._id,
      name: user.name,
      role: "user",
      email: user.email,
    },
    meta: {
      registrationMethod: user.registrationMethod || "email",
      verified: user.isVerified || false,
    },
    severity: "low",
    req,
  })
}

export const logUserLogin = async (user, req = null) => {
  return await logActivity({
    type: "Login",
    description: `${user.name} logged in`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "user",
      email: user.email,
    },
    meta: {
      loginTime: new Date(),
      lastLogin: user.lastLogin,
    },
    severity: "low",
    req,
  })
}

export const logUserLogout = async (user, req = null) => {
  return await logActivity({
    type: "Logout",
    description: `${user.name} logged out`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "user",
      email: user.email,
    },
    meta: {
      logoutTime: new Date(),
      sessionDuration: user.sessionDuration,
    },
    severity: "low",
    req,
  })
}

export const logProfileUpdate = async (user, updatedFields, req = null) => {
  return await logActivity({
    type: "Profile Updated",
    description: `${user.name} updated their profile`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "user",
      email: user.email,
    },
    meta: {
      updatedFields: updatedFields,
      updateTime: new Date(),
    },
    severity: "low",
    req,
  })
}

export const logVendorRegistration = async (vendor, req = null) => {
  return await logActivity({
    type: "Vendor Registration",
    description: `New vendor ${vendor.businessName} registered`,
    actor: {
      id: vendor._id,
      name: vendor.businessName,
      role: "vendor",
      email: vendor.email,
    },
    meta: {
      category: vendor.category,
      location: vendor.location,
      registrationDate: new Date(),
    },
    severity: "medium",
    req,
  })
}

export const logVendorApplication = async (vendor, req = null) => {
  return await logActivity({
    type: "Vendor Application",
    description: `${vendor.businessName} submitted vendor application`,
    actor: {
      id: vendor._id,
      name: vendor.businessName,
      role: "vendor",
      email: vendor.email,
    },
    meta: {
      category: vendor.category,
      applicationDate: new Date(),
      documents: vendor.documents?.length || 0,
    },
    severity: "medium",
    req,
  })
}

export const logVendorApproval = async (vendor, admin, req = null) => {
  return await logActivity({
    type: "Vendor Approved",
    description: `${vendor.businessName} has been approved as a vendor`,
    actor: {
      id: admin._id,
      name: admin.name,
      role: "admin",
      email: admin.email,
    },
    target: {
      id: vendor._id,
      name: vendor.businessName,
      type: "vendor",
    },
    meta: {
      approvalDate: new Date(),
      category: vendor.category,
      approvedBy: admin.name,
    },
    severity: "high",
    req,
  })
}

export const logVendorRejection = async (vendor, admin, reason, req = null) => {
  return await logActivity({
    type: "Vendor Rejected",
    description: `${vendor.businessName} application was rejected`,
    actor: {
      id: admin._id,
      name: admin.name,
      role: "admin",
      email: admin.email,
    },
    target: {
      id: vendor._id,
      name: vendor.businessName,
      type: "vendor",
    },
    meta: {
      rejectionDate: new Date(),
      reason: reason,
      rejectedBy: admin.name,
    },
    severity: "high",
    req,
  })
}

export const logReviewSubmission = async (review, user, vendor, req = null) => {
  return await logActivity({
    type: "Review Submitted",
    description: `${user.name} submitted a review for ${vendor.businessName}`,
    actor: {
      id: user._id,
      name: user.name,
      role: "user",
      email: user.email,
    },
    target: {
      id: vendor._id,
      name: vendor.businessName,
      type: "vendor",
    },
    meta: {
      rating: review.rating,
      reviewId: review._id,
      hasImages: review.images?.length > 0,
    },
    severity: "low",
    req,
  })
}

export const logReviewReport = async (review, reporter, reason, req = null) => {
  return await logActivity({
    type: "Review Reported",
    description: `Review reported by ${reporter.name}`,
    actor: {
      id: reporter._id,
      name: reporter.name,
      role: reporter.role || "user",
      email: reporter.email,
    },
    target: {
      id: review._id,
      name: `Review by ${review.user?.name}`,
      type: "review",
    },
    meta: {
      reason: reason,
      reviewId: review._id,
      originalReviewer: review.user?.name,
    },
    severity: "medium",
    req,
  })
}

export const logBlogPost = async (post, author, req = null) => {
  return await logActivity({
    type: "Blog Post Published",
    description: `New blog post "${post.title}" published`,
    actor: {
      id: author._id,
      name: author.name,
      role: author.role || "admin",
      email: author.email,
    },
    target: {
      id: post._id,
      name: post.title,
      type: "blog",
    },
    meta: {
      category: post.category,
      tags: post.tags,
      publishDate: new Date(),
    },
    severity: "low",
    req,
  })
}

export const logSystemMaintenance = async (admin, description, req = null) => {
  return await logActivity({
    type: "System Maintenance",
    description: description,
    actor: {
      id: admin._id,
      name: admin.name,
      role: "admin",
      email: admin.email,
    },
    meta: {
      maintenanceDate: new Date(),
      performedBy: admin.name,
    },
    severity: "high",
    req,
  })
}

export const logDataExport = async (user, exportType, req = null) => {
  return await logActivity({
    type: "Data Export",
    description: `${user.name} exported ${exportType} data`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "admin",
      email: user.email,
    },
    meta: {
      exportType: exportType,
      exportDate: new Date(),
      fileFormat: "CSV",
    },
    severity: "medium",
    req,
  })
}

// Batch logging for multiple activities
export const logBatchActivities = async (activities) => {
  try {
    const activityDocs = activities.map((activity) => new Activity(activity))
    await Activity.insertMany(activityDocs)
    console.log(`✅ Batch logged ${activities.length} activities`)
    return activityDocs
  } catch (error) {
    console.error("❌ Failed to batch log activities:", error)
    return null
  }
}

// Clean old activities (utility function)
export const cleanOldActivities = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate },
      severity: { $in: ["low", "medium"] }, // Keep high and critical activities
    })

    console.log(`🧹 Cleaned ${result.deletedCount} old activities`)
    return result.deletedCount
  } catch (error) {
    console.error("❌ Failed to clean old activities:", error)
    return 0
  }
}
