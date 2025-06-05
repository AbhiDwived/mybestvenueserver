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
router.get("/recent", VerifyAdmin, getRecentActivities); // used via RTK Query: /api/v1/admin/recent
router.get("/stats", VerifyAdmin, getActivityStats);
router.get("/search", VerifyAdmin, searchActivities);

// Actor-specific route
router.get("/actor/:actorId", VerifyAdmin, getActivitiesByActor);

// Logging & deletion routes
router.post("/log", VerifyAdmin, logActivityHandler);
router.delete("/:id", VerifyAdmin, deleteActivity);
router.post("/bulk-delete", VerifyAdmin, bulkDeleteActivities);

export default router;