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

## Quote Builder Bug Fixes
- [x] Fix inline editing for quantity (not responding to changes)
- [x] Fix inline editing for unit price (not responding to changes)
- [x] Fix quote totals calculation when items are added
- [x] Ensure totals display correctly in quotes list
- [x] Ensure totals display correctly in customer detail page
- [x] Trigger recalculation after adding/updating/deleting items

## Quote Builder UX Improvements
- [x] Implement optimistic updates for quantity changes (instant feedback)
- [x] Implement optimistic updates for unit price changes (instant feedback)
- [x] Implement optimistic updates for adding items (instant feedback)
- [x] Fix unit price input to allow fluid typing (not locked to decimal format)
- [x] Remove 2-3 second delay when updating items
- [x] Show silent background saves without blocking UI

## Purchase Order System
- [x] Update PO schema to include delivery method (in-store delivery / pickup from supplier)
- [x] Update PO schema to include shipping address
- [ ] Add company billing details section to PO
- [x] Implement smart buy price logic (loose vs pack pricing based on quantity)
- [x] Make buy price non-editable (system-calculated)
- [x] Create PO detail page with Zoho-inspired layout
- [x] Add inline editing for quantity (optimistic updates)
- [x] Add product search and filtering
- [x] Display company billing details at top
- [x] Add delivery method selector
- [x] Show shipping address conditionally for in-store delivery
- [x] Calculate totals automatically
- [x] Add tests for smart buy price logic

## Purchase Order Bug Fixes
- [x] Fix buy price not updating visually when quantity changes
- [x] Implement smart buy price recalculation in update mutation
- [x] Fix total calculation (209 boards showing $218.30 instead of correct total)
- [x] Ensure buy price changes are saved to database
- [x] Display updated buy price in UI immediately

## Settings Page & Company Details
- [x] Create company_settings table in database
- [x] Add fields for company name, ABN/ACN, address, phone, email, logo URL
- [x] Create backend procedures for getting/updating company settings
- [x] Create Settings page component
- [x] Add company details form with validation
- [x] Implement logo upload to S3
- [x] Add Settings link to navigation

## Premium PDF Design
- [x] Redesign quote PDF with professional layout
- [x] Redesign purchase order PDF with professional layout
- [x] Add company logo to PDF header
- [x] Use clean typography and proper spacing
- [x] Create branded header/footer sections
- [x] Design well-organized line items table
- [x] Ensure high-end aesthetic (not spreadsheet-like)

## Clickable Table Rows UX
- [x] Make entire customer rows clickable
- [x] Make entire supplier rows clickable
- [x] Make entire quote rows clickable
- [x] Make entire purchase order rows clickable
- [x] Keep action buttons for delete/other operations
- [x] Add hover effects for better UX
## Supplier Detail Pages
- [x] Create SupplierDetail page component
- [x] Display supplier contact information in organized layout
- [x] Show list of all purchase orders for the supplier
- [x] Make PO rows clickable to view details
- [x] Add statistics (total POs, total spend, pending orders)
- [x] Add "Create New PO" button on supplier detail page
- [x] Add backend procedure to get supplier by ID
- [x] Add backend procedure to get POs by supplier ID

## Multi-Tenant Architecture
- [x] Create organizations table in database
- [x] Add organizationId to users table
- [x] Add organizationId to pricelists table
- [x] Add organizationId to pricelistItems table
- [x] Add organizationId to customers table
- [x] Add organizationId to suppliers table
- [x] Add organizationId to quotes table
- [x] Add organizationId to purchaseOrders table
- [x] Add organizationId to company_settings table
- [x] Create middleware to inject organizationId into context
- [x] Update all database helpers to filter by organizationId
- [x] Update all tRPC procedures to use organizationId
- [x] Build admin panel UI for creating organizations
- [x] Build admin panel UI for assigning users to organizations
- [ ] Add organization selector for admin users
- [x] Migrate existing data to default organization
- [x] Test data isolation between organizations

