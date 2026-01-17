# TradeFlow v1.0

**Professional Quoting & Purchase Order Management System for Wholesale Distribution**

TradeFlow is a production-ready, multi-tenant SaaS application designed specifically for small retail stores, installers, and builders who need to manage pricelists, create professional quotes with margin tracking, and generate purchase orders with intelligent pricing logic. Built with modern web technologies and enterprise-grade architecture, TradeFlow streamlines wholesale operations while maintaining strict data separation between customer-facing and supplier-facing documents.

---

## 🎯 Use Cases

TradeFlow is purpose-built for businesses in the wholesale distribution space:

### **Retail Stores**
Manage multiple supplier pricelists, create customer quotes with real-time margin calculations, and generate purchase orders automatically. Track profitability across all quotes and maintain organized customer relationships with complete quote history.

### **Installers & Contractors**
Quote jobs quickly using searchable product databases, calculate margins instantly to ensure profitability, and send professional PDF quotes to clients. Generate supplier purchase orders with smart pricing logic that automatically selects the most cost-effective buy price (loose vs pack pricing).

### **Builders**
Maintain multiple supplier relationships with organized contact management, create detailed quotes for construction projects with line-item margin tracking, and manage purchase orders across multiple suppliers. Track quote status from draft through acceptance and maintain complete project documentation.

### **Small Wholesale Distributors**
Operate a multi-tenant system where each organization has complete data isolation. Manage team members with role-based permissions, upload and maintain pricelists via CSV import, and generate branded PDFs with company logo for professional customer and supplier communications.

---

## ✨ Key Features

### **Pricelist Management**
- CSV upload with flexible column name parsing (case-insensitive, handles variations)
- Support for pack and loose buy pricing with automatic price selection
- Searchable product database with SKU and item name filtering
- Bulk editing capabilities for sell prices
- Organization-scoped pricelists with complete data isolation

### **Quote Builder**
- Interactive quote creation with real-time margin calculations
- Inline editing for quantity and unit price with optimistic updates
- Instant feedback on margin per unit, margin percentage, and line totals
- Product search across all pricelists or filtered by specific pricelist
- Quote status workflow: Draft → Sent → Accepted/Declined
- Professional PDF generation with company branding (no margin data exposed to customers)

### **Purchase Order System**
- Smart buy price logic: automatically selects loose or pack pricing based on quantity
- Delivery method selection (in-store delivery / pickup from supplier)
- Conditional shipping address display
- Inline quantity editing with automatic price recalculation
- Professional PDF generation with company branding (only buy prices, no margins)
- Complete purchase order history by supplier

### **Customer & Supplier Management**
- Comprehensive contact management with billing addresses and notes
- Interactive detail pages showing complete quote/PO history
- Quick quote/PO creation from customer/supplier detail pages
- Statistics tracking (total quotes, total value, pending orders)
- Clickable table rows for intuitive navigation

### **Multi-Tenant Architecture**
- Complete data isolation between organizations
- Organization-scoped business entities (pricelists, customers, suppliers, quotes, POs)
- Shared company settings (logo, contact details) across organization users
- Automatic organization context injection via middleware

### **Role-Based Access Control**
- **Regular Users**: Full access to create, edit, and delete all business data within their organization
- **Organization Owners**: All user capabilities plus team management (invite users, edit roles, reset passwords, delete users)
- **Super Admin**: Global access to manage all organizations and assign users

### **Company Branding**
- Upload company logo to S3 storage
- Branded PDF headers for quotes and purchase orders
- Organization-scoped company settings (name, ABN/ACN, address, phone, email)
- Professional document design with clean typography

### **Professional PDF Generation**
- Premium design with company logo and branded headers
- Quote PDFs: customer-facing with sell prices only (no margin data)
- Purchase Order PDFs: supplier-facing with buy prices only (no margins)
- Clean, organized line item tables with proper spacing
- GST calculations (10%) with clear totals

---

## 🛠️ Technical Stack

### **Frontend**
- **React 19**: Modern UI library with latest features
- **TypeScript**: Type-safe development throughout the application
- **Tailwind CSS 4**: Utility-first styling with custom design tokens
- **shadcn/ui**: High-quality, accessible component library
- **Wouter**: Lightweight client-side routing
- **tRPC React Query**: Type-safe API calls with automatic type inference
- **Vite**: Fast build tool and development server

### **Backend**
- **Node.js 22**: Latest LTS runtime environment
- **Express 4**: Web application framework
- **tRPC 11**: End-to-end typesafe APIs without code generation
- **TypeScript**: Consistent type safety across frontend and backend
- **Superjson**: Automatic serialization for complex data types (Date, BigInt, etc.)

### **Database**
- **PostgreSQL**: Production-grade relational database via TiDB Cloud
- **Drizzle ORM**: Type-safe database queries with excellent TypeScript integration
- **Schema-first workflow**: Database schema defined in TypeScript with automatic migrations

