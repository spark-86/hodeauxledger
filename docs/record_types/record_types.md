# HodeauxLedger record_type explained

## Record Structure (v1 Protocol)

at is added at creation.

```json
{
    "previous_hash": "asd9f0we...",
    "protocol": "v1",
    "scope": "ledger:1000d2ddssxxxcc...",
    "at": 175998234923, // provided by server
    "key": "953554ae02fbdbb0b024af9893af...",
    "record_type": "root:add",
    "data": {
        "sampleData": "Sample Text"
    },
    "signature": "6908e9300d63feb9b77593a5edb8822d..."
    "current_hash": "asd9f0we..." // provided by server

}
```

Signature is a signature of previous_hash, protocol, scope, key, record_type and data.

## `genesis`

One per entire master ledger. Sets up the master authority key. This is the key used to create Root Authorities, those capabile of adding new sub-ledgers.

```json
{
    "data": {
        "name": "HodeauxLedger Core Trust",
        "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCA..."
    }
}
```

## `root:add`

Adds a Root Authority. data can contain metadata about said Root Authority.

```json
{
    "data": {
        "name": "Test Company Ledger Steward",
        "host": "steward.testcompany.com",
        "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCA..."
    }
}
```

## `root:update`

Updates a Root Authority. data can contain metadata about said Root Authority.

```json
{
    "data": {
        "name": "NuTest Ledger Steward",
        "host": "nusteward.testcompany.com"
    }
}
```

## `root:revoke`

Revokes a Root Authority. data contains the key hash of the Root Authority to revoke.

```json
{
    "data": {
        "key_hash": "fFtWEASxnCOgq7JVtcdWoy4a/HyrPWz..."
    }
}
```

## `scope:add`

Adds a Ledger. data can contain metadata about said Ledger.

```json
{
    "data": {
        "name": "Test Ledger",
        "scope": "testing.record"
    }
}
```

## `ledger:update`

Updates a Ledger. data can contain metadata about said Ledger.

```json
{
    "data": {
        "name": "NuLedger Name"
    }
}
```

## `ledger:close`

Closes a ledger so no more entires can be made. Must be issued by an Issuing Authority or the original Root Authority

```json
{
    "data": {
        "reason": "Text reason for closure"
    }
}
```

## `issue:add`

Adds an Issuing Authority. data can contain metadata about said Issuing Authority.

```json
{
    "data": {
        "name": "Test Issuer",
        "key": "--- BEGIN PUBLIC KEY --- ..."
    }
}
```

## `issue:update`

Updates the Issuing Authority. data can contain metadata about said Issuing Authority.

```json
{
    "data": {
        "name": "NuIssuer"
    }
}
```

## `issue:revoke`

Revokes an Issuing Authority. data contains the key hash of the Issuing Authority.

```json
{
    "data": {
        "key": "keyHashData"
    }
}
```

## `agent:add.author`

Adds an Agent's key as an author to this ledger. Only authors can add entries.

```json
{
    "data": {
        "name": "Veronica Hodo",
        "key": "--- BEGIN PUBLIC KEY --- ..."
    }
}
```

## `agent:add.audit`

Adds an Agent's key as an auditor. Auditors can only read the ledger.

```json
{
    "data": {
        "name": "Scooter Gomez",
        "email": "s.gomez@gomeztech.com",
        "key": "--- BEGIN PUBLIC KEY --- ..."
    }
}
```

## `agent:update`

Update everything about an Agent but the role. That has to be revoked and reissued.

## `agent:revoke`

Revoke an agent. Signed by an Issuing Authority

```json
{
    "data": {
        "key": "keyHashData"
    }
}
```

## `store`

Basic storage command. Used when there is no operational context or anything else, we just want to record this into the ledger

## `core:note`

Core notes. Can only be executed by the Core Trust. Theses are really anything from foundational notes to ledger milestones. Affect nothing operationally. Can be safely ignored
