# Role authorization and identity limitations

The project retains its faculty-required NestJS RBAC contract: `RolesGuard` checks the caller-provided `role` request header against each controller's `@Roles(...)` declaration. The backend uses the existing in-memory application architecture, DTO validation, and Swagger documentation. Browser login flows remain part of the academic demo; no backend account store, password system, session cookie, or identity provider is configured.

## Caller identity is not verified

The `role`, `user-id`, and `user-email` headers are caller supplied. A caller can change any of them. The `RolesGuard` demonstrates role-header RBAC as required by the assignment; it does not authenticate the caller. Booking list/detail filters and customer/provider update checks use `user-id` and `user-email` to preserve the existing interface behavior, but these are best-effort filters only. A caller can spoof another customer's or provider's identifiers and pass those checks.

Do not describe header-based identity scoping as secure ownership enforcement. Genuine customer/provider ownership requires a trusted authentication mechanism and an authoritative identity source, neither of which is part of the current assignment contract.

## Booking behavior

- The `admin` role header can list and manage all bookings.
- `user` and `provider` role headers receive bookings filtered by their supplied identity headers. The identity limitation above applies.
- Customer creation uses a restricted DTO. The server derives service price and initial payment status from the in-memory provider catalog; customer and provider identifiers still come from unverified headers.
- Customer/provider PATCH requests accept status changes only, with role-specific transitions. Admin management retains the existing DTO and validation pipeline.
- Existing request/response shapes and local frontend login workflows are retained where possible.
