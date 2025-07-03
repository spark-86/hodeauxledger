export const generateBase32 = (length) => {
    const characters = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }
    return result;
};

export const hex2base32 = (hexString) => {
    const base32Chars = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
    let base32String = "";
    let bits = 0;
    let value = 0;

    for (let i = 0; i < hexString.length; i++) {
        value = (value << 4) | parseInt(hexString[i], 16);
        bits += 4;

        while (bits >= 5) {
            bits -= 5;
            base32String += base32Chars[(value >> bits) & 0x1f];
        }
    }

    if (bits > 0) {
        base32String += base32Chars[(value << (5 - bits)) & 0x1f];
    }

    return base32String;
};
