# Haqooq PWA — Migration Architecture & Technical Specification

## 1. Executive Summary
This document defines the architectural blueprint and migration specification for porting the **Haqooq** legal marketplace mobile application (React Native / Expo) into a production-grade, responsive **Progressive Web App (PWA)** built with React, TypeScript, Vite, and modern web standards.

The PWA is engineered to operate seamlessly across:
- **Desktop environments** (Windows, macOS, Linux - Chromium, Firefox, Safari)
- **Tablets** (iPad Safari, Android tablets)
- **Mobile web** (iOS Safari, Android Chrome)
- **Standalone PWA mode** (Add to Home Screen / Desktop Install)

The mobile codebase remains the canonical source of truth for business logic, database structures, security constraints, and UI identity. The PWA operates independently in `/pwa` and directly connects to the existing Firebase backend without requiring a secondary backend.

---

## 2. Source Mobile Application Architecture Audit

### 2.1 Technology Stack Discovered
- **Core Framework:** React Native 0.81.5, Expo SDK 54, TypeScript 5.9
- **Authentication:** Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, Google Sign-In with orphan recovery and cross-role collision guards)
- **Database:** Firebase Cloud Firestore (real-time snapshots, transactions, atomic batches)
- **Storage:** Firebase Cloud Storage (avatars, lawyer credentials, payment receipts)
- **State Management:** Zustand with persistence (`authStore`, `caseStore`)
- **Validation:** Zod schemas (`schemas.ts`)
- **Error Tracking & Logging:** Sentry (`@sentry/react-native`)
- **Styling & Tokens:** Custom theme (`#1A365D` primary navy, `#C5A880` secondary brass, `#F8FAFC` background slate)

### 2.2 Roles & Access Matrix
1. **Client:**
   - Post legal cases (AI classification via Groq LLaMA / local NLP fallback, court levels, urgency, budget presets)
   - Active cases management with chronological timeline milestones
   - Proposal evaluation and atomic proposal acceptance (assigns lawyer, creates chat thread)
   - Case closure and 5-star advocate rating & review submission
2. **Lawyer (Advocate):**
   - Verification queue (uploads Bar Council license PDF/image, awaits admin review)
   - Case Feed marketplace (real-time browsing, urgency tags, full case briefs, 1-credit bid submission)
   - My Clients dashboard (milestone event publishing, case closure, client direct messaging)
   - Pro Tools (Easypaisa manual P2P credit packs checkout, receipt proof upload, transaction history)
3. **System Admin:**
   - Platform metrics (clients, verified lawyers, pending verifications, total cases)
   - Advocate verification queue (inspect uploaded credentials, approve with 10 initial credits, or reject with feedback)
4. **Shared (All authenticated users):**
   - Real-time 1-on-1 chat rooms and unified inbox with unread badges
   - Lawyer search and directory (filtered by specialization, city, rating/experience/recommended ranking)
   - Public advocate profiles (zero PII exposure) with instant consultation chat launcher
   - Trust & Safety reporting system (scam, spam, harassment, inappropriate content)
   - Profile management (avatar upload, personal details, support hotline, account deletion)

---

## 3. Feature Inventory & Migration Mapping

