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

export const logInquirySent = async (user, vendor, inquiry, req = null) => {
  return await logActivity({
    type: "Inquiry Sent",
    description: `${user.name} sent an inquiry to ${vendor.businessName}`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "user",
      email: user.email,
    },
    target: {
      id: vendor._id,
      name: vendor.businessName,
      type: "vendor",
    },
    meta: {
      inquiryId: inquiry._id,
      inquiryType: inquiry.type,
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

export const logBookingCreated = async (user, vendor, booking, req = null) => {
  return await logActivity({
    type: "Booking Created",
    description: `${user.name} created a booking with ${vendor.businessName}`,
    actor: {
      id: user._id,
      name: user.name,
      role: user.role || "user",
      email: user.email,
    },
    target: {
      id: vendor._id,
      name: vendor.businessName,
      type: "vendor",
    },
    meta: {
      bookingId: booking._id,
      eventDate: booking.eventDate,
      status: booking.status,
      timestamp: new Date(),
    },
    severity: "medium",
    req,
  });
};

export const logBookingStatusUpdate = async (booking, updatedBy, newStatus, req = null) => {
  return await logActivity({
    type: "Booking Updated",
    description: `Booking status updated to ${newStatus}`,
    actor: {
      id: updatedBy._id,
      name: updatedBy.name || updatedBy.businessName,
      role: updatedBy.role,
      email: updatedBy.email,
    },
    target: {
      id: booking._id,
      name: `Booking #${booking._id}`,
      type: "booking",
    },
    meta: {
      oldStatus: booking.status,
      newStatus: newStatus,
      timestamp: new Date(),
    },
    severity: "medium",
    req,
  });
};

export const logVendorProfileUpdate = async (vendor, updatedFields, req = null) => {
  return await logActivity({
    type: "Vendor Profile Updated",
    description: `${vendor.businessName} updated their profile`,
    actor: {
      id: vendor._id,
      name: vendor.businessName,
      role: "vendor",
      email: vendor.email,
    },
    meta: {
      updatedFields: Object.keys(updatedFields),
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

export const logPackageUpdate = async (vendor, action, packageDetails, req = null) => {
  return await logActivity({
    type: "Package Updated",
    description: `${vendor.businessName} ${action} a package`,
    actor: {
      id: vendor._id,
      name: vendor.businessName,
      role: "vendor",
      email: vendor.email,
    },
    target: {
      id: packageDetails._id,
      name: packageDetails.name,
      type: "package",
    },
    meta: {
      action: action,
      packageId: packageDetails._id,
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

export const logUserWishlistUpdate = async (user, vendor, action, req = null) => {
  return await logActivity({
    type: "Wishlist Updated",
    description: `${user.name} ${action} ${vendor.businessName} to wishlist`,
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
      action: action,
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

export const logGuestListUpdate = async (user, action, guestCount, req = null) => {
  return await logActivity({
    type: "Guest List Updated",
    description: `${user.name} ${action} guest list`,
    actor: {
      id: user._id,
      name: user.name,
      role: "user",
      email: user.email,
    },
    meta: {
      action: action,
      guestCount: guestCount,
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

export const logBudgetUpdate = async (user, action, amount, category, req = null) => {
  return await logActivity({
    type: "Budget Updated",
    description: `${user.name} ${action} budget`,
    actor: {
      id: user._id,
      name: user.name,
      role: "user",
      email: user.email,
    },
    meta: {
      action: action,
      amount: amount,
      category: category,
      timestamp: new Date(),
    },
    severity: "low",
    req,
  });
};

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
