/**
 * Utility to export generic array of objects as a downloadable CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (!data || !data.length) {
    alert('No data to export')
    return
  }

  const columns = headers || Object.keys(data[0]).map((key) => ({
    key: key as keyof T,
    label: key.toUpperCase(),
  }))

  const headerRow = columns.map((col) => `"${col.label}"`).join(',')

  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let val: any = item[col.key]
        if (val === null || val === undefined) val = ''
        if (typeof val === 'object') val = JSON.stringify(val).replace(/"/g, '""')
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      })
      .join(',')
  })

  const csvContent = [headerRow, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
