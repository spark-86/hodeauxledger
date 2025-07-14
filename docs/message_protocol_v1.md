# Message Protocol v1.0

## Message Format

```json
{
    "type": "append",
    "scope": "some.random.scope.org",
    "payload": {
        "protocol": "v1",
        "scope": "some.random.scope.org",
        "nonce": "odlsiaopi...",
        "fingerprint": "5678...",
        "record_type": "key:grant",
        "data": {
            "schema": "key_grant_r1",
            "key": "9012..."
        },
        "signature": "9023489ui..."
    },
    "nonce": "odlsiaopi...",
    "fingerprint": "5678...",
    "signature": "9023489ui..."
}
```
