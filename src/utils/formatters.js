export const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
export const formatNumber = (value) => value == null || value === '' ? '—' : Number(value).toFixed(2).replace(/\.00$/, '')
export const formatSigned = (value) => value == null || value === '—' ? '—' : value.startsWith('-') ? `−${value.slice(1)}` : `+${value}`
export const formatPrice = (value) => value == null || value === '' ? '—' : Number(value).toLocaleString('en-US', { minimumFractionDigits: value < 100 ? 5 : 2, maximumFractionDigits: value < 100 ? 5 : 2 })
export const formatDate = (value) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'
