# Admin backend

The API the desk app talks to. Port **5001**.

It handles desk sign-in, the three booking decisions (confirm, reject, revoke), simulated seat inventory, traveller accounts, the audit log and the dashboard figures. Every route except sign-in requires an admin token, and most also require a named permission.

```
npm run dev -w @flywise/admin-backend     start with auto-restart on file changes
npm test -w @flywise/admin-backend        run its tests
npm run seed:admin                        create the desk account from .env (if none exists)
npm run seed:demo                         add demo travellers, flights and requests
npm run db:reset -- --yes                 delete all FlyWise data
```

## Layout

```
src/
├── server.js        start-up: connect to MongoDB, ensure a desk account, start HTTP + Socket.IO
├── app.js           the Express app
├── config/          every setting read from the root .env
├── routes/          URL -> permission -> controller   (start reading here)
├── controllers/     read the validated request, call a service, send the reply
├── services/
│   ├── decision.service.js      confirm / reject / revoke: the core of the project
│   ├── booking.service.js       the request list and the detail view
│   ├── dashboard.service.js     overview figures (MongoDB aggregations)
│   ├── inventory.service.js     add inventory, change a seat total
│   ├── user.service.js          list, suspend, reactivate travellers
│   ├── audit.service.js         write and list audit entries
│   ├── notification.service.js  tell the traveller and other desk tabs
│   ├── settings.service.js      default seats; health of the other services
│   ├── auth.service.js          desk sign-in
│   └── token.service.js         admin JWTs
├── validators/      zod schemas
├── middleware/      requireAdmin, requirePermission, rate limits, id check
├── sockets/         the "desk" room
├── scripts/         seedAdmin.js, seedDemo.js, resetDb.js
└── utils/           serializers
tests/               validators.test.js, decisions.integration.test.js (needs MONGODB_TEST_URI)
```

## The file to read first

`src/services/decision.service.js`. Its header comment lists the reliability rules, and `confirmBooking` shows how the last seat can only be allocated once with atomic seat operations. See the master [README.md](../../README.md#7-booking-state-machine--atomic-lifecycle) for the complete workflow.

Endpoints are listed in the master [README.md](../../README.md#10-api-endpoint-specifications).
