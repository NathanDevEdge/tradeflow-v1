-- TradeFlow v2 Feature Migration
-- Run this ONCE on the production database after deploying the v2 code.
-- All columns are nullable so existing data is unaffected.
-- Safe to run again — uses IF NOT EXISTS / IGNORE patterns where possible.

-- ============================================================
-- quotes: new columns
-- ============================================================
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS `terms`          TEXT          NULL AFTER `notes`,
  ADD COLUMN IF NOT EXISTS `internalNotes`  TEXT          NULL AFTER `terms`,
  ADD COLUMN IF NOT EXISTS `expiresAt`      TIMESTAMP     NULL AFTER `internalNotes`,
  ADD COLUMN IF NOT EXISTS `discountPercent` DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER `expiresAt`,
  ADD COLUMN IF NOT EXISTS `sentAt`          TIMESTAMP     NULL AFTER `discountPercent`,
  ADD COLUMN IF NOT EXISTS `invoiceNumber`  VARCHAR(100)  NULL AFTER `sentAt`,
  ADD COLUMN IF NOT EXISTS `invoicedAt`     TIMESTAMP     NULL AFTER `invoiceNumber`,
  ADD COLUMN IF NOT EXISTS `paidAt`         TIMESTAMP     NULL AFTER `invoicedAt`;

-- ============================================================
-- purchase_orders: traceability column
-- ============================================================
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS `sourceQuoteId`  INT           NULL AFTER `notes`;
