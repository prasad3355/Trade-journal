const DEFAULT_SETTINGS = {
    trading: { defaultInstrument: "", defaultAssetClass: "FOREX" },
    instruments: { quickSelect: ["A", "B", "C"] },
    display: { compactMode: false, showAdvancedMetrics: true }
};
const mergeConfig = (base, partial) => {
    if (!partial || typeof partial !== 'object') return base;
    const result = { ...base };
    for (const key of Object.keys(base)) {
        if (partial[key] !== undefined) {
            if (typeof base[key] === 'object' && !Array.isArray(base[key])) {
                result[key] = { ...base[key] };
                for (const subKey of Object.keys(base[key])) {
                    if (partial[key][subKey] !== undefined) {
                        if (Array.isArray(base[key][subKey])) {
                            result[key][subKey] = Array.isArray(partial[key][subKey]) ? partial[key][subKey] : base[key][subKey];
                        } else {
                            result[key][subKey] = partial[key][subKey];
                        }
                    }
                }
            } else if (Array.isArray(base[key])) {
                result[key] = Array.isArray(partial[key]) ? partial[key] : base[key];
            } else {
                result[key] = partial[key];
            }
        }
    }
    return result;
};

let res = mergeConfig(DEFAULT_SETTINGS, { trading: { defaultInstrument: "BTC" } });
console.log("Merge partial trading:", JSON.stringify(res.trading));

res = mergeConfig(DEFAULT_SETTINGS, { instruments: { quickSelect: ["Q"] } });
console.log("Merge array override:", JSON.stringify(res.instruments.quickSelect));

res = mergeConfig(DEFAULT_SETTINGS, "invalid string");
console.log("Merge invalid string:", res === DEFAULT_SETTINGS);

res = mergeConfig(DEFAULT_SETTINGS, { invalidKey: true, trading: { defaultInstrument: "X" } });
console.log("Merge invalid key dropped:", res.invalidKey === undefined);

console.log("SUCCESS");
