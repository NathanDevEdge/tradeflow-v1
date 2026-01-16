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

## Logout Redirect Fix
- [x] Fix logout to properly clear all session cookies
- [x] Ensure protected routes redirect to /login when not authenticated
- [x] Test logout flow to verify redirect to login page

## Landing Page (TradeFlow Branding)
- [x] Create professional landing page component
- [x] Add hero section with value proposition
- [x] Add features section highlighting key capabilities
- [x] Add pricing section ($40/month, $399/year)
- [x] Add FAQ section
- [x] Add footer with login CTA
- [x] Update routing to show landing page at / (root)
- [x] Move dashboard to /dashboard route
- [x] Update navigation and redirects

## Landing Page Updates
- [x] Remove demo credentials from hero section

## Landing Page Enhancements
- [x] Add comparison table (TradeFlow vs Manual Spreadsheets vs Enterprise Software)
- [x] Add contact/inquiry form for lead capture
- [x] Add trust indicators (Australian-based, security, uptime)
- [x] Implement backend contact form submission
- [x] Store contact inquiries in database

## Admin Contact Inbox
- [x] Add contact inquiries list to admin panel
- [x] Add status management (new, contacted, converted, archived)
- [x] Add filtering and sorting options
- [x] Create backend procedures for listing and updating inquiries

## Landing Page Navigation
- [x] Add smooth scroll navigation to Features, Pricing, Contact sections
- [x] Update header with anchor links

## Email Notifications
- [x] Implement email notification when contact form is submitted
- [x] Send notification to admin email address

## Backend Functionality Testing
- [ ] Test CSV pricelist upload with validation
- [ ] Test pricelist item CRUD operations
- [ ] Test customer and supplier CRUD operations
- [ ] Test quote creation with margin calculations
- [ ] Test quote PDF generation (verify no margin data exposed)
- [ ] Test purchase order creation
- [ ] Test purchase order PDF generation (verify only buy prices shown)
- [ ] Test purchase order email functionality

## CSV Upload Fix
- [x] Update CSV validation to be case-insensitive for column names
- [x] Handle flexible column naming variations (spaces, capitalization)
- [x] Allow optional fields to be empty without validation errors
- [x] Test with user's actual CSV file

## Quote System UX Improvements
- [x] Separate Quotes and Purchase Orders in navigation menu
- [x] Replace all dropdowns with searchable input fields
- [x] Add module-specific search bars (customers, suppliers, pricelists, quotes, POs)
- [ ] Add global search bar in navigation header
- [x] Make quote list items clickable to view details
- [ ] Make customer list items clickable to view details
- [x] Redesign quote creation workflow to redirect to quote builder page
- [x] Add real-time product search in quote builder
- [x] Show real-time margin calculations when adding products
- [ ] Show unit sell price, buy price, and margin percentage for each product

## Quote Builder Redesign
- [x] Replace searchable select with simple text search bar
- [x] Add pricelist filter dropdown (All Pricelists + individual pricelists)
- [x] Implement partial search matching for item name and SKU code
- [x] Make quantity and unit price inline editable in table
- [x] Add real-time calculation updates when editing quantity or price
- [x] Fix totals section: Subtotal, Total Margin (with %), GST (10%), Total
- [x] Update table columns: Item, SKU, Quantity, Unit Price, Margin/Unit, Margin %, Total
- [x] Add delete button for each line item

## Delete Functionality
- [x] Add trash icon to quotes list for deleting quotes
- [x] Add confirmation dialog before deleting
- [x] Clean up all test data (customers, pricelists, quotes)

## Interactive Customer Detail Pages
- [x] Create customer detail page component
- [x] Display all customer contact information
- [x] Show list of quotes associated with customer
- [x] Make quotes clickable to view details
- [x] Add "Create New Quote" button on customer detail page

## Quote Status Workflow
- [x] Update quote schema to include status field (draft, sent, accepted, declined)
- [x] Add status badges to quotes list
- [x] Create status transition UI (Draft → Sent → Accepted/Declined)
- [ ] Add date tracking for status changes
- [ ] Update quote detail view to show status history
