module.exports = {
  apps: [
    {
      name: 'server',
      script: 'server.js',
      args: '-c config/server.yml',
    },
    {
      name: 'client',
      script: 'server.js',
      args: '-c config/client.yml',
    },
  ],
}
