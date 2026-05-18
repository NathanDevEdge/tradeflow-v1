-- TradeFlow post-import patches
-- Run this AFTER importing tradeflow_db_dump.sql
-- It switches Nathan's login from Manus OAuth to email/password

-- Switch super admin to email/password login
-- Email: nathan@developeredge.net
-- Password: TF-EQQ5-KKUL-6551  (change this after first login!)
UPDATE users SET
  loginMethod = 'email',
  passwordHash = '$2b$10$zc0xq9ax9QLKjBCroRHJbu5.2Izr/kChkRd/9TwWrO4YuVzwHBahG',
  openId = NULL
WHERE id = 1;

-- Verify the change
SELECT id, email, role, loginMethod, openId FROM users WHERE id = 1;
