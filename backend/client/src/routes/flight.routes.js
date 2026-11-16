// /api/v1/flights - public: searching and viewing fares needs no account.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as flights from '../controllers/flight.controller.js';
import { optionalUser } from '../middleware/auth.js';
import { searchSchema } from '../validators/flight.validators.js';

const router = Router();

router.get('/airports', flights.listAirports);
router.post('/search', optionalUser, validate(searchSchema), flights.search);
router.get('/search/:id', flights.getSearch);
router.get('/recommendations/:id', flights.getRecommendations);
router.get('/offers/:id', flights.getOffer);

export default router;
