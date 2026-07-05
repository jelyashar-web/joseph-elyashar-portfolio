/**
 * PM2 Ecosystem Configuration
 * Manages both the API backend and static site serving
 */

module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './api/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      watch: false,
      log_file: './logs/api-server.log',
      out_file: './logs/api-server.out.log',
      error_file: './logs/api-server.err.log',
      merge_logs: true,
      time: true,
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: '10s',
    },
    {
      name: 'static-site',
      script: 'npx',
      args: 'serve dist -l 3000 --no-clipboard',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      log_file: './logs/static-site.log',
      out_file: './logs/static-site.out.log',
      error_file: './logs/static-site.err.log',
      merge_logs: true,
      time: true,
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '5s',
    },
  ],
}
