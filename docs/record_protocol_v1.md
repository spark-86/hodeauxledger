# Record Protocol v1.0

## Structure

```json
{
    "previous_hash": "1234...",
    "protocol": "v1",
    "scope": "some.random.scope.org",
    "nonce": "odlsiaopi...",
    "at": 1.23456789,
    "record_type": "key:grant",
    "data": {
        "schema": "key_grant_r1",
        "key": "9012..."
    },
    "signatures": [
        {
            "fingerprint": "5678...",
            "signature": "9023489ui...",
            "type": "owner"
        }
    ],
    "current_hash": "934r8oiuf..."
}
```
