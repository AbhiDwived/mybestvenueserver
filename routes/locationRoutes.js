import express from 'express';
import { reverseGeocode, getLocationByIp } from '../controllers/locationController.js';

const router = express.Router();

router.get('/reverse-geocode', reverseGeocode);
router.get('/ip-location', getLocationByIp);

export default router;
