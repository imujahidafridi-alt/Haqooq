# Haqooq Web Admin Panel

This is the enterprise admin portal for the Haqooq legal-tech platform.

## Features
- Role-based admin access
- Firestore-backed user, case, report, transaction, notification, and audit access
- Business intelligence dashboard with legal operations metrics
- Transparent complaint and report workflows
- Secure production-ready Next.js API route layer using Firebase Admin
- Tailwind CSS UI with responsive sidebar navigation

## Local setup
1. Copy `.env.local.example` to `.env.local`
2. Populate your Firebase client config and `FIREBASE_SERVICE_ACCOUNT`
3. Install dependencies:
   ```bash
   cd web
   npm install
   ```
4. Run locally:
   ```bash
   npm run dev
   ```

## Deployment
Deploy to Vercel with standard Next.js settings. Ensure environment variables are configured for both client and server.

## Architecture
- `app/` contains page routes and authentication flow
- `app/api/` contains server-side route handlers using Firebase Admin
- `components/` contains reusable layout and UI primitives
- `lib/` contains Firebase client and admin SDK helpers
- `types/` contains shared domain models aligned with the mobile app

## Notes
- Admin users are validated against the `users` collection role in Firestore
- For full production, `FIREBASE_SERVICE_ACCOUNT` should be stored in Vercel secrets, not committed to source control
- Analytics and audit paths are designed to support enterprise transparency and compliance
