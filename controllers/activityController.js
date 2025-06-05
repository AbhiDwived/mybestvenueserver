import Activity from "../models/Activity.js"

// Get recent activities with filtering and pagination
export const getRecentActivities = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Build filter object
    const filter = {}
    if (req.query.type) filter.type = req.query.type
    if (req.query.role) filter["actor.role"] = req.query.role
    if (req.query.status) filter.status = req.query.status
    if (req.query.severity) filter.severity = req.query.severity

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {}
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate)
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate)
    }

    const activities = await Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
console.log("Fetched Activities:", activities); // 👈 Log what's returned

    const total = await Activity.countDocuments(filter)

    res.status(200).json({
      success: true,
      activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (err) {
    console.error("Failed to fetch activities:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: err.message,
    })
  }
}

// Get activities by actor
export const getActivitiesByActor = async (req, res) => {
  try {
    const { actorId } = req.params
    const limit = Number.parseInt(req.query.limit) || 10
    const page = Number.parseInt(req.query.page) || 1
    const skip = (page - 1) * limit

    const activities = await Activity.find({ "actor.id": actorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Activity.countDocuments({ "actor.id": actorId })

    res.status(200).json({
      success: true,
      activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    })
  } catch (err) {
    console.error("Failed to fetch activities by actor:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: err.message,
    })
  }
}

// Log activity via API endpoint
export const logActivityHandler = async (req, res) => {
  try {
    const { type, description, actor, target, meta, status, severity } = req.body

    // Validate required fields
    if (!type || !description || !actor) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, description, and actor are required",
      })
    }

    // Get IP and User Agent from request
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get("User-Agent")

    const activity = new Activity({
      type,
      description,
      actor,
      target,
      meta: meta || {},
      status: status || "success",
      severity: severity || "low",
      ipAddress,
      userAgent,
    })

    await activity.save()

    res.status(201).json({
      success: true,
      message: "Activity logged successfully",
      activity,
    })
  } catch (err) {
    console.error("Failed to log activity via API:", err)
    res.status(500).json({
      success: false,
      message: "Failed to log activity",
      error: err.message,
    })
  }
}

// Get activity statistics
export const getActivityStats = async (req, res) => {
  try {
    const days = Number.parseInt(req.query.days) || 30

    // Get activity counts by type
    const typeCounts = await Activity.getActivityCounts(days)

    // Get daily activity data
    const dailyActivity = await Activity.getDailyActivity(days)

    // Get total activities
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const totalActivities = await Activity.countDocuments({
      createdAt: { $gte: startDate },
    })

    // Get activities by role
    const roleCounts = await Activity.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$actor.role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Get activities by status
    const statusCounts = await Activity.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])

    res.status(200).json({
      success: true,
      stats: {
        totalActivities,
        typeCounts,
        dailyActivity,
        roleCounts,
        statusCounts,
        period: `${days} days`,
      },
    })
  } catch (err) {
    console.error("Failed to fetch activity stats:", err)
    res.status(500).json({
      success: false,
      message: "Failed to fetch activity statistics",
      error: err.message,
    })
  }
}

// Search activities
export const searchActivities = async (req, res) => {
  try {
    const { query, limit = 10, page = 1 } = req.query
    const skip = (page - 1) * limit

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      })
    }

    const searchFilter = {
      $or: [
        { description: { $regex: query, $options: "i" } },
        { type: { $regex: query, $options: "i" } },
        { "actor.name": { $regex: query, $options: "i" } },
        { "target.name": { $regex: query, $options: "i" } },
      ],
    }

    const activities = await Activity.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .lean()

    const total = await Activity.countDocuments(searchFilter)

    res.status(200).json({
      success: true,
      activities,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    })
  } catch (err) {
    console.error("Failed to search activities:", err)
    res.status(500).json({
      success: false,
      message: "Failed to search activities",
      error: err.message,
    })
  }
}

// Delete activity (admin only)
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params

    const activity = await Activity.findByIdAndDelete(id)

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Activity deleted successfully",
    })
  } catch (err) {
    console.error("Failed to delete activity:", err)
    res.status(500).json({
      success: false,
      message: "Failed to delete activity",
      error: err.message,
    })
  }
}

// Bulk delete activities (admin only)
export const bulkDeleteActivities = async (req, res) => {
  try {
    const { ids, olderThan } = req.body

    const deleteFilter = {}

    if (ids && ids.length > 0) {
      deleteFilter._id = { $in: ids }
    } else if (olderThan) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(olderThan))
      deleteFilter.createdAt = { $lt: cutoffDate }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either ids array or olderThan parameter is required",
      })
    }

    const result = await Activity.deleteMany(deleteFilter)

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} activities deleted successfully`,
      deletedCount: result.deletedCount,
    })
  } catch (err) {
    console.error("Failed to bulk delete activities:", err)
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete activities",
      error: err.message,
    })
  }
}
