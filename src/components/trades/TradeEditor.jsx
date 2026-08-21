import React, { useState, useRef, useEffect } from 'react';
import { useTrades } from '../../context/TradeContext';
import { classifySession } from '../../utils/sessions';

export default function TradeEditor({ initialData, onClose }) {
    const { addTrade, updateTrade, trades } = useTrades();
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const [formData, setFormData] = useState(initialData || {
        id: `trade-${Date.now()}`,
        date: new Date().toISOString().slice(0, 16),
        pair: '',
        direction: 'LONG',
        lots: '',
        entry: '',
        exit: '',
        stopLoss: '',
        target: '',
        setup: '',
        timeframe: '5m',
        exitLogic: '',
        pnl: '',
        rulesFollowed: 'YES',
        moneyManagement: 'YES',
        risk: 'HALF',
        learning: '',
        image: null,
        images: []
    });

    const [detectedSession, setDetectedSession] = useState('UNKNOWN');

    useEffect(() => {
        if (formData.date) {
            const { session } = classifySession(formData.date);
            setDetectedSession(session.replace('_', ' '));
        }
    }, [formData.date]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const processFiles = (files) => {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        if (!validFiles.length) return;

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => {
                    const newImages = [...prev.images, event.target.result];
                    return { ...prev, images: newImages, image: newImages[0] };
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = (e) => {
        if (e.target.files) processFiles(Array.from(e.target.files));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeImage = (index) => {
        setFormData(prev => {
            const updated = prev.images.filter((_, i) => i !== index);
            return { ...prev, images: updated, image: updated.length ? updated[0] : null };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const processedData = {
            ...formData,
            lots: Number(formData.lots) || null,
            entry: Number(formData.entry) || null,
            exit: Number(formData.exit) || null,
            stopLoss: Number(formData.stopLoss) || null,
            target: Number(formData.target) || null,
            pnl: Number(formData.pnl) || 0,
        };

        const isEditing = initialData && trades.some(t => t.id === initialData.id);

        if (isEditing) {
            updateTrade(processedData);
        } else {
            addTrade(processedData);
        }
        onClose();
    };

    const isEditing = initialData && trades.some(t => t.id === initialData.id);
    const currentMode = isEditing ? 'Edit Trade' : 'New Trade';

    return (
        <div className="detail-backdrop editor-overlay" onMouseDown={onClose}>
            <div className="trade-detail editor-modal" onMouseDown={(e) => e.stopPropagation()}>
                <header className="editor-header">
                    <div className="detail-title">
                        <span className={`direction direction--${formData.direction.toLowerCase()}`}>{formData.direction}</span>
                        <h2>{currentMode}</h2>
                    </div>
                    <button type="button" className="close-button" onClick={onClose} aria-label="Close editor">×</button>
                </header>

                <form className="editor-form-wrapper" onSubmit={handleSubmit}>
                    <div className="editor-body">
                        <div className="editor-grid">

                            {/* LEFT COLUMN */}
                            <div className="editor-column">
                                <section className="editor-section">
                                    <h3>Trade</h3>
                                    <div className="editor-fields col-2">
                                        <div className="editor-field">
                                            <label>Date & Time</label>
                                            <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} required />
                                        </div>
                                        <div className="editor-field">
                                            <label>Pair</label>
                                            <input type="text" name="pair" value={formData.pair} onChange={handleChange} placeholder="e.g. XAUUSD" required />
                                        </div>
                                        <div className="editor-field">
                                            <label>Direction</label>
                                            <select name="direction" value={formData.direction} onChange={handleChange}>
                                                <option value="LONG">LONG</option>
                                                <option value="SHORT">SHORT</option>
                                            </select>
                                        </div>
                                        <div className="editor-field">
                                            <label>Timeframe</label>
                                            <input type="text" name="timeframe" value={formData.timeframe} onChange={handleChange} placeholder="e.g. 5m" />
                                        </div>
                                    </div>
                                </section>

                                <section className="editor-section">
                                    <h3>Execution</h3>
                                    <div className="editor-fields col-2">
                                        <div className="editor-field">
                                            <label>Entry</label>
                                            <input type="number" step="0.01" name="entry" value={formData.entry} onChange={handleChange} />
                                        </div>
                                        <div className="editor-field">
                                            <label>Exit</label>
                                            <input type="number" step="0.01" name="exit" value={formData.exit} onChange={handleChange} />
                                        </div>
                                        <div className="editor-field">
                                            <label>Stop Loss (pips / price)</label>
                                            <input type="number" step="0.01" name="stopLoss" value={formData.stopLoss} onChange={handleChange} />
                                        </div>
                                        <div className="editor-field">
                                            <label>Target</label>
                                            <input type="number" step="0.01" name="target" value={formData.target} onChange={handleChange} />
                                        </div>
                                        <div className="editor-field">
                                            <label>Lots</label>
                                            <input type="number" step="0.01" name="lots" value={formData.lots} onChange={handleChange} />
                                        </div>
                                        <div className="editor-field">
                                            <label>P&L ($)</label>
                                            <input type="number" step="0.01" name="pnl" value={formData.pnl} onChange={handleChange} required />
                                        </div>
                                    </div>
                                </section>

                                <section className="editor-section">
                                    <h3>Context</h3>
                                    <div className="editor-fields col-2">
                                        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
                                            <label>Setup / Confluences</label>
                                            <input type="text" name="setup" value={formData.setup} onChange={handleChange} placeholder="e.g. FVG + Liquidity sweep" />
                                        </div>
                                        <div className="editor-field">
                                            <label>Session</label>
                                            <div className="detected-session-box">
                                                <span>{detectedSession}</span>
                                                <small>Auto-detected</small>
                                            </div>
                                        </div>
                                        <div className="editor-field">
                                            <label>Risk</label>
                                            <select name="risk" value={formData.risk} onChange={handleChange}>
                                                <option value="FULL">FULL</option>
                                                <option value="HALF">HALF</option>
                                            </select>
                                        </div>
                                        <div className="editor-field">
                                            <label>Rules Followed</label>
                                            <select name="rulesFollowed" value={formData.rulesFollowed} onChange={handleChange}>
                                                <option value="YES">YES</option>
                                                <option value="NO">NO</option>
                                            </select>
                                        </div>
                                        <div className="editor-field">
                                            <label>Money Management</label>
                                            <select name="moneyManagement" value={formData.moneyManagement} onChange={handleChange}>
                                                <option value="YES">YES</option>
                                                <option value="NO">NO</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="editor-column editor-column--right">
                                <section className="editor-section editor-section--notes">
                                    <h3>Review</h3>
                                    <div className="editor-field">
                                        <label>Key Learnings / Trade Notes</label>
                                        <textarea
                                            name="learning"
                                            value={formData.learning}
                                            onChange={handleChange}
                                            placeholder="Document your thought process, emotional state, and key takeaways from this trade execution. What would you differently next time?"
                                        />
                                    </div>
                                </section>

                                <section className="editor-section">
                                    <h3>Charts</h3>
                                    <div
                                        className={`upload-area ${isDragging ? 'is-dragging' : ''}`}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageUpload} hidden />
                                        <span>Click or drag and drop screenshots here</span>
                                    </div>

                                    {formData.images.length > 0 && (
                                        <div className="upload-previews">
                                            {formData.images.map((img, idx) => (
                                                <div key={idx} className="upload-preview">
                                                    <img src={img} alt={`Preview ${idx + 1}`} />
                                                    <button type="button" className="upload-remove" onClick={(e) => { e.stopPropagation(); removeImage(idx); }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>

                    <footer className="editor-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">Save Trade</button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
