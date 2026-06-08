# Software Requirements Specification (SRS): Haqooq Platform

This document describes the platform-wide requirements for Haqooq, encompassing both the mobile client app (for clients and lawyers) and the web administration panel.

---

## 1. System Roles & Authentication
The platform utilizes Firebase Authentication to manage the following distinct user roles:
* **Client:** Standard authenticated user seeking legal assistance. Can post cases, search for lawyers, review bids, manage active cases, and chat in real-time.
* **Lawyer:** Professional user requiring verification. Can upload credentials, view open cases, submit proposals (bids) using credits, update case timelines, and chat with clients.
* **System Admin:** Administrative role that manages platform health, verifies lawyer credentials, monitors disputes, and processes manual payment requests.
* *Note on Guest User:* While defined in database type definitions, the mobile app requires authentication to view screens; a standalone unauthenticated guest browsing mode is not active in the current navigation path.

### Authentication Features
* **Credentials Sign-In & Registration:** Standard email and password authentication.
* **Strong Password Policy:** Registration enforces a robust password policy requiring at least 8 characters, at least one uppercase letter, one lowercase letter, and one numeric character.
* **Social Authentication:** Native Google Sign-In integration for both login and registration flows.
* **Forgot Password:** Automated email reset flow.
* **Location & Specialization Onboarding:** During registration, lawyers must declare their operational city (Lahore, Karachi, Islamabad, or Rawalpindi) and primary legal category.

---

## 2. Lawyer Onboarding & Verification Queue
* **Credential Submission:** Lawyers whose accounts are pending approval are directed to a document upload screen where they must select and upload a verification document (PDF or image) to Firebase Cloud Storage (saved under the `credentials/` path). This updates the `credentialUrl` on their profile.
* **Verification Queue:** System Admins (via the Mobile Admin Screen or the Web Admin Panel) review pending verification requests, inspect the uploaded credentials, and approve the lawyer (updating their status to `verified` and unlocking the marketplace).

---

## 3. Client-Side Features
* **Profile Management:**
    * Update personal details (Full Name, Phone Number).
    * Custom avatar upload (images uploaded to Firebase Storage under `avatars/` path).
* **AI Case Classification:** 
    * Clients describe their legal problem in plain English.
    * The client-side application analyzes the text using the Groq LLaMA 3.3 API model (with a local regex-based NLP parsing fallback if the API key is not configured) to categorize the case into one of the core specialties (Property / Real Estate Law, Family Law, Corporate Law, Criminal Law, Civil Litigation).
* **Case Marketplace (Posting):** 
    * Post categorized legal cases to the marketplace with a title, description, category, and an optional budget limit in PKR.
* **Case Management & Proposals:** 
    * Review incoming bidding proposals/proposals from lawyers.
    * Accept a lawyer's proposal using an atomic Firestore transaction that:
        1. Updates the accepted proposal status to `accepted` and rejects all competing proposals.
        2. Assigns the lawyer to the case and shifts case status to `active`.
        3. Appends a "Lawyer Assigned" timeline event.
        4. Initializes a dedicated real-time chat thread.
        5. Triggers a background push notification to notify the lawyer.
    * View active cases, follow a dynamic chronological timeline of case status events, and mark active cases as closed/resolved.

---

## 4. Lawyer-Side Features
* **Case Feed (Marketplace):** 
    * Browse a real-time list of open client cases in the marketplace.
    * View case details, including client information, posting date, description, and budget.
* **Proposal Submission (Bidding):** 
    * Submit bids on open cases containing a proposed fee (PKR) and a custom message.
    * Submitting a proposal requires and deducts **1 bidding credit**.
    * Client-side duplicate checks prevent submitting multiple bids on a single case.
* **Trust & Safety Reporting:** 
    * Lawyers can report suspicious or inappropriate cases from the feed.
    * Reports are categorized (Scam/Fraud, Spam, Harassment, Inappropriate Content, Other) and logged in the Firestore `reports` collection for admin review.
* **Client Management Dashboard:** 
    * Centralized list showing active client cases and closed cases.
    * Pushes progress updates and custom timeline milestones (e.g., Court hearing scheduled, Case closed) directly to Firestore, which alerts the client.

