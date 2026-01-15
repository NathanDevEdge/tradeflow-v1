# Quote & PO Management System - TODO

## Database Schema
- [x] Create pricelists table (id, name, createdAt, updatedAt)
- [x] Create pricelist_items table (id, pricelistId, itemName, skuCode, packSize, packBuyPrice, looseBuyPrice, rrpExGst, rrpIncGst, sellPrice, createdAt, updatedAt)
- [x] Create customers table (id, companyName, contactName, email, phone, billingAddress, notes, createdAt, updatedAt)
- [x] Create suppliers table (id, companyName, billingAddress, keyContactName, keyContactEmail, poEmail, notes, createdAt, updatedAt)
- [x] Create quotes table (id, customerId, quoteNumber, status, totalAmount, totalMargin, marginPercentage, notes, createdAt, updatedAt)
- [x] Create quote_items table (id, quoteId, pricelistItemId, itemName, quantity, sellPrice, buyPrice, margin, lineTotal, createdAt, updatedAt)
- [x] Create purchase_orders table (id, supplierId, poNumber, status, totalAmount, notes, pdfUrl, createdAt, updatedAt)
- [x] Create purchase_order_items table (id, purchaseOrderId, pricelistItemId, itemName, quantity, buyPrice, lineTotal, createdAt, updatedAt)

## Backend API (tRPC Procedures)
- [x] Pricelist procedures: create, list, get, update, delete
- [x] Pricelist item procedures: create, bulkCreate (CSV upload), list, update, bulkUpdate, delete
- [x] Customer procedures: create, list, get, update, delete
- [x] Supplier procedures: create, list, get, update, delete
- [x] Quote procedures: create, list, get, update, delete, generatePDF
- [x] Quote item procedures: create, update, delete
- [x] Purchase order procedures: create, list, get, update, delete, generatePDF, sendEmail
- [x] Purchase order item procedures: create, update, delete
- [x] CSV validation and parsing logic

## Frontend UI
- [x] Dashboard layout with navigation
- [x] Pricelists page: list, create, view, edit, delete
- [x] Pricelist items page: CSV upload, bulk edit, individual edit
- [x] Customers page: list, create, view, edit, delete
- [x] Suppliers page: list, create, view, edit, delete
- [x] Quotes page: list, create, view, edit, delete
- [x] Quote detail page: add/edit line items, view margin calculations, export PDF
- [x] Purchase orders page: list, create, view, edit, delete
- [x] Purchase order detail page: add/edit line items, export PDF, send email

## PDF Generation
- [x] Quote PDF template (customer-facing, no buy prices or margins)
- [x] Purchase order PDF template (supplier-facing, only buy prices)
- [x] PDF storage to S3 with URL tracking

## Email Integration
- [x] Email service setup for sending PO PDFs
- [x] Email template for purchase orders

## Testing
- [x] Write vitest tests for all critical procedures
- [x] Test CSV upload validation
- [x] Test margin calculations
- [x] Test PDF generation with data separation
- [x] Test email functionality