### **Authentication & Authorization**
- **Manus OAuth**: Integrated OAuth authentication
- **JWT Sessions**: Secure session management with HTTP-only cookies
- **Role-based middleware**: Custom tRPC procedures for permission enforcement
- **Organization context injection**: Automatic organizationId filtering

### **File Storage**
- **AWS S3**: Scalable object storage for company logos and PDFs
- **Pre-configured helpers**: Simple upload/download with automatic URL generation
- **Public bucket**: Direct access to generated PDFs without signed URLs

### **PDF Generation**
- **Puppeteer**: Headless browser for HTML-to-PDF conversion
- **Custom templates**: Professional layouts with company branding
- **Conditional rendering**: Different templates for quotes vs purchase orders

### **Testing**
- **Vitest**: Fast unit testing framework with excellent TypeScript support
- **53 comprehensive tests**: Coverage across all critical business logic
- **Test isolation**: Each test creates its own data and cleans up afterward

### **Development Tools**
- **tsx**: TypeScript execution for development and testing
- **pnpm**: Fast, disk-efficient package manager
- **ESLint**: Code quality and consistency
- **Git**: Version control with GitHub integration

---

## 📊 Database Schema

### **Core Business Tables**

**organizations**
- Tenant isolation root table
- Each organization has completely separate data

**users**
- User accounts with role-based permissions (user, org_owner, super_admin)
- Linked to organizations for multi-tenant access control
- Password hash for authentication

**pricelists**
- Named collections of products (e.g., "Supplier A - Building Materials")
- Organization-scoped for data isolation

**pricelist_items**
- Individual products with SKU, pricing, and pack information
- Pack size, pack buy price, loose buy price, RRP, sell price
- Organization-scoped, linked to pricelists

**customers**
- Customer contact information and billing addresses
- Organization-scoped with complete quote history

**suppliers**
- Supplier contact information with key contacts and PO email
- Organization-scoped with complete purchase order history

**quotes**
- Customer quotes with status tracking (draft, sent, accepted, declined)
- Calculated totals: total amount, total margin, margin percentage
- Organization-scoped, linked to customers

**quote_items**
- Line items for quotes with quantity, sell price, buy price
- Calculated margin and line total
- Linked to quotes and optionally to pricelist items

**purchase_orders**
- Supplier purchase orders with delivery method and shipping address
- Calculated total amount (no margin tracking)
- Organization-scoped, linked to suppliers

**purchase_order_items**
- Line items for purchase orders with quantity and buy price
- Smart pricing: automatically uses pack or loose buy price based on quantity
- Linked to purchase orders and optionally to pricelist items

**company_settings**
- Organization-level settings shared across all users
- Company name, ABN/ACN, address, contact details, logo URL

---

## 🏗️ Architecture Highlights

### **Multi-Tenant Data Isolation**
Every business entity (pricelists, customers, suppliers, quotes, purchase orders) includes an `organizationId` foreign key. All database queries automatically filter by the current user's organization through middleware, ensuring complete data separation between tenants.

### **Type-Safe API Layer**
tRPC provides end-to-end type safety from database to frontend. When you define a procedure on the backend, TypeScript automatically infers the input and output types on the frontend. No manual API documentation or type definitions required.

### **Smart Buy Price Logic**
The system automatically calculates the most cost-effective buy price based on order quantity. When quantity is less than pack size, it uses loose buy price. When quantity meets or exceeds pack size, it switches to pack buy price. This logic is tested with 8 comprehensive unit tests covering all edge cases.

### **Optimistic Updates**
The quote and purchase order builders use optimistic updates for instant UI feedback. When you edit quantity or price, the UI updates immediately while the save happens in the background. If the save fails, the UI automatically rolls back to the previous state.

### **Organization Context Middleware**
Custom tRPC middleware (`orgProcedure`) ensures every business operation includes the user's organization context. This prevents accidental cross-organization data access and simplifies query logic throughout the application.

### **Role-Based Procedures**
Three custom tRPC procedures enforce permissions:
- `orgProcedure`: Requires user to belong to an organization (all business operations)
- `orgOwnerProcedure`: Requires org_owner or super_admin role (team management)
- `superAdminProcedure`: Requires super_admin role (global organization management)

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 22 or later
- pnpm package manager
- PostgreSQL database (or TiDB Cloud account)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/NathanDevEdge/tradeflow-v1.git
cd tradeflow-v1

# Install dependencies
pnpm install

# Set up environment variables
# Copy .env.example to .env and configure:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Random secret for session signing
# - AWS S3 credentials for file storage
# - OAuth configuration (if using Manus OAuth)

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### **Running Tests**

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### **Building for Production**

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

---

## 📁 Project Structure