---

## 5. Advanced Lawyer Search
* **Search Filters:** Clients can filter verified lawyers by text queries (matching display names or specialties), specific city, and law categories.
* **Firestore Search Optimization:** Utilizes direct querying for verified lawyers combined with client-side filtering to bypass Firestore compound indexing constraints.
* **Ranking Logic:** Premium/featured lawyers are ranked first in results, followed by average rating performance.
* **Direct Interaction:** Start a direct chat message thread immediately from search cards.

---

## 6. Monetization & Manual P2P Payment Verification
To support monetization, the application implements a manual Peer-to-Peer (P2P) payment verification flow:
* **Credit Packs:** Lawyers purchase credits to place marketplace bids:
    * *Starter Pack:* 10 Credits for PKR 250 (12-month validity).
    * *Professional Pack:* 50 Credits for PKR 1,000 (Lifetime validity, featured search placement).
    * *Elite Pack:* 100 Credits for PKR 1,800 (Lifetime validity, highlighted profile, dedicated support).
* **Interactive Easypaisa P2P Checkout:** 
    * Displays instructions to transfer the package amount via Easypaisa to the designated account title (Mujahid Afridi) and number (03139330041).
    * Forms capture transaction proof: Sender Account Title, Sender Easypaisa Number, Transaction ID / Reference Number, Transaction Date & Time, and an optional image upload of the payment receipt (stored in Firebase Storage under `receipts/`).
    * Real-time duplicate validation checks against Firestore to reject pre-existing Transaction IDs.
    * Submissions enter a `pending` state in the `credit_purchases` collection.
* **Transaction History Logs:** A real-time listener updates lawyers on their transaction approval status (`pending`, `approved`, or `rejected` with custom admin-provided rejection reasons).

---

## 7. Web Administration Panel
The Admin Panel is a web-based application (Next.js) for platform administrators to manage users, transactions, and to perform platform oversight.
* **Authentication & Roles:** Admins authenticate via Firebase Authentication and are authorized using server-side checks (`firebase-admin`). Admin roles are validated by checking that the user's document in the `users` collection has `role: "admin"`.
* **User & Lawyer Management:** Search, view, and update (suspend/activate) user accounts and lawyer statuses.
* **Credit Purchase Approvals:** Review pending `credit_purchases` requests and submitted Easypaisa payment receipts.
    * On approval, the admin triggers a server-side API (Next.js route) that atomically increments the lawyer's `credits` balance, records a completed ledger entry in `transactions`, and sets the purchase status to `approved`.
    * On rejection, the admin provides a custom rejection reason, which updates the status to `rejected` and alerts the lawyer.
* **Surveillance and Chat Moderation:** View active chat threads and messages across the platform in read-only mode for moderation, dispute resolution, and trust & safety review.
* **Audit Logging:** Implements an immutable system ledger for administrative oversight. Actions such as credit approvals, rejections, user suspensions, and role changes generate entries in the `audit_logs` collection.

---

## 8. Non-Functional & Infrastructure Requirements
* **Security & Database Rules:** Firestore security rules strictly isolate user data. Clients can only access their own cases and chat threads. Write permissions on financial transactions (`transactions`) and direct balance increments (`credits`) are blocked client-side; they must be triggered via secure server-side routes using `firebase-admin` credentials.
* **Cross-Platform UI:** Mobile application built with React Native (Expo) to ensure a consistent look, feel, and performance across iOS and Android.
* **Error Tracking:** Configured using the Sentry SDK to monitor exceptions and track runtime application crashes.
* **Expo Notifications:** Device tokens (`expoPushToken`) are registered on sign-in/registration and updated dynamically to support live push alerts for bids, chats, and timeline adjustments.
* **TanStack Query:** Caching layer for efficient searching, minimizing duplicate database reads.
* **Zod Schemas:** Enforces schema structure validation at runtime on incoming search filters, user documents, and profile payloads.

---
_Document last updated: June 6, 2026 — aligned requirements with actual mobile and web implementation details._