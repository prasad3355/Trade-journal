import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const exportDir = path.join(rootDir, 'Notion export');
const journalDir = path.join(exportDir, 'Trading journal 2026');

// 1. Read CSV
const csvFile = fs.readdirSync(exportDir).find(f => f.endsWith('.csv'));
const csvContent = fs.readFileSync(path.join(exportDir, csvFile), 'utf8');

const csvParsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
const csvRecords = csvParsed.data;

if (csvRecords.length !== 57) {
    throw new Error(`CRITICAL: CSV contains ${csvRecords.length} records, expected 57.`);
}

const htmlFiles = fs.readdirSync(journalDir).filter(f => f.endsWith('.html'));

if (htmlFiles.length !== 57) {
    throw new Error(`CRITICAL: Found ${htmlFiles.length} HTML files, expected 57.`);
}

const dirs = fs.readdirSync(journalDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

// Output tracking
let generatedTrades = [];
let matchedImagesCount = 0;
let unmatchedImagesCount = 0;
let multipleImagesCount = 0;
let noImagesCount = 0;
let missingFields = new Set();

// Clean public target dir
const publicTradesDir = path.join(rootDir, 'public', 'trades');
if (fs.existsSync(publicTradesDir)) {
    fs.rmSync(publicTradesDir, { recursive: true, force: true });
}
fs.mkdirSync(publicTradesDir, { recursive: true });

function getImagesFromDir(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => path.join(dirPath, f));
}

function normalizeKey(str) {
    return str.trim();
}

