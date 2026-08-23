import fs from 'fs';
const file = 'src/pages/DataCenter.jsx';
let content = fs.readFileSync(file, 'utf8');

const jsxStart = content.indexOf('return (');
const JSX_REPLACEMENT = `return (
        <div className="flex-1 flex flex-col h-full bg-surface-canvas overflow-y-auto w-full p-4 md:p-8 pt-20 lg:pt-8 custom-scrollbar">
            <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6 animate-fade-in-up pb-12">

                <header className="flex flex-col gap-2 border-b border-border-slate pb-6">
                    <h1 className="font-headline-md text-2xl text-text-high-contrast tracking-widest font-bold">DATA & RECOVERY CENTER</h1>
                    <p className="text-text-muted text-sm font-data-mono-sm uppercase tracking-wider">Storage Verification & Archival Operations</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* STORAGE HEALTH */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm flex flex-col gap-4">
                        <h2 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest border-b border-border-slate pb-2">Storage Health</h2>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Trades</span>
                            <span className="font-data-mono-sm text-text-high-contrast">{health.trades}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Image Records</span>
                            <span className="font-data-mono-sm text-text-high-contrast">{health.images}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">DB Version</span>
                            <span className="font-data-mono-sm text-text-high-contrast">v{DB_VERSION}</span>
                        </div>
                    </section>

                    {/* DATABASE STATUS */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm flex flex-col gap-4">
                        <h2 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest border-b border-border-slate pb-2">Database Status</h2>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Database</span>
                            <span className="text-xs font-bold text-text-high-contrast">TradeFolioDB</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Storage</span>
                            <span className="text-[10px] bg-border-slate px-2 py-0.5 rounded text-text-high-contrast">LOCAL OFFLINE</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Status</span>
                            <span className={\`text-[10px] px-2 py-0.5 rounded font-bold uppercase \${dbStatus === 'HEALTHY' ? 'bg-primary/20 text-primary' : 'bg-negative/20 text-negative'}\`}>
                                {dbStatus}
                            </span>
                        </div>
                    </section>
                    
                    {/* IMAGE INTEGRITY */}
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm flex flex-col gap-4">
                        <h2 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest border-b border-border-slate pb-2">Image Integrity</h2>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Orphan Images</span>
                            <span className={\`font-data-mono-sm \${health.orphans > 0 ? 'text-warning' : 'text-text-high-contrast'}\`}>{health.orphans}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Missing References</span>
                            <span className="font-data-mono-sm text-text-high-contrast">{health.missing}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-muted">Integrity</span>
                            <span className={\`text-[10px] px-2 py-0.5 rounded font-bold uppercase \${dbStatus === 'HEALTHY' ? 'text-primary bg-primary/20' : 'text-warning bg-warning/20'}\`}>
                                {dbStatus === 'HEALTHY' ? 'PASS' : 'WARNING'}
                            </span>
                        </div>
                    </section>
                </div>

                {/* BACKUP STATUS */}
                <section className="bg-surface-panel border border-border-slate rounded-lg p-5 shadow-sm">
                    <h2 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest border-b border-border-slate pb-2 mb-4">Backup Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted">Last Full Archive</span>
                            <span className="text-xs font-data-mono-sm text-text-high-contrast">{lastBackups.zip}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted">Last JSON Export</span>
                            <span className="text-xs font-data-mono-sm text-text-high-contrast">{lastBackups.json}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-muted">Last PDF Export</span>
                            <span className="text-xs font-data-mono-sm text-text-high-contrast">{lastBackups.pdf}</span>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* CREATE FULL BACKUP */}
                    <section className="bg-surface border border-primary/40 rounded-lg overflow-hidden shadow-sm flex flex-col h-full hover:border-primary transition-colors">
                        <div className="p-5 border-b border-primary/20 bg-primary/5">
                            <h2 className="text-xs font-label-caps text-primary shadow-primary uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                                Create Full Backup
                            </h2>
                        </div>
                        <div className="p-5 flex flex-col gap-4 flex-1">
                            <p className="text-xs text-text-muted leading-relaxed">
                                Generates a complete ZIP archive preserving exact timeline parity, JSON execution schema, and raw image blobs implicitly verifying relationships safely.
                            </p>
                            <button
                                onClick={handleArchiveExport}
                                disabled={isArchiving}
                                className="mt-auto px-6 py-3 w-full text-xs font-label-caps tracking-widest uppercase bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary rounded transition-colors shadow-sm flex items-center justify-center gap-3">
                                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                                {isArchiving ? "Generating Archive..." : "Create Full ZIP Backup"}
                            </button>

                            {archiveVerify && (
                                <div className="mt-4 p-4 bg-surface-panel rounded border border-primary/30 flex flex-col gap-2 animate-fade-in-up">
                                    <h3 className="text-[10px] font-label-caps text-primary tracking-widest uppercase">Backup Verified</h3>
                                    <ul className="text-xs text-text-muted font-data-mono-sm flex flex-col gap-1">
                                        <li>✓ Schema v{archiveVerify.schemaVersion}</li>
                                        <li>✓ {archiveVerify.tradeCount} Trade Records</li>
                                        <li>✓ {archiveVerify.imageCount} Image Bindings</li>
                                        <li className="text-primary mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> ARCHIVE INTEGRITY: PASS</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* RESTORE FULL ARCHIVE */}
                    <section className="bg-surface border border-warning/40 rounded-lg overflow-hidden shadow-sm flex flex-col h-full hover:border-warning transition-colors">
                        <div className="p-5 border-b border-warning/20 bg-warning/5">
                            <h2 className="text-xs font-label-caps text-warning uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">restore</span>
                                Restore Full Archive
                            </h2>
                        </div>
                        <div className="p-5 flex flex-col gap-4 flex-1">
                            <p className="text-xs text-text-muted leading-relaxed">
                                Discards runtime memory resetting database constraints strictly to backup contents atomically. Snapshots rollback cache natively on fail.
                            </p>
                            
                            {!zipPreview ? (
                                <div className="mt-auto relative w-full h-12">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={handleZipSelect}
                                        ref={zipInputRef}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-panel border border-border-slate text-text-high-contrast text-xs font-label-caps uppercase tracking-widest rounded hover:bg-surface-hover transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                        Select ZIP Archive
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-auto bg-surface-panel border border-warning/30 p-4 rounded flex flex-col gap-4 animate-fade-in-up">
                                    <div className="flex flex-col gap-1 border-b border-border-slate/50 pb-3">
                                        <h3 className="text-[10px] text-warning uppercase tracking-widest font-label-caps">Archive Validated</h3>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                           <span className="text-xs text-text-muted">Trades:</span><span className="text-xs font-data-mono-sm text-text-high-contrast text-right">{zipPreview.backup.tradeCount}</span>
                                           <span className="text-xs text-text-muted">Images:</span><span className="text-xs font-data-mono-sm text-text-high-contrast text-right">{zipPreview.manifest.imageCount}</span>
                                           <span className="text-xs text-text-muted">DB Schema:</span><span className="text-xs font-data-mono-sm text-text-high-contrast text-right">v{zipPreview.manifest.databaseSchemaVersion}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setZipPreview(null)} className="flex-1 px-2 py-2 text-[10px] font-label-caps uppercase tracking-widest bg-surface-hover text-text-muted border border-border-slate rounded hover:text-text-high-contrast transition-colors flex justify-center items-center">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={executeZipRestore}
                                            disabled={isZipRestoring}
                                            className="flex-1 py-2 text-[10px] font-label-caps uppercase tracking-widest bg-warning hover:bg-warning/90 text-on-warning rounded flex justify-center items-center shadow-sm">
                                            {isZipRestoring ? "Restoring..." : "Restore Now"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {zipRestoreResult && (
                                <div className="mt-auto p-4 bg-primary/10 border border-primary/30 rounded flex flex-col gap-2 animate-fade-in-up">
                                    <h3 className="text-[10px] font-label-caps text-primary tracking-widest uppercase mb-1">Restore Complete</h3>
                                    <p className="text-xs font-data-mono-sm text-text-high-contrast">Trades Restored: {zipRestoreResult.tradeCount}</p>
                                    <p className="text-xs font-data-mono-sm text-text-high-contrast">Images Restored: {zipRestoreResult.imageCount}</p>
                                    <p className="text-[10px] flex items-center gap-1 font-label-caps text-primary tracking-widest mt-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Integrity Pass</p>
                                </div>
                            )}

                            {importError && (
                                <div className="p-3 mt-auto bg-negative/10 border border-negative/30 rounded text-negative text-xs flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                    <span>{importError}</span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="bg-surface border border-border-slate rounded-lg p-5 mt-2 shadow-sm flex items-start gap-4 hover:border-border-slate-hover transition-colors">
                    <span className="material-symbols-outlined text-primary mt-0.5 text-[20px]">info</span>
                    <p className="text-xs text-text-muted leading-relaxed">
                        <strong className="text-text-high-contrast tracking-wider uppercase font-label-caps">Backup Recommendation:</strong> Browser storage partitions are routinely isolated dynamically by native OS restrictions without warning. Generate a Full Archive periodically and store exact local zip files externally protecting database continuity reliably. Do not interpret client environments as guaranteed permanent endpoints structurally.
                    </p>
                </div>

                <div className="my-8 h-px bg-border-slate/50 w-full"></div>
                <h2 className="text-[10px] font-label-caps text-text-muted uppercase tracking-widest mb-4">Export Framework Diagnostics</h2>

                {/* ADVANCED EXTERNAL I/O (JSON, PDF, CSV, NOTION etc) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 opacity-80 hover:opacity-100 transition-opacity duration-300">
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:border-border-slate-hover transition-colors">
                        <h3 className="text-xs text-text-high-contrast font-label-caps uppercase tracking-wider">Raw JSON Schema</h3>
                        <p className="text-[10px] text-text-muted">Export textual data arrays exclusively without image bindings.</p>
                        <button onClick={handleExport} disabled={isExporting} className="mt-auto py-2 bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] border border-border-slate text-xs font-label-caps uppercase tracking-widest rounded hover:bg-surface-hover transition-colors text-text-high-contrast">
                            {isExporting ? "Compiling..." : "Export JSON"}
                        </button>
                    </section>
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:border-border-slate-hover transition-colors">
                        <h3 className="text-xs text-text-high-contrast font-label-caps uppercase tracking-wider">PDF Render Engine</h3>
                        <p className="text-[10px] text-text-muted">Generate flat binary print exports outlining trading mechanics organically.</p>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                           <select value={pdfRange} onChange={e => setPdfRange(e.target.value)} className="bg-surface border border-border-slate text-[10px] p-2 rounded text-text-high-contrast outline-none focus:border-primary transition-colors">
                               <option value="ALL">All Memory</option>
                           </select>
                           <select value={pdfImageSize} onChange={e => setPdfImageSize(e.target.value)} className="bg-surface border border-border-slate text-[10px] p-2 rounded text-text-high-contrast outline-none focus:border-primary transition-colors">
                               <option value="MEDIUM">Med Bound</option>
                               <option value="LARGE">Large Bound</option>
                           </select>
                        </div>
                        <button onClick={handlePdfExport} disabled={isGeneratingPdf} className="py-2 bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] border border-border-slate text-xs font-label-caps uppercase tracking-widest rounded hover:bg-surface-hover transition-colors text-text-high-contrast">
                            {isGeneratingPdf ? "Building PDF..." : (pdfProgress ? pdfProgress : "Export PDF")}
                        </button>
                    </section>
                    
                    <section className="bg-surface-panel border border-border-slate rounded-lg p-5 flex flex-col gap-4 md:col-span-2 shadow-sm hover:border-border-slate-hover transition-colors">
                        <h3 className="text-xs text-text-high-contrast font-label-caps uppercase tracking-wider">Spreadsheet & Notion Sync</h3>
                        <p className="text-[10px] text-text-muted leading-relaxed max-w-3xl">Export CSV/XLSX logs tracking metrics cleanly mapped to bounds securely without APIs. Import capabilities dynamically map Notion exports indexing duplicates.</p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
                           <button onClick={handleCsvExport} className="flex-1 py-2 bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] border border-border-slate text-xs font-label-caps uppercase tracking-widest rounded hover:bg-surface-hover transition-colors text-text-high-contrast">Export CSV</button>
                           <button onClick={handleExcelExport} className="flex-1 py-2 bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] border border-border-slate text-xs font-label-caps uppercase tracking-widest rounded hover:bg-surface-hover transition-colors text-text-high-contrast">Export EXCEL</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}`;

content = content.substring(0, jsxStart) + JSX_REPLACEMENT;
fs.writeFileSync(file, content);
console.log("Patched DataCenter.jsx successfully.");
