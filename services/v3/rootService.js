let rootTable = [];

export const Root = {
    async add(data) {
        console.log("Adding root: " + data.data.name);
        rootTable.push(data.data);
    },

    async revoke(data) {
        console.log("Revoking root: " + data.data.name);
        rootTable = rootTable.filter((root) => root.name !== data.data.name);
    },

    async getByKey(key) {
        return rootTable.find((root) => root.key === key);
    },
};
