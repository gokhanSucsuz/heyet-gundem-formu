# Project Plan: System Notifications & Database Encryption

## Overview
This plan outlines the implementation of a global notification system that alerts users to any changes made across the application, combined with a critical security upgrade to ensure all data stored in MongoDB is robustly encrypted. Since the system operates without user authentication, securing the data at rest and providing transparent change logs (via notifications) are top priorities.

## Project Type
**WEB** (Next.js Application)

## Success Criteria
- **Notifications**: Any CUD (Create, Update, Delete) operation in the system triggers a notification.
- **UI Feedback**: Users receive instant Toast messages for real-time feedback, and a Bell icon retains a history of recent system changes.
- **Security**: All sensitive data written to MongoDB is encrypted at the application level before being stored, and decrypted seamlessly upon retrieval.

## Tech Stack
- **Database**: MongoDB (existing)
- **Encryption**: Node.js native `crypto` module (AES-256-GCM) for robust, standard-compliant field/document level encryption.
- **Notifications UI**: `sonner` or `react-hot-toast` for elegant, non-intrusive toast messages. Lucide React for the Bell icon.
- **State Management**: Existing `useLiveQuery` and SWR/Context for real-time notification fetching.

## File Structure
```text
/
├── lib/
│   ├── encryption.ts         # New: AES-256 encryption/decryption utilities
│   └── mongo_db_adapter.ts   # Modified: Hook encryption into CRUD operations
├── app/
│   ├── api/db/[collection]/  # Modified: Dispatch notifications on POST/PUT/DELETE
│   └── api/notifications/    # New: API for fetching recent notifications
├── components/
│   ├── NotificationBell.tsx  # New: Bell icon with dropdown history
│   └── Layout.tsx            # Modified: Integrate Bell and Toaster provider
```

## Task Breakdown

### Task 1: Implement Application-Level Encryption
- **Agent**: `security-auditor` (with `backend-specialist` skills)
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Existing `lib/mongo_db_adapter.ts`
- **OUTPUT**: `lib/encryption.ts` and updated DB adapter.
- **VERIFY**: Check MongoDB directly (via Compass or Mongo Shell) to confirm documents are stored as ciphertext, but the UI displays plaintext correctly.

### Task 2: Create Notification Schema and API
- **Agent**: `backend-specialist`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: `app/api/db/[collection]/route.ts`
- **OUTPUT**: A mechanism that automatically inserts a record into a new `notifications` MongoDB collection whenever a mutation API is called.
- **VERIFY**: Perform a save action in the app; verify a new notification document is created in the database.

### Task 3: Build Notification UI (Bell & Toasts)
- **Agent**: `frontend-specialist`
- **Priority**: P2
- **Dependencies**: Task 2
- **INPUT**: `components/Layout.tsx`
- **OUTPUT**: A global Toaster provider and a `NotificationBell` component in the top navigation bar.
- **VERIFY**: Trigger a change; observe a Toast popup appear and the Bell icon badge increment with the new change logged in the dropdown.

## Phase X: Final Verification
- [x] Lint & Type Check: `npm run lint && npx tsc --noEmit`
- [x] Build Check: `npm run build`
- [x] Security Verification: Verify `.env.local` has a strong `ENCRYPTION_KEY` and DB data is unreadable without it.
- [x] UX Verification: Toasts do not block interaction; Bell dropdown is readable on mobile.

## ✅ PHASE X COMPLETE
- Lint/Type: ✅ Pass
- Security: ✅ No critical issues (AES-256 implemented securely)
- Build: ✅ Success
- Date: 2026-05-06
