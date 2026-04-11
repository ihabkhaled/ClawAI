# Service Guide: claw-auth-service

## Overview

| Property       | Value                            |
| -------------- | -------------------------------- |
| Port           | 4001                             |
| Database       | PostgreSQL (`claw_auth`)         |
| ORM            | Prisma 5.20                      |
| Env prefix     | `AUTH_`                          |
| Nginx route    | `/api/v1/auth/*`, `/api/v1/users/*` |

The auth service handles user registration, login, JWT issuance, refresh token rotation, session management, and RBAC. It is the only service that stores user credentials.

## Database Schema

### User

| Column               | Type                     | Notes                           |
| -------------------- | ------------------------ | ------------------------------- |
| id                   | String (CUID)            | Primary key                     |
| email                | String                   | Unique, indexed                 |
| username             | String                   | Unique                          |
| passwordHash         | String                   | Argon2 hash                     |
| role                 | UserRole enum            | ADMIN, OPERATOR, VIEWER         |
| status               | UserStatus enum          | ACTIVE, SUSPENDED, PENDING      |
| mustChangePassword   | Boolean                  | Forces password change on login |
| languagePreference   | UserLanguagePreference   | EN, AR, FR, IT, DE, ES, RU, PT  |
| appearancePreference | UserAppearancePreference | SYSTEM, LIGHT, DARK             |
| createdAt            | DateTime                 | Auto-set                        |
| updatedAt            | DateTime                 | Auto-updated                    |

### Session

| Column       | Type     | Notes                        |
| ------------ | -------- | ---------------------------- |
| id           | String   | Primary key                  |
| userId       | String   | FK to User, cascading delete |
| refreshToken | String   | Unique, hashed               |
| expiresAt    | DateTime | Token expiration             |
| createdAt    | DateTime | Auto-set                     |

### SystemSetting

Key-value store for runtime configuration (e.g., maintenance mode, feature flags).

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path       | Auth     | Description                |
| ------ | ---------- | -------- | -------------------------- |
| POST   | /login     | Public   | Email + password login     |
| POST   | /refresh   | Public   | Refresh token rotation     |
| POST   | /logout    | Bearer   | Invalidate session         |
| GET    | /me        | Bearer   | Current user profile       |
| PATCH  | /me        | Bearer   | Update own profile/prefs   |
| PATCH  | /me/password | Bearer | Change own password        |

### Users (`/api/v1/users`)

| Method | Path       | Auth          | Description              |
| ------ | ---------- | ------------- | ------------------------ |
| GET    | /          | ADMIN         | List users (paginated)   |
| GET    | /:id       | ADMIN         | Get user by ID           |
| POST   | /          | ADMIN         | Create new user          |
| PATCH  | /:id       | ADMIN         | Update user (role, status)|
| DELETE | /:id       | ADMIN         | Deactivate user          |

## JWT Flow

1. User POSTs email + password to `/auth/login`
2. Service verifies credentials with argon2
3. Issues access token (short-lived, configured via `JWT_ACCESS_EXPIRY`) and refresh token (long-lived, `JWT_REFRESH_EXPIRY`)
4. Refresh token is stored as a Session record in the database
5. On `/auth/refresh`, the old session is deleted and a new one created (rotation)
6. On `/auth/logout`, the session record is deleted, invalidating the refresh token

## JWT Payload

```typescript
type JwtPayload = {
  sub: string;      // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};
```

## Events Published

| Event             | Trigger            | Consumers |
| ----------------- | ------------------ | --------- |
| user.login        | Successful login   | audit     |
| user.logout       | Logout             | audit     |
| user.created      | Admin creates user | audit     |
| user.role_changed | Admin changes role | audit     |
| user.deactivated  | Admin deactivates  | audit     |

## Key Dependencies

- `argon2` -- password hashing
- `@nestjs/jwt` -- JWT signing and verification
- `ioredis` -- session cache (optional, for token blacklisting)
- `jsonwebtoken` -- low-level JWT operations

## Security Considerations

- Passwords are never logged (pino redaction configured for `password`, `passwordHash`, `refreshToken`)
- Refresh tokens are rotated on every use to prevent replay attacks
- Failed login attempts should be rate-limited via `@nestjs/throttler` (100 req/min default)
- The admin seed user is created on first startup via `prisma/seed.ts`

## Module Structure

```
src/
  modules/
    auth/
      controllers/auth.controller.ts
      services/auth.service.ts
      auth.module.ts
    users/
      controllers/users.controller.ts
      services/users.service.ts
      users.module.ts
    health/
      controllers/health.controller.ts
      services/health.service.ts
      health.module.ts
```
