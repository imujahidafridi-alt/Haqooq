# Haqooq Platform - Technical Diagrams (Mermaid Specifications)

This file contains the raw Mermaid specifications for the Haqooq platform architecture, use cases, databases, and processes.

---

## 1. DATA FLOW DIAGRAM (DFD - LEVEL 1)

```mermaid
graph TD
    Client["Client (Mobile App)"]
    Lawyer["Lawyer (Mobile App)"]
    Admin["Administrator (Web Panel / Mobile Screen)"]
    Auth["Firebase Authentication (Role Validation)"]
    Firestore[("Cloud Firestore (NoSQL Document Store)")]
    Storage[("Firebase Cloud Storage (Object Bucket)")]

    %% Client Interactions
    Client -->|1. Sign in / Auth Token| Auth
    Client -->|2. Register / Update Profile Details| Firestore
    Client -->|3. Upload Avatar Image| Storage
    Client -->|4. Input Case Description (AI analysis)| Firestore
    Client -->|5. Accept Proposal (Escrow Lock Batch)| Firestore
    Client -->|6. Send Direct Messaging Data| Firestore

    %% Lawyer Interactions
    Lawyer -->|1. Sign in / Auth Token| Auth
    Lawyer -->|2. Register Specialization Details| Firestore
    Lawyer -->|3. Upload Identity / License Verification Docs| Storage
    Lawyer -->|4. Submit Bid Proposal (Deduct Credit)| Firestore
    Lawyer -->|5. Upload Easypaisa Receipt Screenshot| Storage
    Lawyer -->|6. Submit Credit Request (Pending state)| Firestore
    Lawyer -->|7. Update Case Timeline Progress Logs| Firestore

    %% Admin Interactions
    Admin -->|1. Sign in / Admin Verification check| Auth
    Admin -->|2. Fetch pending credentials & payment proofs| Firestore
    Admin -->|3. Approve / Reject lawyer verification docs| Firestore
    Admin -->|4. Approve / Reject credit requests (Web API check)| Firestore
    Admin -->|5. Read surveillance logs (Read-only chat spy)| Firestore
    Admin -->|6. Monitor compliance Audit Logs| Firestore
```

---

## 2. USE CASE DIAGRAM

```mermaid
graph LR
    subgraph "Actors"
        C["Client"]
        L["Lawyer"]
        A["Administrator"]
    end

    subgraph "System Boundary: Haqooq Platform"
        UC1("Post Legal Case")
        UC2("AI Case Classification")
        UC3("Search & Filter Lawyers")
        UC4("Review Proposals & Hire")
        UC5("Real-Time Messaging")
        UC6("Submit Bid / Proposal")
        UC7("Update Case Status Timeline")
        UC8("Buy Bidding Credits (P2P Easypaisa)")
        UC9("Report Suspicious Feed Post")
        UC10("Verify Lawyer Accounts")
        UC11("Approve Credit Top-Ups")
        UC12("Surveillance & Chat Moderation")
        UC13("Immutable System Audit Trail")
    end

    %% Client mappings
    C --- UC1
    C --- UC2
    C --- UC3
    C --- UC4
    C --- UC5

    %% Lawyer mappings
    L --- UC5
    L --- UC6
    L --- UC7
    L --- UC8
    L --- UC9

    %% Admin mappings
    A --- UC10
    A --- UC11
    A --- UC12
    A --- UC13
```

---

## 3. ENTITY RELATIONSHIP (ER) DIAGRAM

