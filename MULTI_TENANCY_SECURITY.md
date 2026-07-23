# Multi-Tenancy Security

- Resolve the active tenant from a verified membership, never only from request input.
- Scope every tenant-owned table and query by `organization_id`.
- Use compound uniqueness for enrollment, room membership, subscription, and invitation tokens.
- Clear tenant query caches when switching workspace.
- Verify object ownership to prevent cross-tenant IDOR attacks.
- Enforce capacity using database locks or serializable transactions.
- Generate invitation tokens server-side, store hashes, and enforce expiry and one-time acceptance.
- Use signed, short-lived URLs for protected content.
- Never expose storage, email, payment, or video-provider secrets in Vite environment variables.
- Record course moderation, booking confirmation, membership changes, and subscription activation in audit logs.
- Rate-limit authentication, invitation, booking, and public search endpoints.
- Treat frontend role guards as UX only; backend authorization is mandatory.
