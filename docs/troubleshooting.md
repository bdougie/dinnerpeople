# Troubleshooting Guide

## Authentication Connection Errors

### Problem
When trying to sign in, you receive the following error:
```
POST http://localhost:54321/auth/v1/token?grant_type=password net::ERR_CONNECTION_REFUSED
```

### Cause
This error occurs when the application tries to connect to the local Supabase instance, but the Supabase server is not running.

### Solution

1. **Check if Docker is running**
   ```bash
   docker ps
   ```
   If Docker is not running, start Docker Desktop.

2. **Start Supabase local development server**
   ```bash
   npx supabase start
   ```

3. **Verify your environment variables**
   Ensure your `.env` file contains the correct local Supabase configuration. After running `npx supabase start`, use the provided local development keys:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<use the anon key from supabase start output>
   SUPABASE_SERVICE_ROLE_KEY=<use the service_role key from supabase start output>
   ```

4. **Restart your development server**
   After updating environment variables, restart your Vite development server for the changes to take effect.

### Additional Notes
- The local Supabase instance runs on port 54321
- Make sure no other services are using this port
- You can access Supabase Studio at http://127.0.0.1:54323 when the server is running