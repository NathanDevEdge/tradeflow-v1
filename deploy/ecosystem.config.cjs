module.exports = {
  apps: [
    {
      name: "tradeflow",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart if crashes, don't restart if it exits cleanly
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      // Logging
      out_file: "./logs/app.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
