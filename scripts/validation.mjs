import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import { trades as generatedTrades } from '../src/data/trades.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const exportDir = path.join(rootDir, 'Notion export');

const csvFile = fs.readdirSync(exportDir).find(f => f.endsWith('.csv'));
const csvContent = fs.readFileSync(path.join(exportDir, csvFile), 'utf8');
const csvParsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
const csvRecords = csvParsed.data;

let out = "";
const log = (...args) => out += args.join(" ") + "\n";
log("Validation Report");
log("Total generated trades:", generatedTrades.length);

if (generatedTrades.length !== 57) log("EXPECTED 57!");

// Calculate independent KPIs
let wins = 0;
let losses = 0;
let breakeven = 0;
let grossProfit = 0;
let grossLoss = 0;
let bestTrade = -Infinity;
let worstTrade = Infinity;

for (let t of generatedTrades) {
    if (t.pnl > 0) {
        wins++;
        grossProfit += t.pnl;
        if (t.pnl > bestTrade) bestTrade = t.pnl;
    } else if (t.pnl < 0) {
        losses++;
        grossLoss += Math.abs(t.pnl);
        if (t.pnl < worstTrade) worstTrade = t.pnl;
    } else {
        breakeven++;
    }
}

const netPnl = grossProfit - grossLoss;
const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : null;
const avgWin = wins > 0 ? (grossProfit / wins) : 0;
const avgLoss = losses > 0 ? (grossLoss / losses) : 0;
const winRate = (wins / (wins + losses)) * 100;

log("--- KPI ---");
log("Total Trades:", generatedTrades.length);
log("Wins:", wins);
log("Losses:", losses);
log("BE:", breakeven);
log("Win Rate:", winRate.toFixed(2), "%");
log("Net PnL:", netPnl);
log("Gross Profit:", grossProfit);
log("Gross Loss:", grossLoss);
log("Profit Factor:", profitFactor);
log("Best:", bestTrade);
log("Worst:", worstTrade);
log("Avg Win:", avgWin);
log("Avg Loss:", avgLoss);
log("-----------");

// Cross check specific records
const indicesToCheck = [0, 9, 19, 29, 39, 49, 56]; // 0-based for 1, 10, 20, 30, 40, 50, 57
log("CROSS-CHECK TRADES");

for (let i of indicesToCheck) {
    const trade = generatedTrades[i];
    // Find the original CSV exact match
    // we matched previously during build by scoring. I will just find by Date and Pair exact matches.
    const csvMatches = csvRecords.filter(c => c['DATE'].substring(0, 10) === trade.date.substring(0, 10));
    const closest = csvMatches.find(c => {
        const cPnlFloat = parseFloat((c['Net P&L'] || c['Net P&L '] || '').replace(/[^0-9.-]/g, ''));
        return Math.abs(cPnlFloat - trade.pnl) < 1;
    });

    log(`\nTrade ID: ${trade.id} (Generated pos: ${i + 1})`);
    if (!closest) {
        log("COULD NOT FIND CLOSEST IN CSV!", trade.date);
        continue;
    }

    let mismatches = [];
    if (normalize(closest['PAIR ']) !== trade.pair) mismatches.push('pair');
    if (normalize(closest['DATE']) !== trade.date) mismatches.push('date');
    if (parseFloat(normalize(closest['Entry'])) !== trade.entry && !isNaN(parseFloat(normalize(closest['Entry'])))) mismatches.push('entry');

    const pnlFloat = parseFloat(normalize(closest['Net P&L']).replace(/[^0-9.-]/g, '')) || 0;
    if (pnlFloat !== trade.pnl) mismatches.push('pnl');

    if (mismatches.length > 0) {
        log("MISMATCHES FOUND:", mismatches.join(", "));
    } else {
        log("Core CSV fields matched perfectly.");
    }
    log(`Images length: ${trade.images.length}`);
}

function normalize(str) {
    return (str || '').trim();
}

const pubFiles = fs.readdirSync(path.join(rootDir, 'public', 'trades'));
log("Total public images:", pubFiles.length);

fs.writeFileSync('val.txt', out);
