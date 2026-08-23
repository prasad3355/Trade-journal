import Papa from "papaparse";
import * as XLSX from "xlsx";

// -----------------------------------------------------------------------------
// CONSTANTS & SCHEMAS
// -----------------------------------------------------------------------------
export const JOURNAL_FIELDS = [
    { key: "id", label: "Trade ID" },
    { key: "pair", label: "Instrument", required: true },
    { key: "direction", label: "Direction", required: true },
    { key: "date", label: "Date / Time", required: true },
    { key: "entry", label: "Entry Price", type: "number" },
    { key: "exit", label: "Exit Price", type: "number" },
    { key: "stopLoss", label: "Stop Loss", type: "number" },
    { key: "target", label: "Target", type: "number" },
    { key: "lots", label: "Size (Lots)", type: "number" },
    { key: "pnl", label: "Net P&L", type: "number" },
    { key: "rr", label: "R-Multiple", type: "number" },
    { key: "session", label: "Session" },
    { key: "timeframe", label: "Timeframe" },
    { key: "setup", label: "Setup" },
    { key: "emotion", label: "Emotion" },
    { key: "confidence", label: "Confidence" },
    { key: "rulesFollowed", label: "Rules Adhered" },
    { key: "thesis", label: "Pre-Trade Thesis" },
    { key: "learning", label: "Post-Trade Learning" },
];

const KNOWN_MAP = {
    "trade id": "id", id: "id", trade: "id",
    symbol: "pair", ticker: "pair", instrument: "pair", pair: "pair", asset: "pair",
    direction: "direction", side: "direction", position: "direction", type: "direction",
    date: "date", time: "date", datetime: "date", "trade date": "date", "execution date": "date",
    entry: "entry", "entry price": "entry", "avg entry": "entry",
    exit: "exit", "exit price": "exit", "close price": "exit",
    stoploss: "stopLoss", sl: "stopLoss", "stop loss": "stopLoss", stop: "stopLoss",
    target: "target", "take profit": "target", tp: "target",
    lots: "lots", size: "lots", quantity: "lots", qty: "lots", amount: "lots", "position size": "lots",
    pnl: "pnl", profit: "pnl", "net pnl": "pnl", "net profit": "pnl", return: "pnl",
    r: "rr", "r multiple": "rr", rr: "rr", "risk reward": "rr",
    session: "session", "trading session": "session",
    timeframe: "timeframe", tf: "timeframe",
    setup: "setup", strategy: "setup", "trade setup": "setup",
    emotion: "emotion", feeling: "emotion", state: "emotion",
    confidence: "confidence", conviction: "confidence",
    rules: "rulesFollowed", "rules followed": "rulesFollowed", "rules adhered": "rulesFollowed",
    thesis: "thesis", "pre-trade bias": "thesis", reason: "thesis", notes: "thesis", journal: "thesis", comment: "thesis", "trade notes": "thesis",
    learning: "learning", lessons: "learning", "post-trade learning": "learning"
};

// -----------------------------------------------------------------------------
// NORMALIZE HEADERS
// -----------------------------------------------------------------------------
export function autoMapHeaders(headers) {
    const mapping = {};
    headers.forEach(h => {
        const clean = String(h).trim().toLowerCase();
        if (KNOWN_MAP[clean]) {
            mapping[h] = KNOWN_MAP[clean];
        } else {
            mapping[h] = "";
        }
    });
    return mapping;
}

// -----------------------------------------------------------------------------
// NORMALIZE DATA
// -----------------------------------------------------------------------------
function normalizeNumber(val) {
    if (val == null || val === "") return "";
    if (typeof val === "number") return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, ""); // strip $, R, commas
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? val : parsed; // keep original if invalid so it flags
}

function normalizeDirection(val) {
    if (!val) return "";
    const s = String(val).toUpperCase().trim();
    if (s.includes("LONG") || s.includes("BUY")) return "LONG";
    if (s.includes("SHORT") || s.includes("SELL")) return "SHORT";
    return s;
}

function normalizeDate(val) {
    if (!val) return "";
    // Check if it's Excel serial number
    if (typeof val === "number") {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(epoch.getTime() + val * 86400000).toISOString();
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
    return val; // fallback format
}

// -----------------------------------------------------------------------------
// PARSING
// -----------------------------------------------------------------------------
export async function parseSpreadsheet(file) {
    return new Promise((resolve, reject) => {
        const extension = file.name.split(".").pop().toLowerCase();

        if (extension === "csv") {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve({
                        headers: results.meta.fields || [],
                        rows: results.data
                    });
                },
                error: (err) => reject(err)
            });
        } else if (["xls", "xlsx"].includes(extension)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheet = workbook.SheetNames[0];
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { raw: false, defval: "" });
                    if (rows.length === 0) resolve({ headers: [], rows: [] });
                    else resolve({ headers: Object.keys(rows[0]), rows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error("Unsupported file format. Please upload .csv or .xlsx"));
        }
    });
}

