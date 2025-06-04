import Activity from '../models/Activity.js';

// Log a new activity
export const logActivity = async ({
  type,
  description,
  actor,
  actorModel,
  target,
  targetModel,
  meta
}) => {
  try {
    await Activity.create({
      type,
      description,
      actor,
      actorModel,
      target,
      targetModel,
      meta
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Get recent activities (for dashboard)
export const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.status(200).json({ activities });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activities', error: err.message });
  }
};

// Get activities by actor
export const getActivitiesByActor = async (req, res) => {
  try {
    const { actorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const activities = await Activity.find({ 'actor.id': actorId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.status(200).json({ activities });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activities', error: err.message });
  }
};

export const logActivityHandler = async (req, res) => {
  try {
    const { type, description, actor, actorModel, target, targetModel, meta } = req.body;
    console.log('Received body:', req.body); // ADD THIS LINE TO CONFIRM
    await Activity.create({ type, description, actor, actorModel, target, targetModel, meta });
    res.status(201).json({ message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log activity', error: err.message });
  }
};