```mermaid
erDiagram
    USERS {
        string id PK
        string email
        string displayName
        string role "client | lawyer | admin"
        string status "pending | verified | rejected"
        string phone
        string city
        int experienceYears
        string photoURL
        string credentialUrl
        int credits
    }
    CASES {
        string id PK
        string clientId FK
        string clientName
        string assignedLawyerId FK
        string title
        string description
        string category
        float budget
        string status "open | active | closed"
        array timeline
        int createdAt
    }
    PROPOSALS {
        string id PK
        string caseId FK
        string lawyerId FK
        float bidAmount
        string message
        string status "pending | accepted | rejected"
        int createdAt
    }
    CHATS {
        string id PK
        string caseId FK
        array participants
        string lastMessage
        int updatedAt
    }
    MESSAGES {
        string id PK
        string chatId FK
        string senderId FK
        string text
        int createdAt
    }
    CREDIT_PURCHASES {
        string id PK
        string lawyerId FK
        string planName
        int credits
        float amount
        string senderTitle
        string senderNumber
        string transactionId
        string status "pending | approved | rejected"
        string proofUrl
        string rejectionReason
        string createdAt
        string processedAt
    }
    REPORTS {
        string id PK
        string caseId FK
        string reporterId FK
        string category "scam | spam | harassment | inappropriate | other"
        string reason
        string status "pending | reviewed | resolved"
        string createdAt
    }
    AUDIT_LOGS {
        string id PK
        string adminId FK
        string action
        string targetId
        string details
        int timestamp
    }

    USERS ||--o{ CASES : "posts"
    USERS ||--o{ PROPOSALS : "submits"
    USERS ||--o{ CREDIT_PURCHASES : "initiates"
    USERS ||--o{ REPORTS : "files"
    CASES ||--o{ PROPOSALS : "receives"
    CASES ||--o| CHATS : "initiates"
    CHATS ||--o{ MESSAGES : "contains"
```

---

## 4. DATABASE DESIGN (NOSQL COLLECTION SCHEMAS)

### Firestore NoSQL Database Schema Diagram

```mermaid
erDiagram
    users {
        string id PK "Document ID (Auth UID)"
        string email "Required"
        string displayName "Required"
        string role "client | lawyer | admin"
        string status "pending | verified | rejected"
        string phone "Optional"
        string city "Optional (Lawyers)"
        array specialization "Optional (Lawyers)"
        number experienceYears "Optional (Lawyers)"
        string photoURL "Optional (Avatar URL)"
        string credentialUrl "Optional (License URL)"
        number credits "Optional (Lawyer Credits)"
    }
    
    cases {
        string id PK "Document ID"
        string clientId FK "users.id"
        string clientName "Cached client name"
        string assignedLawyerId FK "users.id (Nullable)"
        string title "Required"
        string description "Required"
        string category "Required"
        number budget "Optional (PKR)"
        string status "open | active | closed"
        array timeline "Array of milestone Maps"
        number createdAt "Timestamp"
    }

    proposals {
        string id PK "Document ID"
        string caseId FK "cases.id"
        string lawyerId FK "users.id"
        number bidAmount "Required (PKR)"
        string message "Required"
        string status "pending | accepted | rejected"
        number createdAt "Timestamp"
    }

    chats {
        string id PK "Document ID"
        string caseId FK "cases.id"
        array participants "Array of User UIDs"
        string lastMessage "Last sent text snippet"
        number updatedAt "Timestamp"
    }

    messages {
        string id PK "Document ID"
        string chatId FK "chats.id"
        string senderId FK "users.id"
        string text "Message content text"
        number createdAt "Timestamp"
    }

    credit_purchases {
        string id PK "Document ID"
        string lawyerId FK "users.id"
        string planName "Starter | Professional | Elite"
        number credits "Credits granted"
        number amount "Paid amount in PKR"
        string senderTitle "Easypaisa Account Title"
        string senderNumber "Easypaisa Account Number"
        string transactionId "Unique transaction TxID"
        string status "pending | approved | rejected"
        string proofUrl "Storage screenshot URL"
        string rejectionReason "Optional admin message"
        string createdAt "ISO Date String"
        string processedAt "ISO Date String (Nullable)"
    }

    reports {
        string id PK "Document ID"
        string caseId FK "cases.id"
        string reporterId FK "users.id"
        string category "scam | spam | harassment | inappropriate | other"
        string reason "Explanation of report"
        string status "pending | reviewed | resolved"
        number createdAt "Timestamp"
    }

    audit_logs {
        string id PK "Document ID"
        string adminId FK "users.id"
        string action "Admin activity tag"
        string targetId "ID of updated record"
        string details "Additional context details"
        number timestamp "Timestamp"
    }

    users ||--o{ cases : "posts"
    users ||--o{ proposals : "submits"
    users ||--o{ credit_purchases : "initiates"
    users ||--o{ reports : "files"
    users ||--o{ messages : "sends"
    cases ||--o{ proposals : "receives"
    cases ||--o| chats : "initiates"
    chats ||--o{ messages : "contains (Subcollection)"
    cases ||--o{ reports : "reported"
```

