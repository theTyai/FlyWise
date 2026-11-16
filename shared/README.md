# Shared

Code used by more than one FlyWise program. Changing something here changes it everywhere, which is the point: the backends and the frontends cannot drift apart.

| Path | Used by | Contents |
|---|---|---|
| `constants.js` | Everything, including the browser | Booking statuses, the state machine (`TRANSITIONS`, `canTransition`), status labels, recommendation categories, notification types, admin permissions, airports |
| `models/` | Both backends | Mongoose schemas, one file per area, re-exported from `models/index.js` |
| `http.js` | Both backends | `ApiError`, `ok()`, `validate()`, `errorHandler`, `sanitizeRequest`, `paginate`, `pageMeta`, `requireInternalKey`, `postInternal` |
| `db.js` | Both backends | `connectDB`, `isValidId` |
| `env.js` | Both backends | Loads the root `.env`; `env()`, `envInt()`, `secret()` |
| `time.js` | Both backends | India Standard Time helpers |
| `design/theme.css` | Both frontends | Design tokens and component classes |
| `ui/index.jsx` | Both frontends | `Button`, `StatusPill`, `Notice`, `Field`, `Dialog`, `EmptyState`, `PageLoading` |
| `ui/format.js` | Both frontends | Date, time, money and duration formatters |
| `tests/` | | Tests for the state machine and the HTTP helpers |

## Importing

```js
// in a backend
import { BookingRequest } from '@flywise/shared/models.js';
import { BOOKING_STATUS, canTransition } from '@flywise/shared/constants.js';

// in a frontend
import { STATUS_META } from '@shared/constants.js';
import { Button } from '@shared/ui/index.jsx';
```

`constants.js` has no dependencies, so it is safe in the browser. `http.js`, `db.js`, `env.js` and `models/` are server-only.

See [docs/database-design.md](../docs/database-design.md) for the schemas and [docs/design-system.md](../docs/design-system.md) for the design tokens.
