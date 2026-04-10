import { useState } from 'react'

const DENOMINATIONS = [5, 10, 20, 50, 100, 200, 500, 1000]

interface Props {
  label: string
  remittancePct: number
  value: number
  onChange: (total: number) => void
  showRemittance?: boolean
}

export default function DenominationInput({
  label,
  remittancePct,
  value,
  onChange,
  showRemittance = false,
}: Props) {
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    // Try to reverse-engineer counts from existing value
    const init: Record<number, number> = {}
    DENOMINATIONS.forEach((d) => (init[d] = 0))
    return init
  })

  const [expanded, setExpanded] = useState(false)

  function handleCountChange(denom: number, count: number) {
    const updated = { ...counts, [denom]: count }
    setCounts(updated)
    const total = DENOMINATIONS.reduce((a, d) => a + d * (updated[d] || 0), 0)
    onChange(total)
  }

  function formatNaira(n: number) {
    return '₦' + n.toLocaleString('en-NG')
  }

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">

      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm text-white font-medium">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {(remittancePct * 100).toFixed(0)}% remittance
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-yellow-400">{formatNaira(value)}</p>
            {showRemittance && value > 0 && (
              <p className="text-xs text-red-400">
                Remit: {formatNaira(value * remittancePct)}
              </p>
            )}
          </div>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Denomination grid */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-900 grid grid-cols-2 gap-2">
          {DENOMINATIONS.map((denom) => (
            <div key={denom} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-14 shrink-0">₦{denom}</span>
              <input
                type="number"
                min={0}
                value={counts[denom] || 0}
                onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-yellow-400/50"
                placeholder="0"
              />
              <span className="text-xs text-gray-600">
                = {formatNaira(denom * (counts[denom] || 0))}
              </span>
            </div>
          ))}
          <div className="col-span-2 border-t border-gray-800 pt-2 mt-1 flex justify-between">
            <span className="text-xs text-gray-400">Subtotal</span>
            <span className="text-xs font-semibold text-yellow-400">{formatNaira(value)}</span>
          </div>
        </div>
      )}
    </div>
  )
}