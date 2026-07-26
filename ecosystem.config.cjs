module.exports = {
  apps: [
    {
      name: "availabilityshield-protected-app",
      script: "src/protected-app/server.js",
      cwd: __dirname,
      env_production: {
        NODE_ENV: "production",
        DOTENV_CONFIG_PATH: ".env.production"
      }
    },
    {
      name: "availabilityshield-gateway",
      script: "src/gateway/server.js",
      cwd: __dirname,
      env_production: {
        NODE_ENV: "production",
        DOTENV_CONFIG_PATH: ".env.production"
      }
    },
    {
      name: "availabilityshield-frontend",
      script: "frontend/node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 5173",
      cwd: __dirname,
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
