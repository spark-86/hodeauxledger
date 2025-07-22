export const HandlerScope = {
    async process(record) {
        switch (record.record_type) {
            case "scope:create":
                await this.create(record);
                break;
            case "scope:seal":
                await this.seal(record);
                break;
        }
    },
    async create(record) {},

    async seal(record) {},
};
