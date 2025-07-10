const policyTable = "policies";

let policyMatrix = [];

export const Policy = {
    async set(scope, policy) {
        policyMatrix[scope] = policy;
    },

    async get(scope) {
        if (policyMatrix[scope]) return policyMatrix[scope];
    },

    async flush() {
        policyMatrix = [];
    },
};
