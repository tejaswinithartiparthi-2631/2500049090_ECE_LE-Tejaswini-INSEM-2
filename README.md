# Student Portal Authentication Project

A runnable Node.js + Express demo implementing registration, login, password hashing, JWT creation and verification, protected routes, and role-based authorization.

## Requirements
- Node.js 18 or later
- npm (included with Node.js)

## Run on Windows
1. Extract `student-portal-auth.zip`.
2. Open the extracted `student-portal-auth` folder.
3. In that folder, right-click an empty area and choose **Open in Terminal** (or open VS Code and choose Terminal → New Terminal).
4. Run:

   ```bash
   npm install
   ```

5. Create your local environment file:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`

6. Open `.env` and replace `JWT_SECRET` with a long random secret (at least 32 characters). Example for a college demo only:
   `JWT_SECRET=MyDemoSecret_ChangeThis_2026_AtLeast32Chars`
7. Start the server:

   ```bash
   npm start
   ```

8. Open your browser at **http://localhost:3000**.

## How to see the output
1. Under **Create account**, enter a name, email and password (minimum 8 characters), then click **Create account**.
2. You should see the dashboard and a successful registration message.
3. Click **View courses** or **View academic records**. The JSON response appears in the dark output area.
4. Click **Log out**, then log in using the same email and password.
5. Click **Test admin access**. A normal student gets HTTP 403 because the endpoint is admin-only. This demonstrates authorization.
6. To test token verification, log out and then try calling a protected API without a token using browser developer tools or an API client; it returns HTTP 401.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a student; password is bcrypt-hashed |
| POST | `/api/auth/login` | Verify credentials and issue JWT |
| GET | `/api/auth/me` | Verify token and return current user |
| GET | `/api/courses` | Protected course material |
| GET | `/api/records` | Protected academic records demo |
| GET | `/api/admin` | Admin-only example (403 for students) |

Protected endpoints require this HTTP header:

`Authorization: Bearer <JWT>`

## Authentication workflow
1. Registration validates input, normalizes email, checks duplicates, hashes the password using bcrypt (12 rounds), and stores only the hash.
2. Login finds the account and compares the submitted password against the stored hash using `bcrypt.compare`.
3. On success, the server signs a JWT containing the user ID (`sub`), email and role. The token has an expiry and issuer/audience claims.
4. The browser sends the JWT as a Bearer token when requesting protected APIs.
5. Middleware verifies signature, expiry, issuer and audience. Missing/invalid/expired tokens receive HTTP 401.
6. Role middleware checks permissions. A valid student token cannot access the admin endpoint and receives HTTP 403.

## Important security notes
- Passwords are **hashed**, not encrypted. Hashing is one-way and bcrypt is designed for password storage.
- This is an educational starter project. It uses a local JSON file as a simple data store and sessionStorage for a classroom demo.
- For production: use a real database with unique email constraints, HTTPS, rate limiting, email verification, password reset, audit logs, secure HttpOnly/SameSite cookies (or carefully managed short-lived tokens), refresh-token rotation/revocation, strict CORS/CSRF controls as appropriate, and server-side ownership checks for every academic record.
- Never commit `.env` or expose your JWT secret.
- Public registration always assigns the `student` role. Do not allow users to submit their own role.
- Demo academic records are static examples. A real app must query records scoped to the authenticated user's ID.
