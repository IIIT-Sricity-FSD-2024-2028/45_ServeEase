# Role authorization and identity limitations

The backend now provides server-validated bearer sessions at `/api/auth`. `RolesGuard` resolves the session token before evaluating each controller's `@Roles(...)` declaration and overwrites legacy `role` and `user-id` request headers with the trusted session identity. Caller-supplied headers alone cannot authorize an API request.

Accounts are retained in the existing `serveEaseData` state record. New passwords are salted and hashed with Node's `scrypt`; legacy plaintext records remain compatible only for their next successful sign-in, when the password is upgraded in place and the plaintext value is removed. Sessions are in-memory, expire after eight hours, and are invalidated by logout or a server restart.

## Trusted request identity

Protected routes require an `Authorization: Bearer <token>` header. `RolesGuard` loads the authenticated account for the in-memory session and replaces legacy `role`, `user-id`, and `user-email` compatibility headers with the server-derived role, ID, and email. Controllers must use those trusted values (or `request.auth`) rather than caller input.

## Booking behavior

- Superuser sessions map to the existing `admin` API role; customer sessions map to the existing `user` API role for authorization only.
- Customer and provider booking reads and updates are scoped to the server-derived account ID.
- Customer creation uses a restricted DTO and derives customer identity, service price, and initial payment status on the server.
- Customer/provider PATCH requests accept status changes only, with role-specific transitions. Admin management retains the existing DTO and validation pipeline.
- Existing request/response shapes and local frontend login workflows are retained where possible.
