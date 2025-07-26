module.exports = {
  apps: [
    {
      name: 'wedding-api-5000',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'wedding-api-5001',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      }
    },
    {
      name: 'wedding-api-5002',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      }
    }
  ]
};