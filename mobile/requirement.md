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

    * [cite_start]Purchasing Bidding credits[cite: 105].
    * [cite_start]Platform extracting a Commission per client acquired[cite: 106].

## 5. Non-Functional & Architectural Requirements
* **Security:** Firestore Security Rules must strictly isolate user data so clients can only read their own case details and chat logs.
* **Cross-Platform UI:** Built with React Native to ensure a consistent look, feel, and performance across iOS and Android.
* [cite_start]**Scalable Searching:** Implementation of third-party indexing synced with Firestore to efficiently handle the "Rank on keywords" feature[cite: 80].
