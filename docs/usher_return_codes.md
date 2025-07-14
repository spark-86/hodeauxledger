# Usher Reponse Codes

## 1xx - Startup

-   100: Usher not ready. For some reason we are listening, just can't do anything about it right now. I mean it should never really reach this but I'm reserving it just in case.

## 2xx - Success

-   200: Successfully read the requested records.
-   201: Created record(s) successfully.

## 3xx - Failed

-   300: Failed verification
-   301: Does not match protocol specified
-   310: Invalid request
-   320: Record(s) not found
-   330: Request too large. Data exceeds 1k.

## 4xx - Client Error

-   400: Requested message failed verification

## 5xx - Server Error

## 9xx - Severe Error

-   999: Unknown system error. This is what it defaults to when the listener doesn't set a value.
