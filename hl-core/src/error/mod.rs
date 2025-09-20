//! Usher error codes (string constants)

pub mod stack;

/// generic / fallback
pub const E_INTERNAL: &str = "E_INTERNAL";
pub const E_UNIMPLEMENTED: &str = "E_UNIMPLEMENTED";
pub const E_INVALID_ARGUMENT: &str = "E_INVALID_ARGUMENT";

//// ───────────────────────── Bootstrap / Config ─────────────────────────

pub const E_CONFIG_MISSING: &str = "E_CONFIG_MISSING";
pub const E_CONFIG_INVALID: &str = "E_CONFIG_INVALID";
pub const E_ENV_MISSING: &str = "E_ENV_MISSING";
pub const E_ENV_INVALID: &str = "E_ENV_INVALID";
pub const E_BIND_ADDR_INVALID: &str = "E_BIND_ADDR_INVALID";
pub const E_BIND_PORT_IN_USE: &str = "E_BIND_PORT_IN_USE";
pub const E_DATA_DIR_PERMISSIONS: &str = "E_DATA_DIR_PERMISSIONS";
pub const E_KEYSTORE_NOT_FOUND: &str = "E_KEYSTORE_NOT_FOUND";
pub const E_KEYSTORE_UNLOCK_FAILED: &str = "E_KEYSTORE_UNLOCK_FAILED";
pub const E_USHER_KEY_MISSING: &str = "E_USHER_KEY_MISSING";
pub const E_USHER_KEY_INVALID: &str = "E_USHER_KEY_INVALID";

//// ───────────────────────── Network / Transport ────────────────────────

pub const E_NET_RESOLVE_FAILED: &str = "E_NET_RESOLVE_FAILED";
pub const E_NET_CONNECT_TIMEOUT: &str = "E_NET_CONNECT_TIMEOUT";
pub const E_NET_CONNECT_REFUSED: &str = "E_NET_CONNECT_REFUSED";
pub const E_NET_TLS_HANDSHAKE: &str = "E_NET_TLS_HANDSHAKE";
pub const E_NET_READ_TIMEOUT: &str = "E_NET_READ_TIMEOUT";
pub const E_NET_WRITE_TIMEOUT: &str = "E_NET_WRITE_TIMEOUT";
pub const E_NET_PROTOCOL_MISMATCH: &str = "E_NET_PROTOCOL_MISMATCH";
pub const E_NET_PAYLOAD_TOO_LARGE: &str = "E_NET_PAYLOAD_TOO_LARGE";
pub const E_NET_BACKPRESSURE: &str = "E_NET_BACKPRESSURE";

//// ───────────────────────── Identity / Roles / Keys ────────────────────

pub const E_SCOPE_UNKNOWN: &str = "E_SCOPE_UNKNOWN";
pub const E_SCOPE_LOCKED: &str = "E_SCOPE_LOCKED";
pub const E_SCOPE_NAME_INVALID: &str = "E_SCOPE_NAME_INVALID";

pub const E_AUTHOR_KEY_DECODE: &str = "E_AUTHOR_KEY_DECODE";
pub const E_AUTHOR_MISMATCH: &str = "E_AUTHOR_MISMATCH";
pub const E_USHER_KEY_DECODE: &str = "E_USHER_KEY_DECODE";
pub const E_USHER_MISMATCH: &str = "E_USHER_MISMATCH";
pub const E_QUORUM_KEY_DECODE: &str = "E_QUORUM_KEY_DECODE";
pub const E_KEY_FORMAT_INVALID: &str = "E_KEY_FORMAT_INVALID";
pub const E_KEY_REVOKED: &str = "E_KEY_REVOKED";
pub const E_ROLE_NOT_PERMITTED: &str = "E_ROLE_NOT_PERMITTED";
pub const E_APPEND_ROLES_EMPTY: &str = "E_APPEND_ROLES_EMPTY";
pub const E_APPEND_DENIED: &str = "E_APPEND_DENIED";
pub const E_ROLE_QUORUM_DUP_KEYS: &str = "E_ROLE_QUORUM_DUP_KEYS"; // duplicate signer used to fake quorum
pub const E_USHER_SELF_SIGNATURE_BLOCKED: &str = "E_USHER_SELF_SIGNATURE_BLOCKED"; // policy forbids author==usher

//// ───────────────────────── Cryptographic Validation ───────────────────

pub const E_CBOR_DECODE: &str = "E_CBOR_DECODE";
pub const E_CBOR_CANON_MISMATCH: &str = "E_CBOR_CANON_MISMATCH"; // non-deterministic encoding detected
pub const E_B64_DECODE: &str = "E_B64_DECODE";

