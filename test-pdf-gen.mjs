import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({ margin: 0, size: 'A4' });
const stream = fs.createWriteStream('./test-output.pdf');
doc.pipe(stream);

// Test header
doc.rect(0, 0, 612, 120).fill('#2563eb');
doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('PURCHASE ORDER', 300, 25, { align: 'right', width: 262 });
doc.fontSize(10).font('Helvetica');
doc.text('PO#12345', 300, 50, { align: 'right', width: 262 });
doc.text('Date: 18/01/2026', 300, 68, { align: 'right', width: 262 });

// Test totals
doc.fillColor('#000000').fontSize(11).font('Helvetica');
doc.text('Subtotal', 310, 400, { width: 120, align: 'right' });
doc.text('$13400.00', 430, 400, { width: 115, align: 'right' });
doc.text('GST (10%)', 310, 420, { width: 120, align: 'right' });
doc.text('$1340.00', 430, 420, { width: 115, align: 'right' });
doc.fontSize(12).font('Helvetica-Bold');
doc.text('TOTAL', 310, 445, { width: 120, align: 'right' });
doc.text('$14740.00', 430, 445, { width: 115, align: 'right' });

doc.end();
console.log('PDF generation started...');
stream.on('finish', () => console.log('Done!'));
stream.on('error', (err) => console.error('Error:', err));
