import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatNumber, formatPrice, formatSigned } from '../utils/formatters'
import ChartFrame from './ui/ChartFrame'
import { useTrades } from '../context/TradeContext'

function TradeDetail({ trade, trades, onClose, onSelectTrade, onEdit, onDuplicate }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)

  const images = trade.images?.length ? trade.images : trade.image ? [trade.image] : []
  const tradeIndex = trades.findIndex((item) => item.id === trade.id)
  const previous = trades[tradeIndex - 1]
  const next = trades[tradeIndex + 1]

  const navigate = (item) => item && onSelectTrade(item)
  const selectImage = (index) => { setImageIndex(index); setZoom(1) }

  useEffect(() => { setImageIndex(0); setZoom(1) }, [trade.id])
  const { deleteTrade } = useTrades()

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') return isFullscreen ? setIsFullscreen(false) : onClose();
      if (isFullscreen && event.key === 'ArrowLeft') return selectImage(Math.max(0, imageIndex - 1));
      if (isFullscreen && event.key === 'ArrowRight') return selectImage(Math.min(images.length - 1, imageIndex + 1));
      if (!isFullscreen && event.key === 'ArrowLeft') navigate(previous);
      if (!isFullscreen && event.key === 'ArrowRight') navigate(next)
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler)
  })

  const priceRows = [['Entry', trade.entry], ['Exit', trade.exit], ['Stop loss', trade.stopLoss], ['Target', trade.target]]

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(trade.id);
      onClose();
    }
  }

  return (
    <div className="detail-backdrop editor-overlay" role="presentation" onMouseDown={onClose}>
      <article className="trade-detail editor-modal" role="dialog" aria-modal="true" aria-label={`${trade.pair} trade report`} onMouseDown={(e) => e.stopPropagation()}>

        <header className="editor-header">
          <div className="detail-title">
            <span className={`direction direction--${trade.direction.toLowerCase()}`}>{trade.direction}</span>
            <h2>{trade.pair}</h2>
            <span style={{ color: 'var(--muted)', fontSize: '13px', marginLeft: '12px', fontFamily: 'DM Mono, monospace' }}>{formatDate(trade.date)}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={onEdit}>Edit</button>
            <button className="btn-secondary" onClick={onDuplicate}>Duplicate</button>
            <button className="btn-secondary" style={{ color: 'var(--loss)', borderColor: 'rgba(238, 137, 148, 0.2)' }} onClick={handleDelete}>Delete</button>
            <button className="close-button" onClick={onClose} type="button" aria-label="Close trade report" style={{ background: 'transparent', border: 'none', marginLeft: '12px', color: 'var(--muted)' }}>✕</button>
          </div>
        </header>

        <div className="editor-body">
          <section className="journal-summary" style={{ marginBottom: '32px' }}>
            <div><span>P&L ($)</span><strong className={trade.pnl >= 0 ? 'profit' : 'loss'}>{formatSigned(formatCurrency(trade.pnl))}</strong></div>
            <div><span>R multiple</span><strong>{trade.rr == null ? '—' : `${formatNumber(trade.rr)}R`}</strong></div>
            <div><span>Risk</span><strong>{trade.risk || '—'}</strong></div>
            <div><span>Lots</span><strong>{trade.lots || '—'}</strong></div>
            <div style={{ borderRight: 0 }}><span>Trade #</span><strong>{String(trade.id).replace('trade-', '')}</strong></div>
          </section>

          <div className="editor-grid">
            <div className="editor-column">
              <section className="editor-section">
                <h3>Execution</h3>
                <div className="detail-list-grid">
                  {priceRows.map(([label, value]) => (
                    <div key={label} className="detail-list-row">
                      <span>{label}</span>
                      <strong>{formatPrice(value)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="editor-section">
                <h3>Context</h3>
                <div className="detail-list-grid">
                  <div className="detail-list-row"><span>Setup</span><strong>{trade.setup || '—'}</strong></div>
                  <div className="detail-list-row"><span>Timeframe</span><strong>{trade.timeframe || '—'}</strong></div>
                  <div className="detail-list-row"><span>Session</span><strong>{(trade.session || '').replace('_', ' ')}</strong></div>
                </div>
              </section>

              <section className="editor-section">
                <h3>Process</h3>
                <div className="detail-list-grid">
                  <div className="detail-list-row"><span>Rules followed</span><strong>{trade.rulesFollowed || '—'}</strong></div>
                  <div className="detail-list-row"><span>Money management</span><strong>{trade.moneyManagement || '—'}</strong></div>
                </div>
              </section>
            </div>

            <div className="editor-column editor-column--right">
              <section className="editor-section editor-section--notes">
                <h3>Learning / Trade Notes</h3>
                <div className="trade-notes-content">
                  {trade.learning || <span className="empty-notes" style={{ color: 'var(--faint)', fontStyle: 'italic' }}>No learning note recorded for this trade.</span>}
                </div>
              </section>

              <section className="editor-section">
                <h3>Charts</h3>
                {images.length > 0 ? (
                  <ChartFrame trade={trade} image={images[imageIndex]} className="detail-chart" onClick={() => setIsFullscreen(true)} />
                ) : (
                  <div className="upload-area" style={{ padding: '30px', border: '1px dashed var(--line)', borderRadius: '8px', textAlign: 'center', color: 'var(--faint)' }}>No screenshots attached</div>
                )}

                {images.length > 1 && (
                  <div className="image-previews" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    {images.map((img, index) => (
                      <button className="preview-btn" style={{ border: index === imageIndex ? '2px solid var(--accent)' : '1px solid var(--line)', background: 'transparent', padding: 0, borderRadius: '6px', overflow: 'hidden', width: '60px', height: '40px', cursor: 'pointer', opacity: index === imageIndex ? 1 : 0.5 }} key={index} onClick={() => selectImage(index)} type="button">
                        <img src={img} alt={`Chart ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        <footer className="editor-footer" style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-secondary" disabled={!previous} onClick={() => navigate(previous)}>← Previous</button>
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>{tradeIndex + 1} of {trades.length}</span>
          <button className="btn-secondary" disabled={!next} onClick={() => navigate(next)}>Next →</button>
        </footer>
      </article>

      {isFullscreen && (
        <div className="image-viewer" onMouseDown={() => setIsFullscreen(false)}>
          <div className="image-viewer__tools" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</button>
            <button type="button" onClick={() => setZoom(1)}>Reset</button>
            <button type="button" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
            <button className="btn-secondary" type="button" onClick={() => setIsFullscreen(false)} aria-label="Close fullscreen chart">✕</button>
          </div>
          <div className="zoom-stage" style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }} onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => { e.preventDefault(); setZoom(v => Math.min(3, Math.max(0.5, v + (e.deltaY < 0 ? 0.1 : -0.1)))); }}>
            <ChartFrame trade={trade} image={images[imageIndex]} className="image-viewer__frame" style={{ transform: `scale(${zoom})`, border: '1px solid var(--line)', borderRadius: '12px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default TradeDetail
