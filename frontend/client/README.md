# Traveller app

The public website: search flights, see three recommendations, send and manage booking requests. Port **5173**.

```
npm run dev -w @flywise/user-frontend      development server
npm run build -w @flywise/user-frontend    production build into dist/
```

## Layout

```
index.html           page shell; loads the two fonts
vite.config.js       dev server, the @shared alias, reads VITE_* from the root .env
src/
├── main.jsx         mounts React, the router and AuthProvider
├── App.jsx          renders the route table
├── index.css        Tailwind + the shared theme
├── routes/
│   ├── AppRoutes.jsx      every URL and its page
│   └── RequireAuth.jsx    sends signed-out visitors to sign-in
├── pages/
│   ├── Landing.jsx        hero + search ticket
│   ├── Results.jsx        three picks and the full list
│   ├── BookingNew.jsx     passenger details -> send request
│   ├── MyBookings.jsx     waiting / upcoming / past
│   ├── BookingDetail.jsx  one trip: pass, progress, edit, cancel
│   ├── Notifications.jsx
│   ├── Profile.jsx
│   └── Auth.jsx           sign in, register
├── components/
│   ├── Layout.jsx           header, footer, live toasts
│   ├── SearchTicket.jsx     the search form, shaped like a ticket
│   ├── FlightPass.jsx       a flight as a boarding pass
│   ├── StatusPath.jsx       the three-step progress line
│   └── TravellerFields.jsx  passenger + contact form and its checks
├── context/AuthContext.jsx  signed-in traveller, unread count, the live socket
├── hooks/useLoad.js         load data, reload when something changes
└── services/
    ├── api.js                    the HTTP client (token, refresh, errors)
    ├── auth.service.js           /auth, /users/me
    ├── flight.service.js         /flights
    ├── booking.service.js        /bookings
    └── notification.service.js   /notifications
```

## Pages and their URLs

| URL | Page | Sign-in needed |
|---|---|---|
| `/` | Landing | No |
| `/results/:searchId` | Results | No |
| `/login`, `/register` | Auth | No |
| `/book/:offerId` | BookingNew | Yes |
| `/trips` | MyBookings | Yes |
| `/trips/:id` | BookingDetail | Yes |
| `/notifications` | Notifications | Yes |
| `/profile` | Profile | Yes |

The visual identity and design system are described in the master [README.md](../../README.md#4-design-system--visual-identity-tokens).
