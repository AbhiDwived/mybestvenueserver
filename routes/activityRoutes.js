import express from 'express';
import { getRecentActivities, getActivitiesByActor, logActivityHandler } from '../controllers/activityController.js';
import { VerifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/recent-activity', VerifyAdmin, getRecentActivities);
router.get('/actor/:actorId', VerifyAdmin, getActivitiesByActor);
router.post('/log', VerifyAdmin, logActivityHandler); // ✅ This must exist

export default router;
