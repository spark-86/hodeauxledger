export const keyClean = (key) => {
    return key
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replaceAll("\n", "");
};

export const keyFormat = (raw) => {
    const base64 = raw.replace(/[\r\n]/g, "").trim();
    const lines = base64.match(/.{1,64}/g) ?? [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join(
        "\n"
    )}\n-----END PUBLIC KEY-----\n`;
};