### Document Schema Specifications

#### 1. Collection: `users`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique user ID (Auth UID) |
| `email` | `string` | Account email address |
| `displayName` | `string` | Full name of the user |
| `role` | `string` | `client` \| `lawyer` \| `admin` |
| `status` | `string` | `pending` \| `verified` \| `rejected` |
| `phone` | `string` | Contact number |
| `city` | `string` | Operational city (Lawyers only) |
| `specialization` | `array [string]` | Legal domains (Lawyers only) |
| `experienceYears` | `number` | Experience years (Lawyers only) |
| `photoURL` | `string` | Avatar image link in Storage |
| `credentialUrl` | `string` | License proof PDF link in Storage |
| `credits` | `number` | Bidding credits (Lawyers only) |

#### 2. Collection: `cases`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique case ID |
| `clientId` | `string` | Client user ID (`users.id`) |
| `clientName` | `string` | Cached client display name |
| `assignedLawyerId`| `string` \| `null` | Assigned lawyer ID (`users.id`) |
| `title` | `string` | Headline of legal issue |
| `description` | `string` | Detailed case description |
| `category` | `string` | Matched legal domain |
| `budget` | `number` | Optional case budget (PKR) |
| `status` | `string` | `open` \| `active` \| `closed` |
| `timeline` | `array [map]` | Case milestones with description & date |
| `createdAt` | `number` | Timestamp of post |

#### 3. Collection: `proposals`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique proposal ID |
| `caseId` | `string` | Reference case ID (`cases.id`) |
| `lawyerId` | `string` | Reference lawyer ID (`users.id`) |
| `bidAmount` | `number` | Quoted fee in PKR |
| `message` | `string` | Proposal pitch description |
| `status` | `string` | `pending` \| `accepted` \| `rejected` |
| `createdAt` | `number` | Timestamp of submission |

#### 4. Collection: `chats`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique chat ID |
| `caseId` | `string` | Reference case ID (`cases.id`) |
| `participants` | `array [string]` | UIDs of participating client and lawyer |
| `lastMessage` | `string` | Text content of the last sent message |
| `updatedAt` | `number` | Unix timestamp of the last message update |

#### 5. Subcollection: `chats/{chatId}/messages`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique message ID |
| `chatId` | `string` | Reference chat ID (`chats.id`) |
| `senderId` | `string` | UID of message sender (`users.id`) |
| `text` | `string` | Text content of the message |
| `createdAt` | `number` | Unix timestamp of submission |

#### 6. Collection: `credit_purchases`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique purchase request ID |
| `lawyerId` | `string` | Reference lawyer ID (`users.id`) |
| `planName` | `string` | Name of credit plan (`Starter` \| `Professional` \| `Elite`) |
| `credits` | `number` | Number of credits awarded |
| `amount` | `number` | Total cost in PKR |
| `senderTitle` | `string` | Sender's Easypaisa account title |
| `senderNumber` | `string` | Sender's Easypaisa account phone number |
| `transactionId` | `string` | Unique external transaction reference ID |
| `status` | `string` | Approval state: `pending` \| `approved` \| `rejected` |
| `proofUrl` | `string` | URL link to receipt screenshot in Storage |
| `rejectionReason`| `string` \| `null` | Optional reason provided by Admin on rejection |
| `createdAt` | `string` | ISO Date/Time of creation |
| `processedAt` | `string` \| `null` | ISO Date/Time of admin action |