pub const E_HASH_MISSING: &str = "E_HASH_MISSING";
pub const E_HASH_LENGTH: &str = "E_HASH_LENGTH";
pub const E_HASH_MISMATCH: &str = "E_HASH_MISMATCH"; // recomputed != advertised

pub const E_SIG_MISSING: &str = "E_SIG_MISSING";
pub const E_SIG_LENGTH: &str = "E_SIG_LENGTH";
pub const E_SIG_INVALID: &str = "E_SIG_INVALID";
pub const E_SIG_DOMAIN_MISMATCH: &str = "E_SIG_DOMAIN_MISMATCH"; // wrong domain/tag bound to message
pub const E_SIG_OVER_UNCANONICAL_BYTES: &str = "E_SIG_OVER_UNCANONICAL_BYTES";

pub const E_QUORUM_INSUFFICIENT: &str = "E_QUORUM_INSUFFICIENT";
pub const E_QUORUM_SET_INVALID: &str = "E_QUORUM_SET_INVALID"; // wrong signer set for policy
pub const E_QUORUM_POLICY_UNSATISFIED: &str = "E_QUORUM_POLICY_UNSATISFIED";

//// ───────────────────────── Time / Heartbeat ───────────────────────────

pub const E_TIME_ANCHOR_MISSING: &str = "E_TIME_ANCHOR_MISSING"; // context.at absent when required
pub const E_TIME_SKEW_PAST: &str = "E_TIME_SKEW_PAST";
pub const E_TIME_SKEW_FUTURE: &str = "E_TIME_SKEW_FUTURE";
pub const E_TIME_WINDOW_EXPIRED: &str = "E_TIME_WINDOW_EXPIRED";
pub const E_TIME_WINDOW_NOT_YET_VALID: &str = "E_TIME_WINDOW_NOT_YET_VALID";
pub const E_HEARTBEAT_DRIFT_EXCEEDED: &str = "E_HEARTBEAT_DRIFT_EXCEEDED";
pub const E_HEARTBEAT_QUORUM_MISSED: &str = "E_HEARTBEAT_QUORUM_MISSED";

//// ───────────────────────── Record / Schema Validation ─────────────────

pub const E_MAGIC_BAD: &str = "E_MAGIC_BAD";
pub const E_RECORD_TYPE_UNKNOWN: &str = "E_RECORD_TYPE_UNKNOWN";
pub const E_RECORD_TOO_LARGE: &str = "E_RECORD_TOO_LARGE";
pub const E_INTENT_MISSING: &str = "E_INTENT_MISSING";
pub const E_DATA_SCHEMA_INVALID: &str = "E_DATA_SCHEMA_INVALID";
pub const E_CONTEXT_SPACIAL_PARSE: &str = "E_CONTEXT_SPACIAL_PARSE";
pub const E_CONTEXT_REFER_INVALID: &str = "E_CONTEXT_REFER_INVALID";
pub const E_NONCE_MISSING: &str = "E_NONCE_MISSING";
pub const E_NONCE_REUSED: &str = "E_NONCE_REUSED";
pub const E_NONCE_UNAVALIBLE: &str = "E_NONCE_UNAVALIBLE";
pub const E_DUPLICATE_SIGNATURE: &str = "E_DUPLICATE_SIGNATURE";

//// ───────────────────────── Chain / Ledger Semantics ───────────────────

pub const E_GENESIS_ALREADY_EXISTS: &str = "E_GENESIS_ALREADY_EXISTS";
pub const E_GENESIS_SCOPE_INVALID: &str = "E_GENESIS_SCOPE_INVALID";
pub const E_GENESIS_SELF_USHER_FORBIDDEN: &str = "E_GENESIS_SELF_USHER_FORBIDDEN";
pub const E_GENESIS_QUORUM_INSUFFICIENT: &str = "E_GENESIS_QUORUM_INSUFFICIENT";

