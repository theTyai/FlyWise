import { AIRPORTS } from '@flywise/shared/constants.js';
import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as searchService from '../services/search.service.js';

export const listAirports = (_req, res) => {
  ok(res, { airports: AIRPORTS.map(({ code, city, name }) => ({ code, city, name })) });
};

export const search = asyncHandler(async (req, res) => {
  ok(res, await searchService.runSearch(req.body, req.user), undefined, 201);
});

export const getSearch = asyncHandler(async (req, res) => {
  ok(res, await searchService.getSearch(req.params.id));
});

export const getRecommendations = asyncHandler(async (req, res) => {
  ok(res, await searchService.getRecommendations(req.params.id));
});

export const getOffer = asyncHandler(async (req, res) => {
  ok(res, await searchService.getOffer(req.params.id));
});
