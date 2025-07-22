const genesisEpochMs = 1234;

export function gtToUnixMs(gtFloat) {
    const TURN_MS = 86164090;

    const delta = gtFloat * TURN_MS;

    return Math.floor(genesisEpochMs + delta);
}

export function unixMsToGt(unixMs) {
    const TURN_MS = 86164090;

    const deltaMs = unixMs - genesisEpochMs;
    const gtFloat = deltaMs / TURN_MS;

    return parseFloat(gtFloat.toFixed(6)); // keep it clean and human-readable
}