#### 7. Collection: `reports`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique report ID |
| `caseId` | `string` | Target reported case ID (`cases.id`) |
| `reporterId` | `string` | UID of reporting user (`users.id`) |
| `category` | `string` | Type: `scam` \| `spam` \| `harassment` \| `inappropriate` \| `other` |
| `reason` | `string` | Detailed statement for the report |
| `status` | `string` | Moderation state: `pending` \| `reviewed` \| `resolved` |
| `createdAt` | `number` | Unix timestamp of report submission |

#### 8. Collection: `audit_logs`
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique audit log ID |
| `adminId` | `string` | UID of performing admin (`users.id`) |
| `action` | `string` | Description of administrative action |
| `targetId` | `string` | ID of the target resource (e.g. lawyer UID, transaction ID) |
| `details` | `string` | Human-readable action details |
| `timestamp` | `number` | Unix timestamp of action |

---

## 5. SEQUENCE DIAGRAM: PROPOSAL ACCEPTANCE FLOW

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant App as Client Mobile App
    participant FS as Cloud Firestore
    participant Function as Cloud Notification Trigger
    actor Lawyer

    Client->>App: Click "Accept Proposal"
    activate App
    App->>App: Build Atomic Write Batch
    App->>FS: Send Batch Operations
    activate FS
    Note over FS: 1. Update proposal.status = 'accepted'
    Note over FS: 2. Update all other case proposals.status = 'rejected'
    Note over FS: 3. Set cases.assignedLawyerId = lawyerId & cases.status = 'active'
    Note over FS: 4. Add "Lawyer Assigned" entry to cases.timeline array
    Note over FS: 5. Create new 'chats' thread document [Client, Lawyer]
    FS->>FS: Commit transaction atomically
    FS-->>App: Batch Success Confirm
    deactivate FS
    App->>FS: Add push alert trigger to 'notifications' collection
    FS->>Function: Firestore Document Trigger
    activate Function
    Function-->>Lawyer: Send Push Alert ("Proposal Accepted! Tap to chat")
    deactivate Function
    App-->>Client: Navigation route to active chat thread
    deactivate App
```

---

## 6. SEQUENCE DIAGRAM: MANUAL PAYMENT VERIFICATION FLOW

```mermaid
sequenceDiagram
    autonumber
    actor Lawyer
    participant App as Lawyer Mobile App
    participant Storage as Cloud Storage
    participant FS as Cloud Firestore
    actor Admin
    participant Web as Admin Web Panel
    participant API as Next.js serverless API

    Lawyer->>App: Select Credit Package (Starter / Pro / Elite)
    App-->>Lawyer: Display Easypaisa instructions (Mujahid Afridi, 03139330041)
    Note over Lawyer: Lawyer completes external cash transfer via Easypaisa app
    Lawyer->>App: Input Tx ID, sender details, & attach receipt screenshot
    activate App
    App->>Storage: Upload receipt proof image to /receipts/ path
    Storage-->>App: Return receipt public URL
    App->>FS: Add 'credit_purchases' document (status: 'pending', proofUrl: url)
    deactivate App

    Note over Admin, Web: Admin checks pending queues
    Admin->>Web: Navigate to Credits requests tab
    activate Web
    Web->>FS: Query 'credit_purchases' where status == 'pending'
    FS-->>Web: Return list + document contents
    Web-->>Admin: Render audit dashboard + receipt images
    Admin->>Web: Click "Approve Request"
    Web->>API: POST /api/credit_requests (Payload: requestId, action: 'approve')
    deactivate Web
    activate API
    API->>API: Verify caller has valid "admin" token role (firebase-admin)
    API->>FS: Execute Firestore Database Transaction:
    Note over FS: 1. Increment lawyer user.credits balance
    Note over FS: 2. Record ledger document in 'transactions'
    Note over FS: 3. Update 'credit_purchases' status = 'approved'
    Note over FS: 4. Log actions in 'audit_logs'
    Note over FS: 5. Queue push notification document
    API-->>Web: Return Success Response
    deactivate API
    activate Web
    Web-->>Admin: Display success toast notification
    deactivate Web
    FS-->>App: Firebase listener sync: Lawyer credit balance updated!
