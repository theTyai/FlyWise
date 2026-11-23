# User backend

The API the traveller app talks to. Port **5000**.

It handles traveller accounts, flight search, booking requests and notifications. It can never confirm, reject or revoke a booking: that code lives only in the admin backend.

```
npm run dev -w @flywise/user-backend     start with auto-restart on file changes
npm test -w @flywise/user-backend        run its tests
```

## Layout

```
src/
├── server.js        start-up: connect to MongoDB, start HTTP, attach Socket.IO
├── app.js           the Express app: security middleware, routes, error handler
├── config/          every setting read from the root .env
├── routes/          URL -> middleware -> controller   (start reading here)
├── controllers/     read the validated request, call a service, send the reply
├── services/        the business rules
│   ├── auth.service.js             register, login, refresh, logout
│   ├── token.service.js            JWT signing, verifying, refresh-token rotation
│   ├── search.service.js           provider -> ranking -> save
│   ├── booking.service.js          create / read / update / cancel
│   ├── notification.service.js     save and push notifications, tell the desk
│   ├── fallbackRanking.service.js  the formula used when the AI service is offline
│   └── user.service.js             profile updates
├── validators/      zod schemas: what each request may contain
├── middleware/      requireUser, optionalUser, rate limits
├── integrations/
│   ├── flight-provider/   mockProvider.js (sample data), duffelProvider.js (live), index.js (chooser)
│   └── ai-service/        client for the Python service; re-validates its replies
├── sockets/         one private room per traveller
└── utils/           serializers: database document -> API JSON
tests/               providers.test.js, validators.test.js
```

## Adding a flight data source

1. Add a file in `src/integrations/flight-provider/` that exports `{ name, mode, label, search() }`, where `search()` returns offers in the normalised shape (see `shared/models/flight.model.js`).
2. Add a `case` for it in `index.js`.
3. Set `FLIGHT_PROVIDER` in `.env`.

Nothing else in the system needs to change.

Endpoints are listed in the master [README.md](../../README.md#10-api-endpoint-specifications).