## User Role Hierarchy
- [x] Update user role enum to include 'org_owner' and 'super_admin'
- [x] Update Settings page to use current user's organization
- [x] Build user management UI for org owners (invite, edit permissions, reset password, delete)
- [ ] Create organization switcher for super admin in navigation (SKIPPED - not needed, super admin can create users in any org)
- [x] Implement permission middleware for org_owner actions (orgOwnerProcedure)
- [x] Implement permission middleware for super_admin actions (superAdminProcedure)
- [x] Revert delete operations from orgOwnerProcedure to orgProcedure (allow all users to delete)
- [x] Apply superAdminProcedure to organizations and users routers
- [x] Keep orgOwnerProcedure only for organizationUsers router (team management)
- [x] Update tests to cover all three roles (all 53 tests passing)
- [x] Ensure company settings are organization-scoped

## Documentation & Repository
- [x] Create comprehensive README with technical stack, features, and use cases
- [x] Rename GitHub repository to TradeFlow with version number
- [x] Push updated README to GitHub

## Email System Improvements
- [x] Review existing email infrastructure and notification setup
- [x] Implement user invitation email with registration link
- [x] Update contact form to send proper email notifications to admin
- [ ] Test invitation email delivery and registration flow
- [ ] Test contact form email notifications
- [x] Verify email templates are professional and branded

## Super Admin Access
- [x] Update nathan@developeredge.net to super_admin role
- [x] Add Admin Panel link to navigation (visible only for super_admin)
- [ ] Test organization management access
- [ ] Test user management across organizations

## Production Readiness (Priority: HIGH - 2 hour deadline)
- [x] Fix PDF layout code - prices cut off on right side (completely rewrote pdfgen.ts)
- [x] Fix PDF A4 page formatting and margins (correct coordinates applied)
- [x] Renamed module to pdfgen.ts to force cache clear
- [x] Test after full production deployment (header/totals work, line items missing)
- [x] Fix PDF line items table not rendering (reset fill color after row backgrounds)
- [ ] Additional bug fixes and improvements (TBD by user)

## Shipping Address Modal Improvement
- [x] Create shipping_addresses table (organizationId, attentionTo, streetAddress, state, postcode, country, phoneNumber)
- [x] Add backend procedures for managing shipping addresses (create, list, get, delete)
- [x] Create ShippingAddressModal component with form fields
- [x] Add saved addresses dropdown in modal
- [x] Add "Add New Address" option
- [x] Update PO detail page to open modal instead of inline editing
- [x] Save address only when modal is submitted
- [ ] Test shipping address workflow

## PDF Generation Fixes
- [x] Display actual shipping address in PDF when delivery method is "in_store_delivery"
- [x] Remove underscores from delivery method labels (pickup_from_supplier → Pickup from Supplier, in_store_delivery → In-store Delivery)

## Super Admin Organization Management (Production Ready)
- [x] Create organization management UI in admin panel (list all organizations)
- [x] Add "Create Organization" form (name, default settings)
- [ ] Add "Edit Organization" functionality
- [ ] Add "Delete Organization" functionality (with confirmation)
- [x] Build user assignment interface (assign existing users to organizations)
- [x] Add ability to create organization + invite users in one flow
- [x] Show organization membership in user list
- [ ] Test complete workflow: create org → invite user → user registers → user has access

## Organization-Based Subscription Model
- [x] Move subscription fields from users table to organizations table (subscriptionType, subscriptionStatus, subscriptionEndDate)
- [x] Add userLimit field to organizations table (default 5)
- [x] Remove subscription fields from users table
- [x] Update organization middleware to check organization subscription status
- [x] Add validation to prevent adding users beyond organization user limit
- [x] Update admin panel to manage organization subscriptions instead of user subscriptions
- [x] Migrate existing subscription data from users to organizations
- [x] Update all subscription-related queries and procedures
- [ ] Test user limit enforcement
- [ ] Test subscription status checks
