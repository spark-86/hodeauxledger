import sodium from "libsodium-wrappers";

let initialized = false;

export async function getSodium() {
    if (!initialized) {
        await sodium.ready;
        console.log("Sodium ready?: ", sodium.ready);
        initialized = true;
    }
    return sodium;
}
