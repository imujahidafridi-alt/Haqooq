# Software Requirements Specification (SRS): LegalEase

## 1. System Roles & Authentication
The system will utilize Firebase Authentication to manage the following distinct user roles:
* [cite_start]**Guest User:** Can access the Welcome Screen and view limited generic platform data[cite: 114, 118].
* [cite_start]**Client:** Standard authenticated user seeking legal assistance[cite: 2].
* [cite_start]**Lawyer:** Professional user requiring a two-step verification process (registration followed by credential approval)[cite: 50, 54].
* **System Admin (Added Requirement):** A necessary backend role to verify uploaded lawyer credentials, handle disputes, and monitor platform health.

## 2. Client Side Features
* [cite_start]**Profile Management:** Standard CRUD operations for user details including registration, login, logout, and profile updates[cite: 5, 6, 7].
* **AI Legal Assistance:**
    * [cite_start]Users input a natural language description of their legal issue[cite: 9, 127].
    * [cite_start]A Cloud Function securely passes the query to the AI engine to detect the case category (e.g., Property / Civil dispute)[cite: 10, 96, 97].
    * [cite_start]The system returns recommended lawyers matching the detected category[cite: 12, 98, 99].
* **Advanced Lawyer Search:**
    * [cite_start]Manual search integrated with a third-party indexing service (like Algolia) to bypass Firebase's NoSQL search limitations[cite: 14].
    * [cite_start]Filters include: City, Law Category, and Experience level[cite: 15, 16, 17, 18].
* **Case Marketplace (Posting):**
    * [cite_start]Clients can post cases including a title, detailed description, category, and an optional budget constraint[cite: 27, 28, 29, 30, 31, 32].
    * [cite_start]Clients review incoming lawyer proposals (bids) and can accept a preferred lawyer[cite: 35, 36, 170].
* **Case Tracking & Real-Time Messaging:**
    * [cite_start]Firebase Realtime Database/Firestore handles live chat messaging between the client and assigned lawyer[cite: 37, 38].
    * [cite_start]Clients view a dynamic timeline of case status updates (e.g., Case filed, Hearing completed, Next hearing date)[cite: 39, 40, 42, 43, 46, 47, 48].

## 3. Lawyer Side Features
* **Professional Onboarding:**
    * [cite_start]Lawyers create profiles detailing specialization and experience[cite: 51, 52, 53].
    * [cite_start]Must securely upload credential documents to Firebase Cloud Storage for verification[cite: 54].
* **Client Acquisition & Bidding System:**
    * [cite_start]Lawyers receive AI-matched client leads or discover available cases posted by clients in the marketplace[cite: 57, 59, 189].
    * [cite_start]Lawyers submit proposals containing a proposed fee and a custom message to the client[cite: 63, 64, 65].
* **Client Management Dashboard:**
    * [cite_start]A centralized hub showing active clients, active cases, and new case requests[cite: 67, 68, 69, 183].
    * [cite_start]Lawyers can push progress updates (e.g., Next hearing date, Case closed) which trigger push notifications to the client's device[cite: 71, 72, 75, 76, 77].

## 4. Monetization & Dummy Payment Interface
To future-proof the application, all financial transactions will be routed through an abstract `PaymentService` class, designed for seamless future integration with production gateways like Stripe or Easypaisa.
* **Dummy Mode (Current State):** The interface will process mock transactions using test cards, simulating successful or failed network responses without processing real money. 
* **Monetization Triggers:** The dummy service will mock transactions for the following lawyer actions:
    * [cite_start]Purchasing a Premium profile or Featured listing[cite: 101, 102, 104].
    * [cite_start]Paying for Keyword ranking boosts[cite: 103].
    * [cite_start]Purchasing Bidding credits[cite: 105].
    * [cite_start]Platform extracting a Commission per client acquired[cite: 106].

## 5. Non-Functional & Architectural Requirements
* **Security:** Firestore Security Rules must strictly isolate user data so clients can only read their own case details and chat logs.
* **Cross-Platform UI:** Built with React Native to ensure a consistent look, feel, and performance across iOS and Android.
* [cite_start]**Scalable Searching:** Implementation of third-party indexing synced with Firestore to efficiently handle the "Rank on keywords" feature[cite: 80].

## 6. Admin Panel (New)
The Admin Panel is a web-based application (Next.js) for platform administrators to manage users, transactions, and to perform oversight.

