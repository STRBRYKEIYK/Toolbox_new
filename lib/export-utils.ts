import * as XLSX from 'xlsx';
import type { Product } from '@/lib/barcode-scanner';

export interface ExportOptions {
  filename?: string;
  includeMetadata?: boolean;
}

export interface ExportData {
  products: Product[];
  exportDate: string;
  totalItems: number;
  metadata?: {
    apiUrl: string;
    isConnected: boolean;
    lastSync: string | null;
  };
}

// Convert products to a flat structure for export
const flattenProductData = (products: Product[], includeMetadata: boolean = true) => {
  return products.map(product => ({
    'Item ID': product.id || 'N/A',
    'Name': product.name || 'Unknown',
    'Brand': product.brand || '',
    'Item Type': product.itemType || 'General',
    'Location': product.location || '',
    'Balance': product.balance || 0,
    'Status': product.status || 'unknown',
    'Status Text': product.status === 'in-stock' ? 'In Stock' : 
                   product.status === 'low-stock' ? 'Low Stock' : 
                   product.status === 'out-of-stock' ? 'Out of Stock' : 'Unknown',
    ...(includeMetadata && {
      'Export Date': new Date().toISOString(),
    })
  }));
};

// Export to CSV format
export const exportToCSV = (data: ExportData, options: ExportOptions = {}) => {
  const { filename = 'inventory-export', includeMetadata = true } = options;
  
  const flatData = flattenProductData(data.products, includeMetadata);
  
  // Convert to CSV
  const headers = Object.keys(flatData[0] || {});
  const csvContent = [
    headers.join(','),
    ...flatData.map(row => 
      headers.map(header => {
        const value = row[header as keyof typeof row];
        // Escape commas and quotes in CSV
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Add metadata as comments if requested
  let finalContent = csvContent;
  if (includeMetadata && data.metadata) {
    const metadataComments = [
      `# Inventory Export Report`,
      `# Export Date: ${data.exportDate}`,
      `# Total Items: ${data.totalItems}`,
      `# API URL: ${data.metadata.apiUrl}`,
      `# API Connected: ${data.metadata.isConnected}`,
      `# Last Sync: ${data.metadata.lastSync || 'Never'}`,
      `#`,
      ''
    ].join('\n');
    finalContent = metadataComments + csvContent;
  }

  // Create and download file
  const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to Excel (XLSX) format
export const exportToXLSX = (data: ExportData, options: ExportOptions = {}) => {
  const { filename = 'inventory-export', includeMetadata = true } = options;
  
  const flatData = flattenProductData(data.products, includeMetadata);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Main data worksheet
  const mainWorksheet = XLSX.utils.json_to_sheet(flatData);
  
  // Auto-size columns
  const columnWidths = Object.keys(flatData[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...flatData.map(row => String(row[key as keyof typeof row] || '').length)
    ) + 2
  }));
  mainWorksheet['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Inventory');
  
  // Add metadata sheet if requested
  if (includeMetadata && data.metadata) {
    const metadataSheet = XLSX.utils.json_to_sheet([
      { Property: 'Export Date', Value: data.exportDate },
      { Property: 'Total Items', Value: data.totalItems },
      { Property: 'API URL', Value: data.metadata.apiUrl },
      { Property: 'API Connected', Value: data.metadata.isConnected ? 'Yes' : 'No' },
      { Property: 'Last Sync', Value: data.metadata.lastSync || 'Never' },
      { Property: 'Export Format', Value: 'Excel (XLSX)' },
    ]);
    
    metadataSheet['!cols'] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info');
  }
  
  // Add summary sheet
  const categories = [...new Set(data.products.map(p => p.itemType || 'General'))];
  const summaryData = categories.map(category => {
    const categoryProducts = data.products.filter(p => (p.itemType || 'General') === category);
    const totalItems = categoryProducts.reduce((sum, p) => sum + (p.balance || 0), 0);
    
    return {
      Category: category,
      'Product Count': categoryProducts.length,
      'Total Items': totalItems,
      'Avg Items per Product': categoryProducts.length > 0 ? (totalItems / categoryProducts.length).toFixed(1) : 0
    };
  });
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Write file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Export to JSON format
export const exportToJSON = (data: ExportData, options: ExportOptions = {}) => {
  const { filename = 'inventory-export', includeMetadata = true } = options;
  
  const exportObject = {
    export_info: {
      export_date: data.exportDate,
      total_items: data.totalItems,
      format: 'JSON',
      version: '1.0'
    },
    ...(includeMetadata && data.metadata && {
      metadata: data.metadata
    }),
    products: data.products,
    summary: {
      categories: [...new Set(data.products.map(p => p.itemType || 'General'))].map(category => {
        const categoryProducts = data.products.filter(p => (p.itemType || 'General') === category);
        return {
          category,
          product_count: categoryProducts.length,
          total_items: categoryProducts.reduce((sum, p) => sum + (p.balance || 0), 0)
        };
      })
    }
  };
  
  const jsonContent = JSON.stringify(exportObject, null, 2);
  
  // Create and download file
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Get export data from products
export const prepareExportData = (
  products: Product[], 
  apiUrl: string = '', 
  isConnected: boolean = false, 
  lastSync: string | null = null
): ExportData => {
  return {
    products,
    exportDate: new Date().toISOString(),
    totalItems: products.reduce((sum, p) => sum + (p.balance || 0), 0),
    metadata: {
      apiUrl,
      isConnected,
      lastSync
    }
  };
};

// Export logs specifically (array of normalized log objects)
export const exportLogsToXLSX = (logs: Array<any>, options: ExportOptions = {}) => {
  const { filename = 'logs-export' } = options;

  // Normalize logs to rows with specific columns
  const rows = logs.map((l) => ({
    Username: l.username || l.user || 'Unknown',
    Details: l.details || l.action || '',
    'Log Date': l.log_date || '',
    'Log Time': l.log_time || '',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const columnWidths = Object.keys(rows[0] || {}).map(key => ({ wch: Math.max(key.length, ...rows.map((r: any) => String((r as any)[key] || '').length)) + 2 }));
  worksheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};