| Feature / Screen | Mobile Screen | Business Rules & Logic | Backend / Data Source | PWA Implementation Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Splash & Hydration** | `SplashScreen.tsx` | Hydrate session, verify Firestore profile, orphan recovery | Firebase Auth + Firestore `users` | Responsive splash loader with seamless auth transition | Must Reproduce |
| **User Sign-In** | `LoginScreen.tsx` | Email/password, Google Sign-in, form validation, error taxonomy | Firebase Auth (`signInWithEmailAndPassword`, `signInWithPopup`) | Clean accessible web form with password toggle & Google button | Must Reproduce |
| **User Registration** | `RegisterScreen.tsx` | Role selection (client vs lawyer), lawyer city & specialization, password strength rules, registration intent | Firebase Auth + Firestore `registration_intents` + `users` | Interactive multi-step or role-gated registration flow | Must Reproduce |
| **Password Reset** | `ForgotPasswordScreen.tsx` | Email validation, dispatch reset email | Firebase Auth (`sendPasswordResetEmail`) | Web modal or standalone page with clear confirmation | Must Reproduce |
| **Post Case** | `PostCaseScreen.tsx` | AI classification (Groq/NLP), auto-save draft to local storage, court levels, urgency turnaround, budget presets | Firestore `cases`, Groq API / local fallback, `localStorage` | Rich responsive form, draft persistence, live category selector | Must Reproduce |
| **Client Cases** | `ActiveCasesScreen.tsx` | Real-time snapshots, status filters (open/active/closed), timeline display | Firestore `cases` where `clientId == user.id` | Multi-column desktop grid / responsive mobile cards, timeline | Must Reproduce |
| **Proposals Evaluation** | `ProposalsScreen.tsx` | List pending bids, view lawyer details & rating, atomic acceptance transaction | Firestore `proposals`, `cases`, `chats` | Side-by-side bid comparison modal/view, accept button | Must Reproduce |
| **Case Feed** | `FeedScreen.tsx` | Open cases marketplace, verification check, 1-credit proposal submission, duplicate bid prevention | Firestore `cases`, `proposals`, `transactions` | Desktop filterable grid, urgent badges, proposal submission modal | Must Reproduce |
| **Lawyer Clients** | `LawyerCasesScreen.tsx` | Active engaged cases, push custom timeline events, message client, resolve case | Firestore `cases` where `assignedLawyerId == user.id` | Case manager workspace with interactive timeline builder | Must Reproduce |
| **Pro Tools & Credits** | `ProServicesScreen.tsx` | Credit packs (10, 50, 100), real-time purchase history | Firestore `credit_purchases` where `lawyerId == user.id` | Tiered pricing cards, transaction log with status badges | Must Reproduce |
| **Easypaisa Checkout** | `EasypaisaCheckoutModal.tsx`| Copy account `03139330041`, receipt image upload, duplicate ID validation | Firebase Storage `receipts/`, Firestore `credit_purchases` | Accessible modal, copy-to-clipboard, drag-and-drop receipt upload | Must Reproduce |
| **Pending Approval** | `PendingApprovalScreen.tsx` | Gating for unverified lawyers, credential document upload | Firebase Storage `credentials/`, Firestore `users` | Informational status view with document uploader and helpline | Must Reproduce |
| **Lawyer Search** | `SearchScreen.tsx` | Filter by practice area & city, sort by recommended/rating/experience, pagination | Firestore `users` (verified only, PII sanitized) | Search bar, pill filters, responsive grid of advocate cards | Must Reproduce |
| **Advocate Public Profile**| `PublicProfileScreen.tsx` | Sanitized public view, rating stars, specialization tags, start consultation | Firestore `users`, `chats` | Professional attorney profile view, consultation action | Must Reproduce |
| **Real-time Chat** | `ChatRoomScreen.tsx` | Real-time message streaming, cursor pagination, auto-scroll to bottom, send message | Firestore `chats/{chatId}/messages` | WhatsApp/Slack-like responsive chat panel with typing area | Must Reproduce |
| **Unified Inbox** | `InboxScreen.tsx` | Direct messages & case chats, unread counter badges, relative timestamps | Firestore `chats` where `participants contains user.id` | Responsive conversation sidebar/list with live indicators | Must Reproduce |
| **User Profile & Settings** | `ProfileScreen.tsx` | Edit name/phone/city/specs, upload avatar, support options, account deletion | Firebase Auth, Firestore `users`, Storage `avatars/` | Comprehensive tabbed/card settings view, modals | Must Reproduce |
| **Trust & Safety Report** | `ReportModal.tsx` | Report case/user/message with category & reason | Firestore `reports` | Clean accessible modal dialog | Must Reproduce |
| **Admin Dashboard** | `AdminDashboard.tsx` | Platform metrics, pending lawyer approval/rejection with reasons | Firestore `users`, `cases`, `credit_purchases` | High-density admin console with review actions | Must Reproduce |

---

## 4. Platform Capability Matrix & Web Fallbacks

| Mobile Capability | Web Platform Support | PWA Implementation Strategy |
| :--- | :--- | :--- |
| **Push Notifications** | Web Push API (Service Worker) | Web Push Notification API where supported + In-App real-time Firestore listeners with visual toast alerts |
| **Local Storage** | `localStorage` / `IndexedDB` | Standard `localStorage` for draft & preferences; `IndexedDB` for Firebase persistent offline cache |
| **File / Image Upload** | HTML5 `<input type="file">` | Standard file picker with Drag-and-Drop support for receipts and Bar credentials |
| **Clipboard** | Navigator Clipboard API | `navigator.clipboard.writeText` with fallback to `document.execCommand('copy')` |
| **Deep Linking** | Standard Web URLs | React Router v6 with clean semantic URLs (`/cases/:id`, `/chat/:id`, `/lawyer/:id`) |
| **Google Sign-In** | Web Popups / Redirects | Firebase standard `signInWithPopup(auth, GoogleAuthProvider)` |
| **Helpline / Dialing** | `tel:` and `mailto:` protocols | Standard clickable links (`tel:+923139330041`, `mailto:...`, `https://wa.me/...`) |
| **Offline Support** | Service Worker + CacheStorage | Vite PWA plugin with Workbox caching static assets and offline navigation shell |

