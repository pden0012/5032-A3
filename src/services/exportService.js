/**
 * Export service for converting data to various formats
 * Provides functionality to export data as CSV and PDF files
 * Supports user data, review data, and other application data
 */

/**
 * Convert array of objects to CSV format
 * Takes data array and column configuration to generate CSV content
 * Handles special characters and ensures proper CSV formatting
 */
const exportToCSV = (data, columns, filename = 'export.csv') => {
  try {
    // validate input data
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data provided for export')
    }
    
    // create CSV header row from column configuration
    const headers = columns.map(col => `"${col.label}"`).join(',')
    
    // convert each data row to CSV format
    const csvRows = data.map(row => {
      return columns.map(col => {
        const value = row[col.key] || ''
        // escape quotes and wrap in quotes for CSV safety
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })
    
    // combine headers and data rows
    const csvContent = [headers, ...csvRows].join('\n')
    
    // create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    
    // cleanup
    URL.revokeObjectURL(link.href)
    
    return true
  } catch (error) {
    console.error('CSV export error:', error)
    return false
  }
}

/**
 * Export data as PDF using browser's print functionality
 * Converts HTML table to PDF format for download
 * Provides formatted PDF output with proper styling
 */
const exportToPDF = (data, columns, filename = 'export.pdf') => {
  try {
    // create temporary HTML table for PDF conversion
    const tableHTML = createTableHTML(data, columns)
    
    // create new window for printing
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename.replace('.pdf', '')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .date { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Data Export</h1>
            <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          ${tableHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
    
    return true
  } catch (error) {
    console.error('PDF export error:', error)
    return false
  }
}

/**
 * Create HTML table from data and column configuration
 * Generates properly formatted HTML table for PDF export
 * Handles missing data and ensures consistent formatting
 */
const createTableHTML = (data, columns) => {
  // create table header
  const headerRow = columns.map(col => `<th>${col.label}</th>`).join('')
  
  // create table body rows
  const bodyRows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key] || ''
      return `<td>${String(value)}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  
  return `
    <table>
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `
}

/**
 * Export user data with predefined column configuration
 * Exports user information including username, email, and role
 * Provides formatted filename with timestamp
 */
const exportUsers = (users) => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }
  ]
  
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `users_export_${timestamp}.csv`
  
  return exportToCSV(users, columns, filename)
}

/**
 * Export review data with predefined column configuration
 * Exports review information including title, category, and rating
 * Provides formatted filename with timestamp
 */
const exportReviews = (reviews) => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'rating', label: 'Rating' },
    { key: 'reviewer', label: 'Reviewer' }
  ]
  
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `reviews_export_${timestamp}.csv`
  
  return exportToCSV(reviews, columns, filename)
}

/**
 * Export resources data with predefined column configuration
 * Exports mental health resource information
 * Provides formatted filename with timestamp
 */
const exportResources = (resources) => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' }
  ]
  
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `resources_export_${timestamp}.csv`
  
  return exportToCSV(resources, columns, filename)
}

// export service object with all available functions
export const exportService = {
  exportToCSV,
  exportToPDF,
  exportUsers,
  exportReviews,
  exportResources,
  createTableHTML
}