// -----------------------------------------------------------------------------
// VALIDATION MAPPER
// -----------------------------------------------------------------------------
export function mapAndValidateRows(rawRows, mapping, existingTrades) {
    const results = [];
    let summary = { valid: 0, warning: 0, invalid: 0, new: 0, duplicate: 0 };

    rawRows.forEach((row, rowIndex) => {
        const defaultId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
        const trade = { id: row.id || defaultId };
        const messages = [];
        let isInvalid = false;
        let isWarning = false;

        // Apply mapping & basic normalization
        Object.keys(mapping).forEach(rawKey => {
            const targetKey = mapping[rawKey];
            if (targetKey) {
                let val = row[rawKey];

                // If the incoming value is boolean/object/array, coercing to simple string for cleanup
                // Often helps with Notion checklists / multiselects exported to CSV.
                if (typeof val === 'boolean') {
                    val = val ? 'Yes' : 'No';
                }

                if (["entry", "exit", "stopLoss", "target", "lots", "pnl", "rr"].includes(targetKey)) {
                    val = normalizeNumber(val);
                } else if (targetKey === "direction") {
                    val = normalizeDirection(val);
                } else if (targetKey === "date") {
                    val = normalizeDate(val);
                } else if (targetKey === "id") {
                    if (val && String(val).trim() !== "") {
                        trade.id = String(val).trim();
                    }
                }

                if (targetKey !== "id") {
                    trade[targetKey] = val;
                }
            }
        });

        // Validations
        if (!trade.pair) {
            isInvalid = true; messages.push("Missing instrument/pair.");
        }

        if (trade.direction !== "LONG" && trade.direction !== "SHORT") {
            isWarning = true; messages.push("Direction is arbitrary or unmapped (expected LONG/SHORT).");
        }

        if (!trade.date || isNaN(Date.parse(trade.date))) {
            // If we couldn't parse the date properly, it's a structural failure warning
            isInvalid = true; messages.push("Missing or malformed date.");
        }

        ["pnl", "entry", "exit"].forEach(key => {
            if (trade[key] && typeof trade[key] !== "number") {
                isWarning = true; messages.push(`Malformed number in ${key}.`);
            }
        });

        // Duplicates check
        let dupStatus = "NEW";
        if (existingTrades.some(t => t.id === trade.id)) {
            dupStatus = "HARD_DUP";
        } else {
            const inTime = new Date(trade.date).getTime();
            const isSoft = existingTrades.some(t => {
                const tTime = new Date(t.date).getTime();
                const timeDiff = Math.abs(tTime - inTime);
                let entryMatches = true;
                if (t.entry != null && trade.entry != null && t.entry !== "" && trade.entry !== "") {
                    entryMatches = (t.entry === trade.entry);
                }
                return timeDiff <= 60000 && t.pair === trade.pair && t.direction === trade.direction && entryMatches;
            });
            if (isSoft) dupStatus = "SOFT_DUP";
        }

        if (dupStatus === "HARD_DUP" || dupStatus === "SOFT_DUP") {
            summary.duplicate++;
        } else {
            summary.new++;
        }

        let itemStatus = isInvalid ? "INVALID" : (isWarning ? "WARNING" : "VALID");

        if (itemStatus === "INVALID") summary.invalid++;
        else if (itemStatus === "WARNING") summary.warning++;
        else summary.valid++;

        results.push({
            originalRowIndex: rowIndex,
            trade,
            status: itemStatus,
            messages,
            dupStatus
        });
    });

    return { results, summary };
}

// -----------------------------------------------------------------------------
// EXPORTING
// -----------------------------------------------------------------------------
export function exportTradesToCSV(trades) {
    // Strip unnecessary complex data (images array if present) and flatten
    const data = trades.map(t => {
        let flattened = { ...t };
        delete flattened.images;
        delete flattened.image;
        return flattened;
    });

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportTradesToExcel(trades) {
    const data = trades.map(t => {
        let flattened = { ...t };
        delete flattened.images;
        delete flattened.image;
        return flattened;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");

    // Custom styling to adjust column widths safely
    const maxWidths = [20, 20, 15, 10, 10, 10, 15, 30, 40];
    worksheet["!cols"] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `trades-export-${new Date().toISOString().split('T')[0]}.xlsx`);
}
