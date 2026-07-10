# Security Specification for quiz-portal-uet

## Data Invariants
1. A complaint can only be created by an authenticated user.
2. The `userId` of the complaint must match the `request.auth.uid` of the authenticated user.
3. The `userEmail` must match the authenticated user's email, and the user's email must be verified.
4. The title must be a string with a length of up to 150 characters.
5. The description must be a string with a length of up to 1000 characters.
6. The category must be one of: `quiz`, `downloads`, `timetable`, `other`.
7. The status must start as `pending` and can only be updated to `resolved` or modified by the user if it's not yet resolved (or if updated to `resolved` by admin).
8. `createdAt` and `updatedAt` must be set to `request.time`.

## The "Dirty Dozen" Payloads
Here are 12 malicious payloads designed to bypass identity, integrity, and state rules:

1. **Anonymous / Unauthenticated Create**: Creating a complaint without signing in.
2. **Identity Spoofing (Create)**: Signing in as user `attacker_123` but submitting a complaint with `userId: "victim_456"`.
3. **Email Spoofing**: Attempting to submit a complaint with a non-verified email or an email that does not match the authenticated user's.
4. **Huge Title**: Submitting a complaint with a title exceeding 150 characters (e.g., 200 characters) to exhaust database storage or mess up UI.
5. **Huge Description**: Submitting a complaint with description exceeding 1000 characters.
6. **Invalid Category**: Setting `category: "hacker_category"` to cause data inconsistency.
7. **Invalid Status**: Setting `status: "resolved"` upon creation to bypass administrative workflow.
8. **Client Timestamp Spoofing**: Submitting a complaint with `createdAt` set to a hardcoded client timestamp (e.g., years in the future or past) rather than `request.time`.
9. **Malicious ID injection**: Attempting to create a complaint with a document ID containing special path traversal or massive characters (e.g., `../../../etc/passwd` or a 500-character string).
10. **State Shortcutting / Bypass update**: Attempting to edit a complaint's `userId` or `userEmail` after creation.
11. **PII Exposing Blanket List**: Attempting to read all complaints without a filter, or reading another user's private complaint document.
12. **Status Lock Bypass**: Attempting to modify a complaint's details after it has been marked as `resolved`.

## Security Rules Implementation Strategy
The `firestore.rules` file will implement exact type checks, size checks, and owner-checks using the helper functions:
- `isSignedIn()`
- `isOwner(userId)`
- `isValidComplaint(data)`
- `isValidId(id)`
- `isEmailVerified()`
- `isPending(data)`
