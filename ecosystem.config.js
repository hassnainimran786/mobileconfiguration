module.exports = {
    apps: [
      {
        name: 'mobileappconfigurations', // Choose a unique name for your app
        script: 'app.js', // Your main application file
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        error_file: 'stdout.err.log',
        out_file: 'stdout.log',
        log_date_format: 'YYYY-MM-DD HH:mm Z',
        merge_logs: true,
        env: {
          PORT: 5400, // You can set other environment variables here
        },
      },
    ],
  };
  