# Frontend-Backend Connection Guide

This document explains how the frontend (Next.js) is connected to the backend (Express.js) server.

## Architecture

- **Frontend**: Next.js app running on `http://localhost:3000`
- **Backend**: Express.js API server running on `http://localhost:5000`

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory (same level as `package.json`) with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

If `NEXT_PUBLIC_API_URL` is not set, the frontend will default to `http://localhost:5000`.

**Note**: The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the client-side code.

## API Configuration

All API calls are centralized in `lib/api.ts`:

- **API_BASE_URL**: Base URL for all backend requests
- **apiRequest()**: Wrapper function that handles:
  - Adding credentials (cookies) for authentication
  - Setting proper headers
  - Handling FormData correctly

## Updated Files

The following frontend files have been updated to use the backend API:

1. `app/login/page.tsx` - Login API calls
2. `app/register/page.tsx` - Registration API calls
3. `app/dashboard/page.tsx` - Dashboard data fetching
4. `app/report/lost/page.tsx` - Lost report creation
5. `app/report/found/page.tsx` - Found report creation
6. `app/matches/page.tsx` - Matches and verification
7. `app/page.tsx` - Home page search and documents

## Running the Application

### 1. Start the Backend

```bash
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev
```

The backend will start on `http://localhost:5000`

### 2. Start the Frontend

```bash
# In the root directory
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

## API Endpoints

All endpoints are prefixed with `/api`:

- **Auth**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- **Reports**: `/api/reports/lost`, `/api/reports/found`
- **Matches**: `/api/matches/:matchId/verify`
- **Verification**: `/api/verify`
- **Search**: `/api/search?q=query`
- **Documents**: `/api/documents/latest`

## CORS Configuration

The backend is configured to accept requests from `http://localhost:3000` (or the value in `CORS_ORIGIN` environment variable).

## Authentication

Authentication uses HTTP-only cookies:
- Login sets a JWT token in an HTTP-only cookie
- All authenticated requests automatically include the cookie
- Logout clears the cookie

## Troubleshooting

### Backend not responding

1. Check if backend is running on port 5000
2. Verify CORS_ORIGIN in backend `.env` matches frontend URL
3. Check backend logs for errors

### CORS errors

1. Ensure `CORS_ORIGIN` in backend `.env` is set to `http://localhost:3000`
2. Check that credentials are included in requests (handled by `apiRequest()`)

### Authentication not working

1. Verify cookies are being sent (check browser DevTools > Application > Cookies)
2. Ensure `credentials: 'include'` is set (handled by `apiRequest()`)
3. Check JWT_SECRET is set in backend `.env`
