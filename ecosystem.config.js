module.exports = {
  apps: [{
    name: 'wedding-api',
    script: 'server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster', // Enable cluster mode
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 3000
  }]
};}