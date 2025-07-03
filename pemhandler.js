import fs from "fs";

const pem2raw = (pemFile) => {
    return pemFile
        .replace("-----BEGIN PUBLIC KEY-----\n", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replaceAll("\n", "");
};

const raw2pem = (rawFile) => {
    return `-----BEGIN PUBLIC KEY-----\n${rawFile
        .match(/.{1,64}/g)
        .join("\n")}\n-----END PUBLIC KEY-----`;
};

const direction = process.argv[2];
const keyFile = process.argv[3];

const key = fs.readFileSync(keyFile, "utf8");

if (direction === "raw") {
    console.log(pem2raw(key));
} else if (direction === "pem") {
    console.log(raw2pem(key));
} else {
    console.error("Usage: node pemhandler.js <raw|pem> <key>");
    process.exit(1);
}
