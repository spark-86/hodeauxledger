export const BlockScope = {
    async execute(record) {
        switch (record.type) {
            case "scope:create":
                await this.create(record);
                break;
            case "scope:close":
                await this.close(record);
                break;
            default:
                console.log(record.type);
                break;
        }
    },
    async create(record) {
        // TODO: create a new ledger
    },
};
