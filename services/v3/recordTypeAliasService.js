import { Alias } from "./aliasService";

export const RecordTypeAlias = {
    async process(record) {
        switch (record.record_type) {
        }
    },

    async add(record) {
        // TODO: This needs to check to make sure the fucking record exists
        await Alias.add(record.scope, record.data.name, record.data.target);
    },

    async remove(record) {
        await Alias.remove(record.scope, record.data.name);
    },
};
