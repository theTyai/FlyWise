# Desk app (admin)

The internal tool where an admin reviews booking requests. Port **5174**.

```
npm run dev -w @flywise/admin-frontend      development server
npm run build -w @flywise/admin-frontend    production build into dist/
```

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the root `.env`. The session lasts for the browser tab: closing it signs you out.

## Layout

```
src/
├── main.jsx         mounts React, the router and DeskProvider
├── App.jsx          renders the route table
├── index.css        Tailwind + the shared theme
├── routes/
│   ├── AppRoutes.jsx      every URL and its page
│   └── RequireAdmin.jsx   sends signed-out visitors to sign-in
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx      waiting queue, totals, charts
│   ├── Requests.jsx       the list: status tabs, search, pages
│   ├── RequestDetail.jsx  Traveller / Flight / Decision + confirm, reject, revoke
│   ├── Inventory.jsx      simulated seats per flight
│   ├── Travellers.jsx     suspend or reactivate accounts
│   ├── AuditLog.jsx
│   └── Settings.jsx       default seats; service health
├── components/
│   ├── Shell.jsx          sidebar, mobile menu, live toasts
│   ├── ui.jsx             PageHeader, Panel, Tabs, SearchField, Pagination, SeatBar
│   └── Charts.jsx         hand-built SVG charts for the overview
├── context/DeskContext.jsx  signed-in admin, permissions, waiting count, the live socket
├── hooks/usePagedList.js    search + pagination kept in the URL, shared by four pages
└── services/
    ├── api.js                   the HTTP client
    ├── auth.service.js          /auth
    ├── booking.service.js       /bookings and the three decisions
    ├── dashboard.service.js     /dashboard
    ├── inventory.service.js     /inventory
    ├── traveller.service.js     /users
    ├── audit.service.js         /audit-logs
    └── settings.service.js      /settings
```

## Pages and their URLs

| URL | Page | Permission the API requires |
|---|---|---|
| `/login` | Login | none |
| `/` | Dashboard | `VIEW_REQUESTS` |
| `/requests`, `/requests?status=CONFIRMED` | Requests | `VIEW_REQUESTS` |
| `/requests/:id` | RequestDetail | `VIEW_REQUESTS`; plus `APPROVE_BOOKINGS`, `REJECT_BOOKINGS` or `REVOKE_BOOKINGS` to decide |
| `/inventory` | Inventory | `MANAGE_INVENTORY` |
| `/travellers` | Travellers | `MANAGE_USERS` |
| `/audit` | AuditLog | `VIEW_AUDIT_LOGS` |
| `/settings` | Settings | `MANAGE_SETTINGS` |

The sidebar hides what the signed-in admin cannot use, but that is only a convenience: the admin backend checks the permission on every request.