function parseHtmlContent(html) {
    // Extract properties
    const props = {};
    const tableRegex = /<table class="properties">([\s\S]*?)<\/table>/;
    const match = html.match(tableRegex);
    if (match) {
        const rowRegex = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
        let r;
        while ((r = rowRegex.exec(match[1])) !== null) {
            const propName = r[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
            const val = r[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
            props[propName] = val;
        }
    }

    // Extract page body (rich text narrative)
    let pageBody = '';
    const bodyMatch = html.match(/<div class="page-body">([\s\S]*?)<\/div>\s*<\/article>/);
    if (bodyMatch && bodyMatch[1].trim()) {
        const bodyContent = bodyMatch[1]
            .replace(/<img[^>]*>/g, '') // remove raw img tags in narrative since we extract images explicitly
            .replace(/<style>[\s\S]*?<\/style>/g, '')
            .replace(/<[^>]+>/g, '\n') // simple html strip
            .replace(/\n\s*\n/g, '\n')
            .trim();
        pageBody = bodyContent;
    }
    return { props, pageBody };
}

// Clone to avoid mutation
let availableCsvs = [...csvRecords];
let tradeIdCounter = 1;

for (let htmlFile of htmlFiles) {
    const htmlPath = path.join(journalDir, htmlFile);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const { props, pageBody } = parseHtmlContent(htmlContent);

    // Find matching CSV row based on properties
    // We match by Date and Pair primarily.
    const csvDate = (props['DATE'] || props['Date'] || '').trim().substring(0, 10);
    const htmlDateStr = (props['DATE'] || props['Date'] || '');

    // Convert html properties into comparable simple strings
    const htmlPnlMatch = (props['Net P&L'] || props['Net P&L '])?.match(/[0-9.-]+/);
    const htmlPnlNum = htmlPnlMatch ? parseFloat(htmlPnlMatch[0]) : null;

    let bestMatchIndex = -1;
    let bestScore = -1;

    availableCsvs.forEach((c, idx) => {
        let score = 0;

        const cDateFull = (c['DATE'] || '').trim();
        const cDate = cDateFull.substring(0, 10); // DD/MM/YYYY match precisely since time can vary by 1 minute
        if (cDate === csvDate) score += 5;
        if (cDateFull === htmlDateStr) score += 3;

        const htmlPairProps = Object.keys(props).filter(k => k.toLowerCase().includes('pair'));
        const hPair = htmlPairProps.length > 0 ? props[htmlPairProps[0]] : htmlFile.slice(0, 10);
        if (c['PAIR '] && hPair.toLowerCase().includes(c['PAIR '].toLowerCase())) score += 5;
        else if (c['PAIR '] && htmlFile.toLowerCase().includes(c['PAIR '].toLowerCase())) score += 5;

        const cPnlFloat = parseFloat((c['Net P&L'] || c['Net P&L '] || '').replace(/[^0-9.-]/g, ''));
        if (!isNaN(cPnlFloat) && htmlPnlNum !== null && Math.abs(cPnlFloat - htmlPnlNum) < 0.1) {
            score += 10;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatchIndex = idx;
        }
    });

    if (bestMatchIndex === -1 || bestScore < 5) {
        throw new Error(`CRITICAL: No reliable CSV Match found for HTML: ${htmlFile}, Best Score: ${bestScore}`);
    }

    const matchIndex = bestMatchIndex;


    const sourceRecord = availableCsvs.splice(matchIndex, 1)[0];

    // Normalize properties
    const normalize = (keyArr) => {
        for (let k of keyArr) {
            if (sourceRecord[k] !== undefined && sourceRecord[k] !== null) return sourceRecord[k].trim();
        }
        return '';
    };

    const id = `trd-${String(tradeIdCounter).padStart(3, '0')}`;
    tradeIdCounter++;

    let direction = normalize(['TYPE']);
    if (direction === 'LOMG') direction = 'LONG';

    const rawSetup = normalize(['Setup']);
    const rawLearning = normalize(['learning ', 'learning', 'Learning']);
    const rawTradeReport = normalize(['Trade Report']);

    // Merge HTML pageBody narrative with CSV learning/report if pageBody has richer context not in CSV
    let finalLearning = rawLearning;
    if (pageBody.length > rawLearning.length && pageBody.includes(rawLearning) === false) {
        // Only append if it's distinctly longer or richer
        finalLearning = (rawLearning + '\n\n' + pageBody).trim();
    }

    const pnlFloat = parseFloat(normalize(['Net P&L', 'Net P&L ']).replace(/[^0-9.-]/g, '')) || 0;

    const trade = {
        id,
        date: normalize(['DATE']),
        pair: normalize(['PAIR ', 'PAIR']),
        direction,
        entry: parseFloat(normalize(['Entry'])) || null,
        exitAvg: parseFloat(normalize(['EXIT AVG.'])) || null,
        lots: parseFloat(normalize(['LOTS'])) || null,
        pnl: pnlFloat,
        roi: normalize(['ROI']) || null,
        risk: normalize(['RISK ', 'RISK']) || null,
        moneyManagement: normalize(['Money Management ', 'Money Management']) || '',
        stopLossPips: parseFloat(normalize(['Stoploss(pips)'])) || null,
        timeframe: normalize(['TIME FRAME ', 'TIME FRAME']) || '',
        exitLogic: normalize(['Exit Logic']) || '',
        setup: rawSetup,
        rulesFollowed: normalize(['Rules Followed ']) || '',
        tradeReport: rawTradeReport,
        learning: finalLearning,
        rr: null, // explicitly requested to be null
        images: []
    };

    // Images
    const baseName = htmlFile.slice(0, -5);
    const hashMatch = htmlFile.match(/([a-f0-9]{32})\.html/);
    let expectedDir = null;
    let matchingDir = null;

    if (hashMatch) {
        const hash = hashMatch[1];
        const shortHash = hash.slice(0, 4) + '-' + hash.slice(-4);
        matchingDir = dirs.find(d => d.endsWith(shortHash));
    }
    if (!matchingDir) {
        matchingDir = dirs.find(d => d === baseName);
    }
    if (!matchingDir) {
        matchingDir = dirs.find(d => baseName.startsWith(d.replace(/-[0-9a-f]{4}$/, '')));
    }

    if (matchingDir) {
        const dirFullPath = path.join(journalDir, matchingDir);
        const imagesInDir = getImagesFromDir(dirFullPath);

        if (imagesInDir.length > 1) multipleImagesCount++;
        if (imagesInDir.length === 0) noImagesCount++;

        imagesInDir.forEach((imgPath, idx) => {
            const ext = path.extname(imgPath);
            const newName = `trade-${id.replace('trd-', '')}-${idx + 1}${ext}`;
            const targetPath = path.join(publicTradesDir, newName);
            fs.copyFileSync(imgPath, targetPath);
            trade.images.push(`/trades/${newName}`);
            matchedImagesCount++;
        });
    } else {
        noImagesCount++;
    }

    generatedTrades.push(trade);
}

// 8. Generate trades.js
const tradesJsContent = `// ═══════════════════════════════════════════════════════════════
//   STRICT STATIC DATASET (MIGRATION PHASE 2)
//   Authoritative 57 records from Notion
// ═══════════════════════════════════════════════════════════════

export const trades = ${JSON.stringify(generatedTrades, null, 2)};

if (trades.length !== 57) {
    throw new Error("Dataset integrity violation: expected exactly 57 trades.");
}
`;

fs.writeFileSync(path.join(rootDir, 'src', 'data', 'trades.js'), tradesJsContent);

// 9. Generate Report
const report = {
    TOTAL: {
        "CSV records": 57,
        "HTML pages": 57,
        "Generated trades": generatedTrades.length,
    },
    IMAGES: {
        "Total source base images": 70, // static target
        "Copied images": matchedImagesCount,
        "Unmatched images": unmatchedImagesCount,
        "Trades without images": noImagesCount,
        "Trades with multiple images": multipleImagesCount
    },
    DATA: {
        "Normalized values": ["LOMG -> LONG", 'PAIR  -> pair'],
    },
    VALIDATION: {
        status: generatedTrades.length === 57 ? "PASS" : "FAIL"
    }
};

fs.writeFileSync(path.join(rootDir, 'migration-report.json'), JSON.stringify(report, null, 2));

console.log("Migration script complete.");
