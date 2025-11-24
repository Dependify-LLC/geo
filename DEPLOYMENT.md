# Deployment Guide for Coolify

## Prerequisites
- Coolify instance running
- Domain name (optional, but recommended)
- API keys for Tavily, Exa, and Firecrawl

## Step 1: Prepare Your Repository

1. Commit all files to your Git repository:
   ```bash
   git add .
   git commit -m "Add Browserless integration and Docker support"
   git push
   ```

## Step 2: Import to Coolify

1. Log into your Coolify dashboard
2. Click **"New Resource"** → **"Docker Compose"**
3. Select your Git repository
4. Coolify will automatically detect `docker-compose.yml`

## Step 3: Configure Environment Variables

In Coolify, add these environment variables:

```bash
# Server
PORT=3000
DATABASE_URL=postgres://postgres:CHANGE_ME@postgres:5432/geomaster_bi
BROWSERLESS_URL=ws://browserless:3000

# API Keys
TAVILY_API_KEY=your_tavily_key
EXA_API_KEY=your_exa_key
FIRECRAWL_API_KEY=your_firecrawl_key

# Browserless (optional security)
TOKEN=your_secure_token_here

# PostgreSQL
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_USER=postgres
POSTGRES_DB=geomaster_bi
```

> [!WARNING]
> **Change the default passwords!** Replace `CHANGE_ME` with secure passwords.

## Step 4: Configure Persistent Storage

In Coolify, set up persistent volumes:
- **PostgreSQL data**: `/var/lib/postgresql/data` → Mount to persistent volume

## Step 5: Deploy

1. Click **"Deploy"**
2. Coolify will build and start all services:
   - Browserless (port 3001)
   - PostgreSQL (port 5432)
   - Server (port 3000)
   - Client (port 5173)

3. Monitor deployment logs for any errors

## Step 6: Set Up Domain (Optional)

1. In Coolify, go to your application settings
2. Add your domain name
3. Enable SSL/TLS (Let's Encrypt)
4. Point your DNS to Coolify server IP

## Step 7: Verify Deployment

1. Check service health:
   - Browserless: `http://your-domain:3001` (or IP)
   - API: `http://your-domain:3000/api/health` (if you create health endpoint)
   - Frontend: `http://your-domain:5173`

2. Run a test search to verify everything works

## Troubleshooting

### Services Won't Start
- Check Coolify logs for each service
- Verify environment variables are set correctly
- Ensure ports aren't conflicting

### Can't Connect to Database
- Verify `DATABASE_URL` matches PostgreSQL service settings
- Check if PostgreSQL container is healthy
- Review PostgreSQL logs

### Browserless Connection Fails
- Ensure `BROWSERLESS_URL=ws://browserless:3000` (note `ws://` protocol)
- Check Browserless container logs
- Verify network connectivity between containers

### High Memory Usage
- Reduce `CONCURRENT` sessions in Browserless
- Add memory limits in docker-compose.yml:
  ```yaml
  browserless:
    deploy:
      resources:
        limits:
          memory: 2G
  ```

## Updating the Application

1. Push changes to your Git repository
2. In Coolify, click **"Redeploy"**
3. Coolify will pull latest code and rebuild

## Monitoring

Monitor your application:
- **Coolify Dashboard**: View logs, resource usage
- **Browserless Dashboard**: `http://your-domain:3001` (track browser sessions)
- **Database**: Use a PostgreSQL client to monitor DB

## Scaling

To handle more concurrent searches:

1. Increase Browserless concurrency:
   ```yaml
   environment:
     - CONCURRENT=20  # Increase from 10
   ```

2. Add more resources to containers
3. Consider horizontal scaling with multiple Browserless instances

## Backup

Coolify handles backups automatically, but you can also:

1. **Database Backup**:
   ```bash
   docker exec geomaster-postgres pg_dump -U postgres geomaster_bi > backup.sql
   ```

2. **Restore**:
   ```bash
   docker exec -i geomaster-postgres psql -U postgres geomaster_bi < backup.sql
   ```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Set Browserless TOKEN for security
- [ ] Enabled HTTPS/SSL
- [ ] Restricted database port (don't expose publicly)
- [ ] Set up firewall rules
- [ ] Regularly update Docker images

---

**Need Help?** Check Coolify documentation or Browserless docs for more details.