---

## 5. PWA Architecture & Folder Structure

```text
/pwa
  /public
    favicon.ico
    favicon.png
    icon-192.png
    icon-512.png
    manifest.json
    offline.html
  /src
    /assets
    /components
      /common
        Avatar.tsx
        Badge.tsx
        Button.tsx
        Card.tsx
        EmptyState.tsx
        Input.tsx
        LoadingSpinner.tsx
        Modal.tsx
        Skeleton.tsx
        Toast.tsx
      /layout
        DesktopSidebar.tsx
        Header.tsx
        MobileBottomNav.tsx
        PwaInstallBanner.tsx
        ResponsiveLayout.tsx
    /constants
      legalDomains.ts
      supportConfig.ts
    /features
      /admin
        AdminDashboard.tsx
      /auth
        ForgotPasswordModal.tsx
        LoginView.tsx
        RegisterView.tsx
      /chat
        ChatBubble.tsx
        ChatRoomView.tsx
        InboxView.tsx
      /client
        ActiveCasesView.tsx
        PostCaseView.tsx
        ProposalsModal.tsx
        RateLawyerModal.tsx
      /lawyer
        CaseFeedView.tsx
        EasypaisaCheckoutModal.tsx
        LawyerCasesView.tsx
        PendingApprovalView.tsx
        ProposalSubmitModal.tsx
        ProServicesView.tsx
      /search
        SearchAdvocatesView.tsx
      /shared
        ProfileView.tsx
        PublicProfileModal.tsx
        ReportModal.tsx
    /hooks
      useAuth.ts
      useCases.ts
      useChat.ts
      useMediaQuery.ts
      useToast.ts
    /lib
      firebase.ts
    /services
      adminService.ts
      authService.ts
      caseService.ts
      chatService.ts
      marketplaceService.ts
      ratingService.ts
      reportService.ts
      searchService.ts
    /store
      authStore.ts
      caseStore.ts
      uiStore.ts
    /styles
      globals.css
      theme.css
      tokens.css
    /types
      models.ts
      schemas.ts
    App.tsx
    main.tsx
  index.html
  package.json
  tsconfig.json
  vite.config.ts
```

---

## 6. Design System & Tokens
The visual identity directly inherits from the mobile application's curated palette:
- `--primary`: `#1A365D` (Deep Navy)
- `--primary-hover`: `#142947`
- `--primary-light`: `#EBF2FA`
- `--secondary`: `#C5A880` (Warm Brass / Gold)
- `--secondary-hover`: `#B3946A`
- `--background`: `#F8FAFC` (Slate 50)
- `--surface`: `#FFFFFF`
- `--surface-card`: `#FFFFFF`
- `--text-main`: `#0F172A` (Slate 900)
- `--text-secondary`: `#64748B` (Slate 500)
- `--border`: `#E2E8F0` (Slate 200)
- `--error`: `#E53E3E`
- `--success`: `#38A169`
- `--warning`: `#D69E2E`
- `--lawyer-accent`: `#5856D6` (Distinguished Advocate Purple)
- `--client-accent`: `#007AFF` (Client Blue)

---

## 7. Responsive Breakpoint Strategy
- **Mobile (< 768px):** Fixed top navigation bar + sticky bottom tab bar, native-feeling full-screen modals with sheet animations.
- **Tablet (768px - 1024px):** Collapsible compact sidebar navigation, 2-column card grids.
- **Desktop (>= 1024px):** Permanent left sidebar with branded header, multi-column dashboard layouts, split-screen Inbox & Chat interface, centered floating modals.

---

## 8. Verification & Test Plan
1. **TypeScript Verification:** `npm run build` runs `tsc -b && vite build` without errors.
2. **Unit / Integration Tests:** Verify auth flows, search filtering, case posting validation, proposal acceptance, and credit calculations.
3. **PWA Validation:** Manifest validation, service worker registration, offline shell caching.
