export const Append = {
    async execute(data) {
        if (!data.record_type) throw new Error("No record type provided");
    },
};
