import express from "express";
import {
  getRecentActivities,
  getActivitiesByActor,
  logActivityHandler,
  getActivityStats,
  searchActivities,
  deleteActivity,
  bulkDeleteActivities,
} from "../controllers/activityController.js";
import { VerifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin-only routes — all under /api/v1/admin/...
//  Only admins can access these endpoints for activity logs and stats
router.get("/recent", VerifyAdmin, getRecentActivities); //  Fetch recent activities for admin dashboard
router.get("/stats", VerifyAdmin, getActivityStats); //  Get activity statistics (counts, trends, etc.)
router.get("/search", VerifyAdmin, searchActivities); //  Search activities by filters (date, actor, type, etc.)

// Actor-specific route
//  Fetch all activities performed by a specific actor (user/admin/vendor)
router.get("/actor/:actorId", VerifyAdmin, getActivitiesByActor);

// Logging & deletion routes
//  Log a new activity (admin action, system event, etc.)
router.post("/log", VerifyAdmin, logActivityHandler);

//  Delete a single activity by its ID (admin only)
router.delete("/:id", VerifyAdmin, deleteActivity);

//  Bulk delete activities by filter or list of IDs (admin only)
router.post("/bulk-delete", VerifyAdmin, bulkDeleteActivities);

export default router;