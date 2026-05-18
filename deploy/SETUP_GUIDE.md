# TradeFlow — Lightsail Deployment Guide

**Domain:** tradeflow.devedge.com.au  
**Server:** AWS Lightsail (Ubuntu 22/24 LTS)

---

## BEFORE YOU START — Things to have ready

- SSH access to your Lightsail instance
- The SQL dump: `tradeflow_db_dump.sql`
- The storage zip: `tradeflow_storage_files.zip`
- Your chosen DB password (you'll set this below)
- Access to your domain DNS (to add a subdomain A record)

---

## STEP 1 — Open Lightsail firewall ports

In the **AWS Lightsail console** → your instance → **Networking** tab, add these rules:

| Protocol | Port | Purpose |
|---|---|---|
| TCP | 80 | HTTP (Nginx) |
| TCP | 443 | HTTPS (Nginx + SSL) |

Port 22 (SSH) is already open.  
**Do NOT open port 3000** — Node only listens on localhost.

---

## STEP 2 — SSH into your server

```bash
ssh ubuntu@YOUR_LIGHTSAIL_IP
```

---

## STEP 3 — Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should show v22.x.x
```

---

## STEP 4 — Install pnpm

```bash
npm install -g pnpm
pnpm --version
```

---

## STEP 5 — Install MySQL

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure the installation
sudo mysql_secure_installation
# Answer: Yes to all prompts, set a root password
```

---

## STEP 6 — Create the TradeFlow database and user

```bash
sudo mysql -u root -p
```

Inside MySQL, run:

```sql
CREATE DATABASE tradeflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tradeflow'@'localhost' IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON tradeflow.* TO 'tradeflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Write down your DB password — you'll need it for the `.env` file.

---

## STEP 7 — Import the database dump

Upload the dump and patch files to the server first:

```bash
# Run these on your LOCAL machine (not the server)
scp ~/Downloads/tradeflow_db_dump.sql ubuntu@YOUR_LIGHTSAIL_IP:~/
scp path/to/tradeflow-v1/deploy/after-import.sql ubuntu@YOUR_LIGHTSAIL_IP:~/
```

Then on the **server**:

```bash
# Import the main dump
mysql -u tradeflow -p tradeflow < ~/tradeflow_db_dump.sql

# Apply the post-import patch (fixes your login)
mysql -u tradeflow -p tradeflow < ~/after-import.sql
```

---

## STEP 8 — Set up AWS S3

### 8a. Create an S3 bucket

1. Go to **AWS S3 console** → Create bucket
2. Name: `tradeflow-assets` (or whatever you like — must be globally unique)
3. Region: **Asia Pacific (Sydney) ap-southeast-2**
4. **Uncheck "Block all public access"** → confirm you want public access
5. Create bucket
6. Go into the bucket → **Permissions** tab → **Bucket policy** → paste this (replace YOUR_BUCKET_NAME):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### 8b. Create an IAM user for the app

1. Go to **AWS IAM console** → Users → Create user
2. Name: `tradeflow-app`
3. **Permissions**: Attach directly → search for `AmazonS3FullAccess` → select it
4. Create user → click the user → **Security credentials** tab → Create access key
5. Choose **Application running outside AWS** → Next → Create
6. **Copy the Access Key ID and Secret** — you won't see the secret again!

### 8c. Upload the logo files

```bash
# Unzip the logos on your local machine
unzip ~/Downloads/tradeflow_storage_files.zip -d ~/tradeflow_storage

# Upload to S3 (install AWS CLI if you don't have it: brew install awscli)
aws s3 cp ~/tradeflow_storage/s3_export/310519663073102775/Fk3otLE6cw9F5sfyFkJMQa/company-logos/ \
  s3://YOUR_BUCKET_NAME/company-logos/ --recursive
```

### 8d. Update logo URLs in the database

Edit `deploy/update-logo-urls.sql` — replace `YOUR_BUCKET` and `YOUR_REGION` with your actual values (e.g. `tradeflow-assets` and `ap-southeast-2`), then run:

```bash
mysql -u tradeflow -p tradeflow < ~/update-logo-urls.sql
```

---

## STEP 9 — Install PM2 (process manager)

```bash
sudo npm install -g pm2
```

---

## STEP 10 — Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

Copy the Nginx config:

```bash
# Upload the config from your local machine
scp path/to/tradeflow-v1/deploy/nginx.conf ubuntu@YOUR_LIGHTSAIL_IP:~/

# On the server:
sudo cp ~/nginx.conf /etc/nginx/sites-available/tradeflow
sudo ln -s /etc/nginx/sites-available/tradeflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # remove default site
sudo nginx -t   # test config — should say "ok"
sudo systemctl reload nginx
```

---

## STEP 11 — Deploy the app

```bash
# Clone or copy the project to the server
# Option A: if the code is on GitHub
git clone https://github.com/YOUR_REPO/tradeflow-v1.git ~/tradeflow
cd ~/tradeflow

# Option B: upload from your local machine
# scp -r path/to/tradeflow-v1 ubuntu@YOUR_LIGHTSAIL_IP:~/tradeflow
```

Then on the server inside `~/tradeflow`:

```bash
# Install dependencies
pnpm install

# Create the .env file
cp .env.example .env
nano .env
```

Fill in `.env`:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=paste-a-long-random-string-here   # generate with: openssl rand -base64 32
DATABASE_URL=mysql://tradeflow:YOUR_DB_PASSWORD@127.0.0.1:3306/tradeflow
AWS_ACCESS_KEY_ID=your-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-iam-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=ap-southeast-2
```

Then build and start:

```bash
pnpm build
mkdir -p logs
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # follow the command it prints to auto-start on reboot
```

Check it's running:

```bash
pm2 status
pm2 logs tradeflow --lines 30
```

---

## STEP 12 — Point DNS to your server

In your domain registrar (or wherever devedge.com.au DNS is managed):

Add an **A record**:
- Name/Host: `tradeflow`
- Value: `YOUR_LIGHTSAIL_IP`
- TTL: 300 (5 min)

DNS can take 5–30 minutes to propagate.

---

## STEP 13 — Set up SSL (HTTPS)

Once DNS has propagated (test with `ping tradeflow.devedge.com.au`):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tradeflow.devedge.com.au
```

Follow the prompts — enter your email, agree to terms. Certbot will automatically update your Nginx config for HTTPS and set up auto-renewal.

Test it:

```bash
sudo certbot renew --dry-run
```

---

## STEP 14 — Verify everything works

1. Visit **https://tradeflow.devedge.com.au**
2. Log in with:
   - Email: `nathan@developeredge.net`
   - Password: `TF-EQQ5-KKUL-6551`
3. **Change your password immediately** after logging in
4. Check that Debbie can still log in with her existing password (unchanged)
5. Check logos are showing correctly
6. Test generating a quote PDF

---

## Useful commands after deployment

```bash
# View live logs
pm2 logs tradeflow

# Restart the app (e.g. after a code update)
cd ~/tradeflow && pnpm build && pm2 restart tradeflow

# Check app status
pm2 status

# MySQL console
mysql -u tradeflow -p tradeflow
```

---

## Uploading code changes in the future

```bash
# On your local machine — build and push to server
pnpm build
rsync -avz --exclude node_modules --exclude .env dist/ ubuntu@YOUR_LIGHTSAIL_IP:~/tradeflow/dist/
ssh ubuntu@YOUR_LIGHTSAIL_IP "pm2 restart tradeflow"
```
