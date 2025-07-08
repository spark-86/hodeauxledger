import { Key } from "./services/v2/keyService.js"; // adjust path if needed
import sodium from "libsodium-wrappers-sumo";

await sodium.ready;

const passphrase = "test-passphrase";

console.log("🔑 Generating keypair...");
const { publicKey, privateKey } = await Key.generatePair();

console.log("🔐 Encrypting private key...");
const encrypted = await Key.encryptPrivateKey(privateKey, passphrase);

console.log("🔓 Decrypting private key...");
const decryptedPrivateKey = await Key.decryptPrivateKey({
    ...encrypted,
    passphrase,
});

console.log("🧪 Comparing private keys...");
if (decryptedPrivateKey !== privateKey) {
    console.error("❌ Private key mismatch!");
    console.log("Expected:", privateKey);
    console.log("Actual:  ", decryptedPrivateKey);
    process.exit(1);
}

console.log("✅ Private key matches!");

console.log("📎 Deriving public key from decrypted private key...");
const regeneratedPublicKey = await Key.getPublicFromPrivate(
    decryptedPrivateKey,
    passphrase
);

if (regeneratedPublicKey !== publicKey) {
    console.error("❌ Public key mismatch!");
    console.log("Expected:", publicKey);
    console.log("Actual:  ", regeneratedPublicKey);
    process.exit(1);
}

console.log("✅ Public key matches!");
console.log("🎉 All key operations verified!");
