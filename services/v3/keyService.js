import sodium from "libsodium-wrappers-sumo";

export const Key = {
    /**
     * Generates an ed21559 keypair
     * @returns {object} - Keypair object
     */
    async generatePair() {
        await sodium.ready;
        return sodium.crypto_sign_keypair();
    },

    /**
     * Encrypts a private key
     * @param {string} privateKey - The private key to encrypt (base64)
     * @param {string} passphrase - Passphrase to encrypt the key
     * @returns {object} - Object containing nonce, encrypted key, and salt
     */
    async encryptKey(privateKey, passphrase) {
        await sodium.ready;
        const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
        const nonce = sodium.randombytes_buf(
            sodium.crypto_secretbox_NONCEBYTES
        );
        const privateKeyBin = sodium.from_base64(privateKey);
        const encrypted = sodium.crypto_secretbox_easy(
            privateKeyBin,
            nonce,
            sodium.crypto_pwhash(
                sodium.crypto_secretbox_KEYBYTES,
                passphrase,
                salt,
                sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                sodium.crypto_pwhash_ALG_DEFAULT
            )
        );
        return {
            nonce: sodium.to_base64(nonce),
            encrypted: sodium.to_base64(encrypted),
            salt: sodium.to_base64(salt),
        };
    },

    /**
     * Decrypts an encrypted private key
     * @param {string} nonce - Nonce used for encryption (base64)
     * @param {string} encrypted - Encrypted private key (base64)
     * @param {string} salt - Salt used for encryption (base64)
     * @param {string} passphrase - Passphrase to decrypt the key
     * @returns
     */
    async decryptKey({ nonce, encrypted, salt, passphrase }) {
        await sodium.ready;
        const nonceBuf = sodium.from_base64(nonce);
        const encryptedBuf = sodium.from_base64(encrypted);
        const saltBuf = sodium.from_base64(salt);
        const decrypted = sodium.crypto_secretbox_open_easy(
            encryptedBuf,
            nonceBuf,
            sodium.crypto_pwhash(
                sodium.crypto_secretbox_KEYBYTES,
                passphrase,
                saltBuf,
                sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                sodium.crypto_pwhash_ALG_DEFAULT
            )
        );
        return decrypted;
    },

    /**
     * Converts a private key to a public key
     * @param {string} privateKey - The private key to convert (base64)
     * @returns {string} - The public key (base64)
     */
    async getPublicKey(privateKey) {
        await sodium.ready;
        const privateKeyBin = sodium.from_base64(privateKey);
        const { publicKey } = sodium.crypto_sign_seed_keypair(
            privateKeyBin.slice(0, 32)
        );
        return sodium.to_base64(publicKey);
    },

    /**
     * Signs a message with a private key
     * @param {string} message - The message to sign (string)
     * @param {string} privateKey - The private key to sign with (base64)
     * @returns {string} - The signature (base64)
     */
    async sign(message, privateKey) {
        await sodium.ready;
        const messageBin = sodium.from_string(message);
        const privateKeyBin = sodium.from_base64(privateKey);
        const signatureBin = sodium.crypto_sign_detached(
            messageBin,
            privateKeyBin
        );
        return sodium.to_base64(signatureBin);
    },

    /**
     * Verifies a signature with a public key
     * @param {string} message - The message to verify (string)
     * @param {string} signature - The signature to verify (base64)
     * @param {string} publicKey - The public key to verify with (base64)
     * @returns {boolean} - True if the signature is valid, false otherwise
     */
    async verify(message, signature, publicKey) {
        await sodium.ready;
        const messageBin = sodium.from_string(message);
        const signatureBin = sodium.from_base64(signature);
        const publicKeyBin = sodium.from_base(publicKey);
        return sodium.crypto_sign_verify_detached(
            signatureBin,
            messageBin,
            publicKeyBin
        );
    },
};
