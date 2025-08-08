const express = require('express');
const cors = require('cors');
const path = require('path');
const PdfPrinter = require('pdfmake');
const { Pool } = require('pg');
const fs = require('fs');
const ExcelJS = require('exceljs');
const app = express();
const port = 3000;

// Allow CORS
app.use(cors());

// PostgreSQL config
const pool = new Pool({
  user: 'postgres',
  host: '10.176.30.190',
  database: 'financialreport',
  password: 'postgres',
  port: 5432,
});

// PDF fonts
const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../backend/fonts/static/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../backend/fonts/static/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../backend/fonts/static/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../backend/fonts/static/Roboto-MediumItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);

// Route to generate PDF
app.get('/report-pdf', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const transactions = result.rows;

    // Create table body with headers
    const tableBody = [
      ['Date', 'Type', 'Amount (₹)', 'Description'],
      ...transactions.map(tx => [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        `₹${tx.amount}`,
        tx.description
      ])
    ];

    const docDefinition = {
      content: [
        { text: 'Financial Transaction Report', style: 'header' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*'],
            body: tableBody
          }
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        }
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=financial_report.pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to generate PDF');
  }
});
// Excel route
app.get('/report-excel', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const transactions = result.rows;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');

    sheet.columns = [
      { header: 'Date', key: 'date' },
      { header: 'Type', key: 'type' },
      { header: 'Amount', key: 'amount' },
      { header: 'Description', key: 'description' },
    ];

    transactions.forEach(tx => sheet.addRow(tx));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=financial_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating Excel');
  }
});
// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Start server on your IP
app.listen(port, '10.176.30.213', () => {
  console.log(`Server running at http://10.176.30.213:${port}`);
});
