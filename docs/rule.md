# Rule

## Defining new ones

```json
{
    "rules": [
        {
            "record_types": [
                "record:data",
                "policy:set",
                "key:grant",
                "scope:*"
            ],
            "append_roles": [
                "authority"
            ],
            "quorum_k": 1,
            "quorum_roles": [
                "authority"
            ],
            "rate_per_mark": 100
        }
    ] 
```