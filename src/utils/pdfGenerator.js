import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { formatCurrency, formatSigned, formatNumber, formatDate } from "./formatters";
import { performanceSummary } from "./analytics";
import { getTradeImages } from "./idb";

if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
}

const COLORS = {
    bg: '#0F1115',      // obsidiandark (but for PDF, white bg is better, we'll invert for printable readability)
    text: '#1C1E23',
    muted: '#5F6368',
    primary: '#286EFA',
    positive: '#20C997',
    negative: '#FF6B6B',
    breakeven: '#A0AEC0',
    border: '#E2E8F0',
    panel: '#F7FAFC'
};

const getTradeColor = (pnl) => {
    if (pnl > 0) return COLORS.positive;
    if (pnl < 0) return COLORS.negative;
    return COLORS.breakeven;
};

// Convert Blob to Base64 specifically just for PDF generation mapping.
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export async function generateTradingJournalPDF({ trades, pdfRange, pdfImageSize, onProgress }) {
    onProgress && onProgress("Filtering dataset...");

    // 1. FILTERING
    const now = new Date();
    let filtered = [...trades];
    let titleStr = "Complete Trading Journal";

    if (pdfRange === "CURRENT_MONTH") {
        filtered = trades.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        titleStr = `${now.toLocaleString('default', { month: 'long', year: 'numeric' })} Trading Report`;
    } else if (pdfRange === "CURRENT_WEEK") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filtered = trades.filter(t => new Date(t.date) >= weekAgo);
        titleStr = "7-Day Trading Report";
    }

    // Ensure chronological order (oldest to newest makes sense for reading, or newest first?)
    // Let's do newest first (default).
    const sortedTrades = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. STATISTICS
    onProgress && onProgress("Computing analytics...");
    const stats = performanceSummary(sortedTrades);

    // Custom Max Drawdown (Simple static peak-to-trough array calculation)
    let peak = 0;
    let maxDd = 0;
    let running = 0;
    // Sort oldest to newest specifically for DD mapping
    [...sortedTrades].reverse().forEach(t => {
        running += (Number(t.pnl) || 0);
        if (running > peak) peak = running;
        const dd = peak - running;
        if (dd > maxDd) maxDd = dd;
    });

    const avgTrade = stats.total > 0 ? stats.netRealized / stats.total : 0;

    // 3. DOCUMENT MAP
    onProgress && onProgress("Structuring pages...");

    const content = [];

    // --- PAGE 1: COVER & SUMMARY ---
    content.push(
        { text: "TRADE JOURNAL", style: "headline", margin: [0, 20, 0, 5] },
        { text: titleStr.toUpperCase(), style: "subheadline", margin: [0, 0, 0, 30] },
        {
            text: `Date Range: ${sortedTrades.length ? formatDate(sortedTrades[sortedTrades.length - 1].date, true) : 'N/A'} - ${sortedTrades.length ? formatDate(sortedTrades[0].date, true) : 'N/A'}`,
            style: "muted",
            margin: [0, 0, 0, 40]
        }
    );

    content.push({
        layout: 'lightHorizontalLines',
        table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
                [
                    { text: 'KEY PERFORMANCE', colSpan: 4, style: 'tableHeader', alignment: 'center' }, {}, {}, {}
                ],
                [
                    { text: 'Total Trades', style: 'muted' },
                    { text: stats.total.toString(), style: 'value' },
                    { text: 'Win Rate', style: 'muted' },
                    { text: `${stats.winRate.toFixed(1)}%`, style: 'value' }
                ],
                [
                    { text: 'Net P&L', style: 'muted' },
                    { text: formatSigned(formatCurrency(stats.netRealized)), style: 'value', color: getTradeColor(stats.netRealized) },
                    { text: 'Profit Factor', style: 'muted' },
                    { text: stats.profitFactor, style: 'value' }
                ],
                [
                    { text: 'Average R', style: 'muted' },
                    { text: stats.avgR || '0.00', style: 'value' },
                    { text: 'Max Drawdown', style: 'muted' },
                    { text: formatCurrency(maxDd), style: 'value', color: COLORS.negative }
                ],
                [
                    { text: 'Avg Trade P&L', style: 'muted' },
                    { text: formatSigned(formatCurrency(avgTrade)), style: 'value', color: getTradeColor(avgTrade) },
                    { text: 'Largest Win', style: 'muted' },
                    { text: stats.best ? formatCurrency(stats.best.pnl) : '$0.00', style: 'value', color: COLORS.positive }
                ]
            ]
        },
        margin: [0, 0, 0, 40]
    });

    if (sortedTrades.length > 0) {
        content.push({ text: "EXECUTION LOG", style: "sectionTitle", pageBreak: 'before' });
    }

    // --- TRADES LOOP ---
    let processedCount = 0;
    for (const t of sortedTrades) {
        processedCount++;
        onProgress && onProgress(`Loading screenshots... (${processedCount}/${sortedTrades.length})`);

        const resColor = getTradeColor(t.pnl);

        // Trade Header Block
        content.push({
            unbreakable: true,
            margin: [0, 20, 0, 10],
            stack: [
                {
                    canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, color: resColor }] // Accent bar
                },
                {
                    columns: [
                        { width: '*', text: `${t.pair} | ${t.direction}`, style: 'tradeTitle', margin: [0, 5, 0, 0] },
                        { width: 'auto', text: formatDate(t.date, false), style: 'muted', margin: [0, 8, 0, 0], alignment: 'right' }
                    ]
                },
                {
                    columns: [
                        { width: '*', text: `Session: ${(t.session || 'UNKNOWN').replace('_', ' ')}  •  Asset: ${t.assetClass || 'N/A'}`, style: 'muted' },
                        { width: 'auto', text: `Result: ${formatSigned(formatCurrency(t.pnl))} (${t.rr ? formatNumber(t.rr) : 0}R)`, style: 'value', color: resColor }
                    ]
                }
            ]
        });

        // Execution & Psychology Info (2 columns)
        content.push({
            unbreakable: true,
            margin: [0, 5, 0, 10],
            columns: [
                {
                    width: '50%',
                    stack: [
                        { text: 'EXECUTION DATAPOINTS', style: 'tinyLabel', margin: [0, 0, 0, 4] },
                        { text: `Entry: ${t.entry || '—'}`, style: 'mono' },
                        { text: `Target: ${t.target || '—'}`, style: 'mono' },
                        { text: `Stop Loss: ${t.stopLoss || '—'}`, style: 'mono' },
                        { text: `Exit: ${t.exit || '—'}`, style: 'mono' },
                        { text: `Size: ${t.lots || '—'} Lots`, style: 'mono' }
                    ]
                },
                {
                    width: '50%',
                    stack: [
                        { text: 'CONTEXT & PSYCHOLOGY', style: 'tinyLabel', margin: [0, 0, 0, 4] },
                        { text: `Setup: ${t.setup || '—'}`, style: 'mono' },
                        { text: `Timeframe: ${t.timeframe || '—'}`, style: 'mono' },
                        { text: `Emotion: ${t.emotion || '—'}`, style: 'mono' },
                        { text: `Confidence: ${t.confidence || '—'}`, style: 'mono' },
                        { text: `Rules Adhered: ${t.rulesFollowed || '—'}`, style: 'mono' },
                    ]
                }
            ]
        });

        // Thesis & Learning (Text blocks wrap naturally)
        if (t.thesis) {
            content.push({
                unbreakable: true,
                margin: [0, 5, 0, 5],
                stack: [
                    { text: 'PRE-TRADE THESIS', style: 'tinyLabel', margin: [0, 0, 0, 2] },
                    { text: t.thesis, style: 'body' }
                ]
            });
        }

        if (t.learning) {
            content.push({
                unbreakable: true,
                margin: [0, 5, 0, 5],
                stack: [
                    { text: 'AFTER-ACTION REVIEW', style: 'tinyLabel', margin: [0, 0, 0, 2] },
                    { text: t.learning, style: 'body' }
                ]
            });
        }

        // Screenshots (LAZY GENERATED)
        let b64Images = [];
        try {
            // Only resolve from IDB strictly needed for this document loop to keep memory controlled.
            const rawBlobs = await getTradeImages(t.id);
            for (const r of rawBlobs) {
                const b64 = await blobToBase64(r.data);
                b64Images.push(b64);
            }
        } catch (err) {
            console.warn("Failed to load PDF image blobs for trade", t.id);
        }

        if (b64Images.length > 0) {
            const imgWidth = pdfImageSize === "COMPACT" ? 250 : pdfImageSize === "LARGE" ? 515 : 380;
            content.push({
                text: 'VISUAL PROOF', style: 'tinyLabel', margin: [0, 10, 0, 5]
            });

            b64Images.forEach((b64, idx) => {
                content.push({
                    image: b64,
                    width: imgWidth,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                });
            });
        } else {
            // Handle missing gracefully
            if ((t.images && t.images.length > 0) || t.image) {
                content.push({
                    unbreakable: true,
                    margin: [0, 10, 0, 10],
                    stack: [
                        { canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 40, color: COLORS.panel }] },
                        { text: '[ VISUAL PROOF UNAVAILABLE OR EXTERNAL ]', style: 'muted', alignment: 'center', absolutePosition: { y: content.length * 10 /* rough */ } } // we will just use stack overlay instead
                    ]
                });
                // Fix stack absolute overlay:
                content.pop(); // remove buggy absolute calculation
                content.push({
                    text: '[ VISUAL PROOF UNAVAILABLE OR EXTERNAL ]',
                    alignment: 'center',
                    style: 'muted',
                    margin: [0, 10, 0, 10]
                });
            }
        }

        // Divider
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: COLORS.border }], margin: [0, 15, 0, 15] });
    }

    if (sortedTrades.length === 0) {
        content.push({ text: "No executions align with this query parameter.", style: "muted", alignment: "center", margin: [0, 40, 0, 0] });
    }

    // 4. CONSTRUCTION
    onProgress && onProgress("Generating PDF binary (this may take a moment)...");

    // Document Style Rules
    const docDefinition = {
        info: {
            title: titleStr,
            author: 'TradeFolio AI Platform',
            subject: 'Trading Report Export'
        },
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: content,
        defaultStyle: {
            font: 'Roboto',
            color: COLORS.text,
            fontSize: 10,
            lineHeight: 1.4
        },
        styles: {
            headline: { fontSize: 28, bold: true, tracking: 2, color: COLORS.primary },
            subheadline: { fontSize: 14, bold: true, color: COLORS.muted, tracking: 1 },
            sectionTitle: { fontSize: 16, bold: true, color: COLORS.text, margin: [0, 10, 0, 15], tracking: 1 },
            tradeTitle: { fontSize: 14, bold: true, color: COLORS.text },
            muted: { fontSize: 9, color: COLORS.muted },
            value: { fontSize: 10, bold: true, color: COLORS.text },
            tinyLabel: { fontSize: 8, bold: true, color: COLORS.muted, tracking: 1 },
            body: { fontSize: 9, color: COLORS.text, lineHeight: 1.5 },
            mono: { fontSize: 9, font: 'Roboto' }, // pdfmake doesn't have a default monospaced font mapped usually without custom vfs, Roboto is the robust fallback.
            tableHeader: { bold: true, fontSize: 10, color: COLORS.muted, fillColor: COLORS.panel, margin: [0, 5, 0, 5] }
        }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    // Return a promise tying the download trigger
    return new Promise((resolve) => {
        const filename = `trade-journal-report-${new Date().toISOString().split('T')[0]}.pdf`;
        pdfDocGenerator.download(filename, () => {
            resolve();
        });
    });
}
