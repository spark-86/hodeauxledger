# Scope Policy Explained

## Structure

```json
{
    "data": {
        "policy": [
            "quorum1of1", // Only need a single key to approve quorum
            "quorum2of3", // Needs 2 of 3 keys to approve quorum
            "quorum3of5", // Needs 3 of 5 keys to approve quorum
            "quorum4of7", // Needs 4 of 7 keys to approve quorum
            "quorum5of9", // Needs 5 of 9 keys to approve quorum
            "quorum6of11", // Needs 6 of 11 keys to approve quorum
            "publicWrite", // Author role not needed to post
            "publicRead" // Auditor/Author role not needed to read
            "roleWrite", // Author role needed to post
            "roleRead" // Auditor/Author role needed to read
        ]
    }
}
```

## Policy defaults

-   `quorum1of1`
-   `roleWrite`
-   `roleRead`
