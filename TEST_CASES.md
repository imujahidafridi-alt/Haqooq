# Haqooq Application - End-to-End Test Cases

This document outlines the step-by-step manual test cases to verify all enterprise-grade features and workflows implemented in the Haqooq application. 

## Pre-requisites
1. Ensure the Expo development server is running (`npx expo start -c`).
2. Have two different devices/emulators ready, or use one device and log in/out to switch between the **Client** and **Lawyer** roles.
3. Ensure Firebase has been initialized and the AI (Groq API) Cloud Function is deployed.

---

## Test Suite 1: App Launch & Branding
**Objective:** Verify the new Splash Screen and safe area initializations.
* **Step 1:** Launch the application from a completely closed state.
* **Expected Result:** A professional animated splash screen with the logo and the slogan *"Empowering Your Legal Rights"* appears. It stays visible for a minimum of 2.5 seconds before transitioning. No UI elements should overlap with the device's status bar or notch (Safe Area Context working).

---

## Test Suite 2: Authentication & Role Management
**Objective:** Verify Email and Google Authentication for both roles, including the new security guards.

### 2.1 - Unregistered Google Login Guard
* **Step 1:** Open the app to the **Login Screen**.
* **Step 2:** Click **"Continue with Google"** using an account *that has never signed up for Haqooq*.
* **Expected Result:** The app blocks the login, revokes the Google session, and displays the user-friendly alert: *"It looks like you don’t have an account with us yet. Please sign up first."*

### 2.2 - Role-based Sign Up (Client & Lawyer)
* **Step 1:** Go to the **Sign Up Screen**.
* **Step 2:** Select the **Client** role. Enter an email, password, and name, then click **Sign Up** (or use Google Sign Up).
* **Expected Result:** Successfully logs in and lands on the Client Dashboard.
* **Step 3:** Log out.
* **Step 4:** Go to the **Sign Up Screen** again. Select the **Lawyer** role. Sign up using a *different* email/account.
* **Expected Result:** Successfully logs in and lands on the Lawyer Dashboard (Marketplace).

### 2.3 - Returning User Login Validation
* **Step 1:** Log out of the Lawyer account.
* **Step 2:** On the **Login Screen**, use the Google or Email credentials for the Client account.
* **Expected Result:** Login succeeds immediately, proving that Firestore and Firebase Auth are perfectly synced up.

---

## Test Suite 3: Client Workflow - Case Creation & AI
**Objective:** Verify a Client can create a case and the Cloud Function AI correctly evaluates it.
* **Step 1:** Log in as a **Client**.
* **Step 2:** Navigate to **Post a Case**.
* **Step 3:** Enter a descriptive legal issue (e.g., *"My landlord is evicting me without giving the proper 30-day notice."*).
* **Step 4:** Submit the case.
* **Expected Result:** The app shows a loading state while fetching from the Groq AI via Firebase Functions. It successfully posts the case to the marketplace. The case should now appear in the Client's "Open" cases list with an AI-generated category (e.g., "Property/Real Estate Law").

---

## Test Suite 4: Lawyer Workflow - Marketplace & Bidding
**Objective:** Verify a Lawyer can see the market and bid on open cases.
* **Step 1:** Log in as the **Lawyer** (on a second device or after logging out the Client).
* **Step 2:** Navigate to the **Marketplace / Open Cases** screen.
* **Expected Result:** The Client's newly posted case is visible.
* **Step 3:** Click on the case to write a proposal/bid. Enter your fee and a message, then submit.
* **Expected Result:** The proposal is submitted successfully and recorded in Firestore.

---

## Test Suite 5: Proposal Acceptance & Real-Time Chat
**Objective:** Verify the Client can accept a Lawyer's bid, shifting the case to 'Active' and enabling chat.
* **Step 1:** Log back in as the **Client**.
* **Step 2:** Go to the previously opened case and click **View Proposals**.
* **Expected Result:** The Lawyer's proposal is visible.
* **Step 3:** Click **Accept Proposal**.
* **Expected Result:** The case status changes from `Open` to `Active`. It moves to the "Active Cases" queue.
* **Step 4:** Click **Chat with Lawyer** on the active case card. Send a message: *"Thanks for taking my case!"*
* **Step 5:** Switch to the **Lawyer** account. Go to the "Active Cases" or "Messages" screen. Open the chat for this case.
* **Expected Result:** The Lawyer sees the real-time message and can reply back.

---

## Test Suite 6: Timeline Updates & Case Resolution
**Objective:** Verify the Lawyer can update the timeline and either party can formally close the case.

### 6.1 - Lawyer Timeline Push
* **Step 1:** As the **Lawyer**, go to your active cases list.
* **Step 2:** Click **Update Status** on the active case card.
* **Step 3:** Enter a title (e.g., *"Hearing Scheduled"*) and click **Push Update**.
* **Expected Result:** A success alert appears. 
* **Step 4:** Log in as the **Client**. Check the Case Timeline on the active case.
* **Expected Result:** The timeline immediately reflects the new "Hearing Scheduled" update.

### 6.2 - Case Closure
* **Step 1:** As either the Client or the Lawyer, locate the **"Resolve Case"** / **"Resolve & Close"** button on the Active Case card.
* **Step 2:** Click it and confirm the destructive alert prompt.
* **Expected Result:** The case status changes to `Closed`. A final timeline event is added ("This case was officially closed..."). The action buttons (Update Status, Chat, Resolve) disappear, and a red **"RESOLVED"** badge permanently appears on the case card for both users.

---

*If you encounter any unexpected behaviors during these steps, ensure your terminal is monitored for network issues or Firebase permission logs.*