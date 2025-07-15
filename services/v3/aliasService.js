let aliasTable = [];

export const Alias = {
    async add(scope, name, hash) {
        aliasTable.push({ scope, name, hash });
    },

    async remove(scope, name) {
        aliasTable = aliasTable.filter((alias) => {
            return !(alias.scope === scope && alias.name === name);
        });
    },

    async table() {
        return aliasTable;
    },

    async isAlias(scope, name) {
        return aliasTable.find((alias) => {
            return alias.scope === scope && alias.name === name;
        });
    },

    async getHash(scope, name) {
        return aliasTable.find((alias) => {
            return alias.scope === scope && alias.name === name;
        }).hash;
    },

    async getScope(hash) {
        return aliasTable.find((alias) => {
            return alias.hash === hash;
        }).scope;
    },
};
