# Windows staging/production startup

1. Copy `.env.production.example` to `.env.production` and replace the domain.
2. Create the persistent directories:

   ```powershell
   New-Item -ItemType Directory -Force C:\ProgramData\AvailabilityShield\data
   New-Item -ItemType Directory -Force C:\ProgramData\AvailabilityShield\logs\layer4
   ```

3. Install Node dependencies and build the frontend:

   ```powershell
   npm run install:all
   npm run build
   npm install -g pm2
   ```

4. Start the Node services with PM2:

   ```powershell
   npm run start:production
   pm2 save
   ```

5. In a separate elevated PowerShell window, start Layer 4:

   ```powershell
   .\deploy\windows\start-layer4.ps1 -Mode enforce
   ```

Put IIS or another HTTPS reverse proxy in front of the frontend/gateway. Keep ports 3000 and 4000 private; expose only ports 80/443.
