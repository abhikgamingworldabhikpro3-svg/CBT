# Computer Based Test (CBT) Examination Engine

A professional, full-featured Computer Based Test (CBT) examination web application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**. The platform is fully responsive, installable as a Progressive Web App (PWA), and pre-configured for Capacitor/Android APK compilation.

---

## Key Features

1. **Role-Based dashboards (RBAC)**:
   - **Admin**: Create/disable students and teachers, map subject access domains, view comprehensive audit logs, and inspect real-time security events.
   - **Teacher**: Maintain distinct subject-specific access, author dynamic Question Banks, launch examinations using a multi-step setup wizard, and grade candidates.
   - **Student**: Enter a secure examination room, read detailed exam guidelines, run proctoring check cycles, and review graded papers.
2. **Flexible Question Editor**:
   - Single MCQ, Multiple MCQ, True/False, and Numerical Answer types.
   - Separate, isolated answers keys which are mathematically impossible for students to read or inspect from queries in transit.
   - Structured CSV bulk question parser.
3. **Robust Proctoring Sentinel (Security logs)**:
   - Event trackers for browser blur, tab switches, and fullscreen exits.
   - Live camera focus and presence radar simulation with warning flags.
   - Central proctoring event logger feeding live charts in Admin views.
4. **Reliability & Offline Sync**:
   - Real-time auto-saving of options.
   - Dynamic connection status indicator showing when local caches are being synced.
   - Server-deadline synchronized countdown timers.

---

## Firebase Setup Instructions

Follow these steps to fully deploy the CBT Engine:

### 1. Create a Firebase Project
- Visit the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
- Enable **Google Analytics** (optional).

### 2. Enable Authentication Providers
- Inside your project, navigate to **Build > Authentication > Sign-in method**.
- Enable **Google** (for standard logins) and **Email/Password** (for reviewer demo logins).

### 3. Setup Firestore Database
- Navigate to **Build > Firestore Database** and click **Create Database**.
- Set the Location (e.g. `us-central1` or `asia-east1`).
- Start in **Production Mode** (the security rules we provide will lock down and protect your tables).

### 4. Configure Web Credentials
- Go to Project Settings and click the Web platform icon `</>` to register an app.
- Copy the provided configuration keys and replace them inside `firebase-applet-config.json` in your project root:
  ```json
  {
    "projectId": "YOUR_PROJECT_ID",
    "appId": "YOUR_APP_ID",
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_AUTH_DOMAIN",
    "firestoreDatabaseId": "YOUR_DATABASE_ID",
    "storageBucket": "YOUR_STORAGE_BUCKET"
  }
  ```

### 5. Deploy Security Rules
- Sync the security rules file using your Firebase CLI:
  ```bash
  firebase deploy --only firestore:rules
  ```
- Alternatively, copy the exact contents of `firestore.rules` inside the Firestore **Rules** tab in the online dashboard and click **Publish**.

---

## Development and Deployment

### Run Locally
```bash
npm run dev
```

### Build & Deploy PWA
```bash
npm run build
```
Vite will output optimized, pre-cached chunks inside the `dist/` directory, registering manifest assets and background service workers automatically.

### Android APK Compilation
To package as a native Android App using Capacitor:
```bash
# Install Capacitor core & CLI
npm install @capacitor/core @capacitor/cli

# Add Android Platform
npm install @capacitor/android
npx cap add android

# Build and Sync
npm run build
npx cap sync

# Open Android Studio to compile APK
npx cap open android
```

---

## Security & Verification Audits
- **Isolating Keys**: Student queries never download the true keys from `/questions`. Answer keys are isolated inside `/questions/{id}/keys/answerKey` sub-routes which require Teacher/Admin roles.
- **Strict Timestamps**: Server timings block students from writing answers to attempts whose elapsed deadline is past request time.
- **Append-Only Auditing**: Audit logs are append-only. No user (including Admin) is authorized to modify or delete logs.
