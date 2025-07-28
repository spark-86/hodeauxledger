# Policy Set

## Core

-   **`schema`**: String: `policy.set/1`
-   **`keymaster_roles`**: Array - who can grand and revoke keys
-   **`read_roles`**: Array - who can read from the scope
-   **`append_roles`**: Array - who can append to the scope
-   **`quorum_roles`**: Array - who can vote/sign for quorum

## Quorum

-   **`quorum_map`**: Object - map of record types with colons converted to \_ (e.g. key_grant, policy_set). `all` is the default quorum if there is no match for the record type.

## Rate & Flow

-   **`max_records_per_turn`**: Integer - number of records submittable per Turn
-   **`throttle_backoff`**: Float: ban period in Turns when max_records_per_turn is reached

## Allow & Deny R⬢

-   **`allow_rhex`**: Array - An array of string values depicting the allowed R⬢ types. If set to ["all"] then we only reject from the `deny_rhex` field
-   **`deny_rhex`**: Array - an array of string values depicting the R⬢ we deny. If set to ["all"] then we only allow from the `allow_rhex` field

## Governance

-   **`policy_version`**: String: Semantic version of the current ruleset
-   **`policy_parent`**: String: parent scope to inherit policy from. Use this sparingly because it becomes easy to lock out leaf scopes.

## Transport Saving

-   **`request_logging`**: String: Define logging detail of requests (`none | hash_only | full_payload`)

## Misc

-   **`description`**: String: human-readable intent of the scope

-   **`tags`**: Array - an array of strings to use for indexing or filtering (e.g. ["selfid", "public", "private"])

-   **`created_by`**: Submitter's fingerprint for auditablity.
