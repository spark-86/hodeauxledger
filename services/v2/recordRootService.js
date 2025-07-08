export const RecordRoot = {
    async execute(data) {
        switch (data.record_type) {
            case "root:add":
                await this.add(data);
                break;
            default:
                console.log("Unknown record type: " + data.record_type);
        }
    },

    async add(data) {
        console.log("Adding root: " + data.data.name);
        await Key.ringAdd("root", data.data.roles, data.data.key);
    },
};
