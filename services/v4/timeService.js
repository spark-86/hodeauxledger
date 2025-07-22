let epochUnixMs = 1752941587614;

export const MICROS_PER_TURN = 86_164_090_500n;
export const MICROMARKS_PER_TURN = 1_000_000_000n;

export const Time = {
    gtToUnixMs(gt) {
        const microsFromTurns = gt.turns * MICROS_PER_TURN;
        const microsFromMicromarks =
            (gt.micromarks * MICROS_PER_TURN) / MICROMARKS_PER_TURN;

        const totalMicros = microsFromTurns + microsFromMicromarks;
        const unixMs = totalMicros / 1_000n + BigInt(epochUnixMs);

        return unixMs;
    },

    gtToFloat(gt) {
        return Number(gt.turns) + Number(gt.micromarks) / 1_000_000_000;
    },
    gtToString(gt) {
        return `GT[${gt.turns}.${gt.micromarks.toString().padStart(9, "0")}]`;
    },
    unixMsToGT(unixMs) {
        const microsSinceEpoch = BigInt(unixMs - epochUnixMs) * 1_000n;

        const turns = microsSinceEpoch / MICROS_PER_TURN;
        const remainingMicros = microsSinceEpoch % MICROS_PER_TURN;

        const micromarks =
            (remainingMicros * MICROMARKS_PER_TURN) / MICROS_PER_TURN;

        return {
            turns,
            micromarks,
        };
    },
    unixMsToMicro(unixMs) {
        const microsSinceEpoch = BigInt(unixMs - epochUnixMs) * 1_000n;
        const micromarks =
            (microsSinceEpoch * MICROMARKS_PER_TURN) / MICROS_PER_TURN;
        return micromarks;
    },

    micromarksToUnixMs(micromarks, epochMs = 0) {
        const MICROS_PER_TURN = 86_164_090_500n;
        const MICROMARKS_PER_TURN = 1_000_000_000n;

        const totalMicros =
            (BigInt(micromarks) * MICROS_PER_TURN) / MICROMARKS_PER_TURN;
        return Number(totalMicros / 1_000n) + epochMs;
    },
    setEpoch(epoch) {
        epochUnixMs = epoch;
    },
};
