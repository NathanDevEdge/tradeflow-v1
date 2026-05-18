-- Run this AFTER uploading logos to S3
-- Replace YOUR_BUCKET and YOUR_REGION with your actual values
-- e.g. https://tradeflow-assets.s3.ap-southeast-2.amazonaws.com/...

UPDATE company_settings
SET logo_url = 'https://YOUR_BUCKET.s3.YOUR_REGION.amazonaws.com/company-logos/logo-1768735783563-p9gt5q.png'
WHERE organizationId = 30001;

UPDATE company_settings
SET logo_url = 'https://YOUR_BUCKET.s3.YOUR_REGION.amazonaws.com/company-logos/logo-1768771974768-z4jzir.jpg'
WHERE organizationId = 1;

-- Verify
SELECT organizationId, company_name, logo_url FROM company_settings;