pub const E_PREV_HASH_BEHIND_HEAD: &str = "E_PREV_HASH_BEHIND_HEAD"; // previous points to older than current head
pub const E_PREVIOUS_HASH_MISSING: &str = "E_PREVIOUS_HASH_MISSING";
pub const E_PREVIOUS_NOT_FOUND: &str = "E_PREVIOUS_NOT_FOUND";
pub const E_CHAIN_BREAK_PREV_MISMATCH: &str = "E_CHAIN_BREAK_PREV_MISMATCH";
pub const E_CHAIN_OUT_OF_ORDER: &str = "E_CHAIN_OUT_OF_ORDER";
pub const E_DUPLICATE_RECORD: &str = "E_DUPLICATE_RECORD";
pub const E_REPLAY_DETECTED: &str = "E_REPLAY_DETECTED";
pub const E_FORK_DETECTED: &str = "E_FORK_DETECTED";
pub const E_FORK_BLOCKED_BY_POLICY: &str = "E_FORK_BLOCKED_BY_POLICY";
pub const E_NOT_LEAF_APPEND: &str = "E_NOT_LEAF_APPEND"; // trying to append when previous has a child
pub const E_ALREADY_APPLIED: &str = "E_ALREADY_APPLIED";

//// ───────────────────────── Storage / Index / DB ───────────────────────

pub const E_DB_CONNECT: &str = "E_DB_CONNECT";
pub const E_DB_TX_BEGIN: &str = "E_DB_TX_BEGIN";
pub const E_DB_TX_COMMIT: &str = "E_DB_TX_COMMIT";
pub const E_DB_QUERY: &str = "E_DB_QUERY";
pub const E_DB_CONSTRAINT: &str = "E_DB_CONSTRAINT"; // UNIQUE/FOREIGN KEY violation
pub const E_INDEX_CORRUPT: &str = "E_INDEX_CORRUPT";
pub const E_INDEX_MISSING: &str = "E_INDEX_MISSING";
pub const E_MIGRATION_REQUIRED: &str = "E_MIGRATION_REQUIRED";
pub const E_MIGRATION_FAILED: &str = "E_MIGRATION_FAILED";

pub const E_FS_READ: &str = "E_FS_READ";
pub const E_FS_WRITE: &str = "E_FS_WRITE";
pub const E_FS_RENAME: &str = "E_FS_RENAME";
pub const E_FS_FSYNC: &str = "E_FS_FSYNC";
pub const E_FS_DIR_EXISTS: &str = "E_FS_DIR_EXISTS";

pub const E_CACHE_RHEX: &str = "E_CACHE_RHEX";

//// ───────────────────────── Policy / AuthZ / Rate Limit ────────────────

pub const E_POLICY_MISSING: &str = "E_POLICY_MISSING";
pub const E_POLICY_INVALID: &str = "E_POLICY_INVALID";
pub const E_RATE_LIMITED: &str = "E_RATE_LIMITED";
pub const E_QUOTA_EXCEEDED: &str = "E_QUOTA_EXCEEDED";
pub const E_CONTENT_TYPE_UNSUPPORTED: &str = "E_CONTENT_TYPE_UNSUPPORTED";

//// ───────────────────────── Replication / Gossip / Mirrors ─────────────

pub const E_PEER_DISCOVERY_FAILED: &str = "E_PEER_DISCOVERY_FAILED";
pub const E_BROADCAST_FAILED: &str = "E_BROADCAST_FAILED";
pub const E_PEER_REJECTED: &str = "E_PEER_REJECTED";
pub const E_REPLICATION_INCOMPLETE: &str = "E_REPLICATION_INCOMPLETE";
pub const E_MIRROR_ACK_TIMEOUT: &str = "E_MIRROR_ACK_TIMEOUT";

//// ───────────────────────── API / RPC / I/O ────────────────────────────

pub const E_REQUEST_DECODE: &str = "E_REQUEST_DECODE";
pub const E_RESPONSE_ENCODE: &str = "E_RESPONSE_ENCODE";
pub const E_UNSUPPORTED_ENDPOINT: &str = "E_UNSUPPORTED_ENDPOINT";
pub const E_METHOD_NOT_ALLOWED: &str = "E_METHOD_NOT_ALLOWED";
pub const E_UNAUTHORIZED: &str = "E_UNAUTHORIZED";
pub const E_FORBIDDEN: &str = "E_FORBIDDEN";
pub const E_NOT_FOUND: &str = "E_NOT_FOUND";
pub const E_CONFLICT: &str = "E_CONFLICT";

//// ───────────────────────── Observability / Ops ────────────────────────

pub const E_HEALTH_UNAVAILABLE: &str = "E_HEALTH_UNAVAILABLE";
pub const E_METRICS_EXPORT_FAILED: &str = "E_METRICS_EXPORT_FAILED";
pub const E_LOG_SERIALIZE: &str = "E_LOG_SERIALIZE";
pub const E_TRACING_SPAN_ERROR: &str = "E_TRACING_SPAN_ERROR";
