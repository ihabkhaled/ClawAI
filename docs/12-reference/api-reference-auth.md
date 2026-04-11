# API Reference — Auth Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4001/api/v1` (direct)

---

## POST /auth/login

Authenticate a user and receive JWT tokens.

**Auth**: Public
**Request Body**:
```json
{
  "email": "admin@claw.local",
  "password": "ClawAdmin123!"
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "clxyz123...",
  "user": {
    "id": "clxyz...",
    "email": "admin@claw.local",
    "username": "claw-admin",
    "role": "ADMIN",
    "status": "ACTIVE",
    "languagePreference": "EN",
    "appearancePreference": "SYSTEM"
  }
}
```

**Errors**:
- `401 INVALID_CREDENTIALS` — wrong email or password
- `403 ACCOUNT_SUSPENDED` — account is suspended
- `400 Validation failed` — missing/invalid fields

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}'
```

---

## POST /auth/refresh

Refresh an expired access token using a valid refresh token.

**Auth**: Public
**Request Body**:
```json
{
  "refreshToken": "clxyz123..."
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "clxyz456..."
}
```

**Errors**:
- `401 INVALID_REFRESH_TOKEN` — token expired or revoked

**Note**: Refresh tokens are rotated on each use. The old token is invalidated.

---

## POST /auth/logout

Invalidate all sessions for the current user.

**Auth**: Bearer token
**Request Body**: None
**Response**: `204 No Content`

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## GET /auth/me

Get the current authenticated user's profile.

**Auth**: Bearer token
**Response 200**:
```json
{
  "id": "clxyz...",
  "email": "admin@claw.local",
  "username": "claw-admin",
  "role": "ADMIN",
  "status": "ACTIVE",
  "mustChangePassword": false,
  "languagePreference": "EN",
  "appearancePreference": "SYSTEM",
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-01T00:00:00.000Z"
}
```

---

## POST /users

Create a new user account. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "newuser",
  "password": "SecurePass123!",
  "role": "OPERATOR"
}
```

**Response 201**: SafeUser object (no passwordHash)

**Errors**:
- `409 DUPLICATE_ENTITY` — email or username already exists
- `403 Forbidden` — not admin role

---

## GET /users

List all users with pagination. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `search` (string) — search by email or username
- `role` (enum) — filter by UserRole
- `status` (enum) — filter by UserStatus

**Response 200**:
```json
{
  "data": [{ "id": "...", "email": "...", "username": "...", "role": "VIEWER", ... }],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## GET /users/:id

Get a specific user. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Response 200**: SafeUser object
**Errors**: `404 ENTITY_NOT_FOUND`

---

## PATCH /users/:id

Update a user. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Request Body**: Partial user fields (email, username, status)
**Response 200**: Updated SafeUser

---

## DELETE /users/:id

Deactivate (suspend) a user. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Response 200**: Updated SafeUser with status SUSPENDED
**Errors**: Cannot deactivate yourself

---

## PATCH /users/:id/reactivate

Reactivate a suspended user. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Response 200**: Updated SafeUser with status ACTIVE

---

## PATCH /users/:id/role

Change a user's role. Admin only.

**Auth**: Bearer token (ADMIN role required)
**Request Body**:
```json
{ "role": "OPERATOR" }
```
**Response 200**: Updated SafeUser

---

## PATCH /users/me/preferences

Update the current user's preferences.

**Auth**: Bearer token
**Request Body**:
```json
{
  "languagePreference": "FR",
  "appearancePreference": "DARK"
}
```
**Response 200**: Updated SafeUser

---

## PATCH /users/me/password

Change the current user's password.

**Auth**: Bearer token
**Request Body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```
**Response**: `204 No Content`
