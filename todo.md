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

## Custom Authentication System
- [x] Update user schema to support email/password authentication
- [x] Add password hashing with bcrypt
- [x] Create login endpoint with email/password validation
- [x] Create registration endpoint for new users
- [x] Implement password reset functionality
- [x] Build custom login page UI
- [x] Build registration page UI
- [x] Build password reset page UI
- [x] Update session management for custom auth
- [x] Test authentication flows
- [x] Update context to support custom auth tokens

## Hidden Admin Access
- [x] Create /admin/login/9967 route that redirects to OAuth
- [x] Test admin route accessibility

## Admin Panel & User Management
- [x] Add subscription fields to user schema (subscriptionType, subscriptionEndDate, subscriptionStatus)
- [x] Create user invitations table for tracking invite tokens
- [x] Build admin panel UI page
- [x] Implement user list with subscription status display
- [x] Add invite user functionality with email generation
- [x] Create subscription management (extend, cancel, change type)
- [x] Add demo account (demo@devedge.com.au / demo123!) with indefinite subscription
- [x] Test admin panel functionality

## Admin Role Fix
- [x] Check and fix admin role assignment for OAuth users
- [x] Ensure owner's OAuth account gets admin role automatically
- [x] Test admin panel access after fix
