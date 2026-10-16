# Role authorization and identity limitations

The backend now provides server-validated bearer sessions at `/api/auth`. `RolesGuard` resolves the session token before evaluating each controller's `@Roles(...)` declaration and overwrites legacy `role` and `user-id` request headers with the trusted session identity. Caller-supplied headers alone cannot authorize an API request.

Accounts are retained in the existing `serveEaseData` state record. New passwords are salted and hashed with Node's `scrypt`; legacy plaintext records remain compatible only for their next successful sign-in, when the password is upgraded in place and the plaintext value is removed. Sessions are in-memory, expire after eight hours, and are invalidated by logout or a server restart.

## Sign-in identity

`POST /api/auth/login` takes an `identifier` and a `password`, and nothing else. The account and its role are
resolved from the identifier; the client no longer sends a role, an actor type or a department, and cannot
influence any of them.

The identifier namespace is split by who issues the identity. An email addresses a self-registered consumer
identity; an id addresses an identity ServeEase issued. Emails contain an `@` and issued ids do not, so
resolution is unambiguous:

| Actor | Signs in with | Example |
| --- | --- | --- |
| Customer | registered email | `asha@example.com` |
| Superuser | email or account id | `super@serveease.com`, `SUR001` |
| Provider | account id | `PRO147` |
| Employee | employee id | `EMP-CO-001` |

An email resolves only `customer` and `superuser` records. Providers are deliberately unreachable by email:
that exclusion is what keeps the lookup single-valued now that registration enforces email and phone
uniqueness **per role** rather than globally, so one person may hold both a customer and a provider account on
one email and phone. A second account of the same role on an email is still refused.

Role `support` records in `serveEaseData.users` (for example `SUP001`) carry no department and are refused by
both branches; real employees live in `serveEaseEmployeeModuleData` and their department is read from that
record alone. Every rejected login returns one message, so a failure never reveals whether the identifier
exists, which kind of account it is, or which half of the credential was wrong. A suspension is still reported
only after the password has been verified.

Because a provider is reached by their id and never by their email, registration shows a new provider the id
they will sign in with, and the provider profile page repeats it.

## Trusted request identity

Protected routes require an `Authorization: Bearer <token>` header. `RolesGuard` loads the authenticated account for the in-memory session and replaces legacy `role`, `user-id`, and `user-email` compatibility headers with the server-derived role, ID, and email. Controllers must use those trusted values (or `request.auth`) rather than caller input.

## Booking behavior

- Superuser sessions map to the existing `admin` API role; customer sessions map to the existing `user` API role for authorization only.
- Customer and provider booking reads and updates are scoped to the server-derived account ID.
- Customer creation uses a restricted DTO and derives customer identity, service price, and initial payment status on the server.
- Customer/provider PATCH requests accept status changes only, with role-specific transitions. Admin management retains the existing DTO and validation pipeline.
- Existing request/response shapes and local frontend login workflows are retained where possible.
