// PM2 process file for the VPS (installed at /srv/ooa/ecosystem.config.cjs). The app always runs from the "current" link,
// so switching the link and reloading is all a deployment or rollback has to do.
module.exports = {
  apps: [
    {
      name: 'ooa',
      script: 'server.js',
      cwd: '/srv/ooa/current',
      env: { NODE_ENV: 'production', PORT: 3000 },
      max_memory_restart: '700M',
      kill_timeout: 5000,
      time: true,
    },
  ],
};