```

---

## 7. CLASS DIAGRAM

```mermaid
classDiagram
    class UserProfile {
        +String id
        +String email
        +String displayName
        +String role
        +String status
        +String phone
        +String photoURL
        +int credits
    }
    class LawyerProfile {
        +String city
        +String[] specialization
        +int experienceYears
        +String credentialUrl
        +boolean isPremium
        +float rating
    }
    UserProfile <|-- LawyerProfile

    class LegalCase {
        +String id
        +String clientId
        +String clientName
        +String assignedLawyerId
        +String title
        +String description
        +String category
        +float budget
        +String status
        +TimelineEvent[] timeline
        +int createdAt
    }

    class CaseProposal {
        +String id
        +String caseId
        +String lawyerId
        +float bidAmount
        +String message
        +String status
        +int createdAt
    }

    class CreditPurchase {
        +String id
        +String lawyerId
        +String planName
        +int credits
        +float amount
        +String senderTitle
        +String senderNumber
        +String transactionId
        +String status
        +String proofUrl
        +String rejectionReason
        +String createdAt
    }

    class AuthStore {
        +UserProfile user
        +boolean isLoading
        +setUser(UserProfile user)
        +setLoading(boolean loading)
        +logout()
    }

    class CaseService {
        +classifyCaseWithAI(String desc)
        +postCaseToMarketplace(String clientId, String clientName, String title, String description, String category, float budget)
        +acceptProposal(String proposalId, String caseId, String lawyerId, String clientId, float amount)
        +closeCase(String caseId, String closedBy)
    }

    class MarketplaceService {
        +getOpenCases()
        +submitProposal(String caseId, String lawyerId, float bidAmount, String message)
        +getLawyerBiddedCaseIds(String lawyerId)
        +reportCase(String caseId, String reporterId, String reason)
    }

    class AdminService {
        +getAdminStats()
        +getPendingLawyers()
        +approveLawyer(String lawyerId)
    }
```

---

## 8. ACTIVITY DIAGRAM

```mermaid
stateDiagram-v2
    [*] --> ApplicationLaunch: Launch App
    ApplicationLaunch --> ClientRegistration: Sign up as Client
    ApplicationLaunch --> LawyerRegistration: Sign up as Lawyer

    state LawyerRegistration {
        [*] --> UploadLicense: Set status = 'pending'
        UploadLicense --> IdentityVerificationQueue: Upload license PDF/Image
        IdentityVerificationQueue --> LawyerApproved: Admin verifies credentials on dashboard
    }

    ClientRegistration --> DefineCaseDetails: Input legal issue
    DefineCaseDetails --> TriggerAIEngine: Run AI Analysis
    TriggerAIEngine --> CasePublished: Match Category & Post to Marketplace
    
    LawyerApproved --> BrowseMarketplace: Access feed
    CasePublished --> BrowseMarketplace : Available in Feed
    
    BrowseMarketplace --> VerifyCredits: Apply for case
    state VerifyCredits {
        [*] --> CheckBalance
        CheckBalance --> SubmitProposalPrice: Balance >= 1 credit
        CheckBalance --> BlockAction: Balance < 1 credit
        BlockAction --> TopUpFlow: Navigate to Pro Services (Easypaisa)
    }
    
    SubmitProposalPrice --> BidsReview: Bid created & credit deducted
    BidsReview --> AcceptProposalState: Client accepts best quotation
    AcceptProposalState --> CreateChatSession: Launch Direct Messaging Thread
    CreateChatSession --> AddProgressUpdates: Progress updates added to timeline
    AddProgressUpdates --> CloseCaseState: Case marked as resolved
    CloseCaseState --> [*]
```
