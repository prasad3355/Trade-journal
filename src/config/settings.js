export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS = {
    trading: {
        defaultInstrument: "",
        defaultAssetClass: "FOREX",
        defaultDirection: "LONG",
        defaultTimeframe: "CURRENT",
        defaultRisk: "HALF",
        defaultConfidence: "HIGH",
        defaultEmotion: "CALM",
        defaultPreTradeBias: "NEUTRAL",
        defaultSetup: "",
        defaultExitLogic: "MANUAL CLOSE"
    },
    instruments: {
        quickSelect: [
            "XAUUSD",
            "NAS100",
            "US30",
            "BTCUSD",
            "EURUSD",
            "GBPUSD"
        ]
    },
    display: {
        compactMode: false,
        showAdvancedMetrics: true
    }
};
