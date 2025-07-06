const ledgerPath = process.env.LEDGER_PATH || "/ledger";

export const Read = {
    async scope(scope, record_type = "") {
        console.log("Reading scope:", scope);

        // See if we have the genesis, if we don't, we prolly
        // aren't an authority lol
        if (!fs.existsSync(`${ledgerPath}/${scope}/genesis.json`))
            throw new Error("Scope not found");

        const genesis = JSON.parse(
            fs.readFileSync(`${ledgerPath}/${scope}/genesis.json`, "utf8")
        );

        let done = false;
        let currentHash = genesis.current_hash;
        const scopedRecords = [];

        while (!done) {
            if (fs.existsSync(`${ledgerPath}/${scope}/${currentHash}.json`)) {
                const block = JSON.parse(
                    fs.readFileSync(
                        `${ledgerPath}/${scope}/${currentHash}.json`,
                        "utf8"
                    )
                );
                currentHash = block.current_hash;
                if (record_type && !block.record_type.startsWith(record_type))
                    continue;
                scopedRecords.push(block);
            } else done = true;
        }
        return scopedRecords;
    },
};
