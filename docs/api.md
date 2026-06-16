# API

All endpoints are Netlify Functions exposed below `/api/v1`. JSON responses use
camel-case properties. Protected endpoints require:

```http
Authorization: Bearer <token>
```

The API returns structured errors:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request did not pass validation.",
    "details": {},
    "correlationId": "..."
  }
}
```

## Route groups

| Group | Routes |
| --- | --- |
| Health | `GET /health` |
| Authentication | register, request OTP, verify OTP, current user, logout |
| Dashboard | account statistics, upcoming events, notifications |
| Gyms | list, create, retrieve |
| Fighters | list, create, retrieve with records |
| Events | list, create, retrieve |
| Invitations | list and send per event |
| Rosters | list and create per event; add fighters |
| Bouts | list and create per event; record decisions and scorecards |
| Safety | withdrawals, weigh-ins, waivers |
| Documents | list, upload and download SQL-backed blobs |
| Notifications | list and mark read |

The Postman collection contains a runnable request and example body for every
route.
