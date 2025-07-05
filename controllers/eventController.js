import Event from '../models/Event.js';
import { logger } from '../utils/logger.js';

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const eventData = {
      ...req.body,
      vendorId
    };

    const event = new Event(eventData);
    await event.save();

    logger.info(`Event created for vendor ${vendorId}: ${event.eventName}`);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: error.message
    });
  }
};

// Get all events for a vendor
export const getVendorEvents = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { month, year, status } = req.query;

    let query = { vendorId, isActive: true };

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.eventDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const events = await Event.find(query)
      .sort({ eventDate: 1 })
      .lean();

    logger.info(`Retrieved ${events.length} events for vendor ${vendorId}`);

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    logger.error('Error fetching vendor events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// Get a single event by ID
export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { vendorId } = req.params;

    const event = await Event.findOne({ _id: eventId, vendorId, isActive: true });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: error.message
    });
  }
};

// Update an event
export const updateEvent = async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    const updateData = req.body;

    const event = await Event.findOneAndUpdate(
      { _id: eventId, vendorId, isActive: true },
      updateData,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    logger.info(`Event updated for vendor ${vendorId}: ${event.eventName}`);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: error.message
    });
  }
};

// Delete an event (soft delete)
export const deleteEvent = async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;

    const event = await Event.findOneAndUpdate(
      { _id: eventId, vendorId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    logger.info(`Event deleted for vendor ${vendorId}: ${event.eventName}`);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: error.message
    });
  }
};

// Get events by date range
export const getEventsByDateRange = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const events = await Event.find({
      vendorId,
      isActive: true,
      eventDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    logger.error('Error fetching events by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { limit = 10 } = req.query;

    const events = await Event.find({
      vendorId,
      isActive: true,
      eventDate: { $gte: new Date() }
    })
      .sort({ eventDate: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    logger.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
}; 