- **Authentication & Roles:** Admins authenticate via Firebase Authentication and are authorized using server-side checks (firebase-admin). Admin role documents are stored in the `users` collection with `role: "admin"`.
- **Key Capabilities:**
    - User management: search, view, edit (suspend/activate) users and lawyers.
    - Surveillance: view chat threads and messages across the platform for moderation and dispute resolution.
    - Credit purchase approvals: review submitted payment proofs (Easypaisa receipts), approve/reject requests, and trigger server-side credit assignment.
    - Transaction and audit logs: view all transactions, credit assignments, admin actions, and export logs for compliance.
    - Notifications: send platform notifications to individual users or broadcast messages.

## 7. Credits, Payments & Easypaisa (Latest Feature)
This release adds a credits-based purchase system and a manual Easypaisa integration suitable for regions where direct gateway integration is not yet available.

- **Client Flow (Mobile - Lawyer):**
    - Lawyer selects a credit package in the app (`ProServicesScreen`).
    - Lawyer submits Easypaisa payment by uploading a receipt screenshot via the `EasypaisaCheckoutModal`.
    - A `credit_purchases` document is created in Firestore with status `pending` and the uploaded receipt stored in Firebase Storage.

- **Admin Flow (Web - Admin Panel):**
    - Admin reviews pending `credit_purchases` in the Admin Panel `Credits` page.
    - On approval, an authenticated server-side API (using `firebase-admin`) increments the user's `credits` field atomically, creates a `transactions` ledger entry, and sets the purchase `status` to `approved`.
    - The admin may reject a purchase, providing a reason; the document is updated with `status: rejected` and a notification is sent to the user.

- **Technical Notes:**
    - All credit assignment and transaction ledger updates are performed by secure server-side code (Next.js API routes calling `firebase-admin` or Cloud Functions). Client-side trust is avoided for monetary operations.
    - The `PaymentService` abstraction remains for future gateway integrations; current Easypaisa flow is manual proof-based.

## 8. Surveillance, Moderation & Notifications
- **Surveillance UI:** Admins can open a chat thread and read messages in read-only mode for monitoring or investigations. API endpoints exist to fetch chat lists and chat messages using admin credentials.
- **Moderation Actions:** Admins can flag messages, create evidence entries, and initiate account reviews.
- **Notifications:** The platform supports system notifications delivered via Firebase Cloud Messaging. Admin-triggered notifications create documents in `notifications` and may be pushed to devices.

## 9. Deployment, Environment & Security
- **Environment sync:** The web `.env.local` holds `NEXT_PUBLIC_FIREBASE_*` keys and a `FIREBASE_SERVICE_ACCOUNT` (JSON) used by server-side admin APIs. Service account JSON should not be committed to the repository in production — store securely in the host (Vercel, Netlify, or CI) environment variables.
- **Server-side checks:** All admin-only APIs validate the caller's admin status using `firebase-admin` and Firestore user role fields.
- **Firestore Rules:** Continue to enforce that client-side code cannot increment `credits` or write `transactions` directly. Any write that affects user balance must be performed by a server-side admin API or Cloud Function.
- **Audit Logging:** All admin approvals, rejections, and credit assignments must create an immutable `audit_logs` entry with timestamp, admin uid, action, and affected document id.

## 10. Test Cases & Validation (Updated)
- E2E test for credits purchase flow:
    1. Lawyer uploads receipt and creates `credit_purchases` with `pending` status.
    2. Admin approves via Admin Panel API; user's `credits` incremented; `transactions` and `audit_logs` entries created; notification generated.
    3. Rejection path: Admin rejects; `credit_purchases.status` becomes `rejected` with an admin reason; notification generated.

## 11. Miscellaneous Updates
- **Currency:** All UI currency displays are standardized to PKR across web and mobile (Intl.NumberFormat('en-PK', { currency: 'PKR' })).
- **Created Admin Account (dev):** An initial admin user `admin@haqooq.com` was created for testing and platform bootstrapping — remove or rotate credentials before production deployment.
- **APIs added:** `/api/chats`, `/api/chats/[chatId]`, `/api/credit_requests` (admin), and other administration endpoints implemented server-side.

---
_Document last updated: May 22, 2026 — includes admin panel, surveillance, credits & Easypaisa manual flow, notifications, and deployment/security guidance._