```
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   └── DashboardLayout.tsx
│   │   ├── pages/           # Page-level components
│   │   │   ├── Home.tsx     # Landing page
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Quotes.tsx
│   │   │   ├── QuoteBuilder.tsx
│   │   │   ├── PurchaseOrders.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   ├── Pricelists.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── OrganizationUsers.tsx
│   │   ├── lib/
│   │   │   └── trpc.ts      # tRPC client configuration
│   │   ├── App.tsx          # Routes and layout
│   │   └── main.tsx         # Application entry point
│   └── public/              # Static assets
├── server/                   # Backend Express + tRPC application
│   ├── _core/               # Framework-level code (don't modify)
│   ├── routers.ts           # tRPC API procedures
│   ├── db.ts                # Database query helpers
│   ├── pdf.ts               # PDF generation logic
│   ├── email.ts             # Email sending functionality
│   ├── organizationMiddleware.ts  # Multi-tenant middleware
│   └── *.test.ts            # Vitest test files
├── drizzle/                 # Database schema and migrations
│   └── schema.ts            # Drizzle ORM schema definitions
├── shared/                  # Shared types and constants
└── storage/                 # S3 storage helpers
```

---

## 🧪 Testing Strategy

TradeFlow includes 53 comprehensive tests covering all critical business logic:

### **Test Coverage**
- **CSV Validation** (4 tests): Column name normalization, required fields, optional fields
- **Pricelist Management** (8 tests): CRUD operations, organization isolation
- **Customer & Supplier Management** (4 tests): CRUD operations, organization isolation
- **Quote System** (10+ tests): Creation, margin calculations, status workflow, totals recalculation
- **Purchase Order System** (10+ tests): Creation, smart buy price logic, totals calculation
- **Buy Price Logic** (8 tests): Pack vs loose pricing, quantity thresholds, edge cases
- **PDF Generation** (4 tests): Quote PDFs (no margins), PO PDFs (only buy prices), data separation
- **Authentication** (11 tests): Login, logout, session management, role-based access
- **Contact Form** (5 tests): Submission, validation, email notifications

### **Testing Approach**
Each test creates its own test data and cleans up afterward to ensure test isolation. Tests use the actual tRPC procedures (not mocked) to verify end-to-end functionality including database operations, middleware, and business logic.

---

## 🔐 Security Features

### **Data Isolation**
Complete separation between organizations at the database level. Every query automatically filters by organizationId through middleware, preventing accidental cross-tenant data access.

### **Role-Based Access Control**
Three-tier permission system with middleware enforcement. Regular users can manage business data, org owners can manage team members, and super admins have global access.

### **Secure Authentication**
JWT-based session management with HTTP-only cookies. Password hashing with bcrypt for custom authentication. OAuth integration for enterprise single sign-on.

### **Input Validation**
Zod schema validation on all tRPC procedures. Type-safe inputs prevent injection attacks and ensure data integrity.

### **File Upload Security**
S3 storage with organization-scoped paths. Random suffixes on file keys prevent enumeration attacks. Public bucket with non-guessable URLs for PDF access.

---

## 🎨 Design Philosophy

TradeFlow prioritizes **usability for small businesses** over complex enterprise features. The interface is designed for speed and simplicity:

- **Inline editing** with optimistic updates for instant feedback
- **Searchable selects** instead of dropdowns for faster data entry
- **Clickable table rows** for intuitive navigation
- **Real-time calculations** for immediate margin visibility
- **Professional PDFs** with clean typography and company branding
- **Minimal clicks** to complete common workflows (create quote, add items, send to customer)

The permission model reflects small business needs: by default, all team members can manage business data without permission bottlenecks. Organization owners handle team administration, keeping the system flexible and efficient.

---

## 📈 Roadmap

### **Planned Features**
- Audit logging for accountability and compliance
- Email quote PDFs directly to customers
- Quote templates for frequently-used product combinations
- Per-organization permission configuration
- Advanced reporting and analytics
- Multi-currency support
- Inventory tracking integration
- Mobile-responsive quote builder

---

## 🤝 Contributing

TradeFlow is currently a private project. For questions or feature requests, please contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 🏢 About

TradeFlow is developed by **DevEdge** for small businesses in the wholesale distribution industry. Built with modern web technologies and enterprise-grade architecture, TradeFlow combines the simplicity of spreadsheet-based workflows with the power of a professional SaaS platform.

**Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Production Ready  
**Test Coverage**: 53 passing tests  
**Tech Stack**: React 19, TypeScript, tRPC 11, PostgreSQL, Tailwind CSS 4

---

## 📞 Support

For technical support, feature requests, or bug reports, please contact:
- **Email**: support@devedge.com.au
- **Website**: https://tradeflow.devedge.com.au

---

**Built with ❤️ for wholesale distributors, installers, and builders**
