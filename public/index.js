import sodium from "https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.15/+esm";

await sodium.ready;

function canonicalize(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        return "[" + obj.map(canonicalize).join(",") + "]";
    }

    const keys = Object.keys(obj).sort();
    return (
        "{" +
        keys
            .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]))
            .join(",") +
        "}"
    );
}

document.getElementById("signButton").addEventListener("click", async () => {
    const protocol = document.getElementById("protocol").value.trim();
    const scope = document.getElementById("scope").value.trim();
    const nonce = sodium.to_base64(sodium.randombytes_buf(32));
    const base64Key = document.getElementById("privateKey").value.trim();
    const recordJson = document.getElementById("jsonPayload").value.trim();
    const output = document.getElementById("output");
    const network = document.getElementById("network");
    const recordType = document.getElementById("record_type").value.trim();

    const seed = sodium.from_base64(base64Key).slice(0, 32);
    const { publicKey: publicBuffer } = sodium.crypto_sign_seed_keypair(seed);
    const fingerprint = sodium.to_base64(publicBuffer);

    try {
        const privateKey = sodium.from_base64(base64Key);
        const record = {
            protocol,
            scope,
            nonce,
            record_type: recordType,
            data: JSON.parse(recordJson),
            signatures: [
                {
                    fingerprint,
                    type: "owner",
                },
            ],
        };

        // Canonicalize the record (you must use same method as the backend!)
        const canonical = canonicalize(record); // Replace with canonicalize(record) if needed

        const messageBytes = sodium.from_string(canonical);
        const signature = sodium.crypto_sign_detached(messageBytes, privateKey);
        const signatureBase64 = sodium.to_base64(signature);

        const signed = {
            ...record,
            signatures: [
                {
                    fingerprint,
                    type: "owner",
                    signature: signatureBase64,
                },
            ],
        };

        output.textContent = JSON.stringify(signed, null, 2);
        network.textContent = "🟢 Contating localhost...";
        network.textContent = await submit({ ...signed });
    } catch (err) {
        output.textContent = `❌ Error: ${err}`;
    }
});

const submit = async (data) => {
    const res = await fetch(`${window.location.origin}/append/${data.scope}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (res.ok) {
        return await res.json();
    }
};
