# Coolify Deployment Guide - Monolithic Architecture

## Prerequisites

1. **Coolify Instance**: Have Coolify installed and running
2. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket
3. **Domain** (optional): Custom domain for your app
4. **PostgreSQL Database**: Ensure you have access to a PostgreSQL instance
5. **Browserless Instance** (optional): External Browserless for scraping

## Step 1: Push to GitHub

### Initialize Git (if not already done)
```bash
cd c:\Users\USER\geo
git init
git add .
git commit -m "Initial commit - monolithic app"
```

### Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `geomaster-bi`)
3. **Do NOT** initialize with README, .gitignore, or license

### Connect and Push
```bash
# Replace with your repository URL
git remote add origin https://github.com/YOUR_USERNAME/geomaster-bi.git
git branch -M main
git push -u origin main
```

## Step 2: Required Environment Variables

Create these in Coolify's environment variables section:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# API Keys (for enrichment features)
TAVILY_API_KEY=your-tavily-key
EXA_API_KEY=your-exa-key
FIRECRAWL_API_KEY=your-firecrawl-key
OPENAI_API_KEY=your-openai-key

# Browserless
BROWSERLESS_URL=wss://geobrowse.dependifyllc.com?token=YOUR_TOKEN

# Redis (optional)
REDIS_URL=your-redis-url

# Weaviate (optional)
WEAVIATE_HOST=your-weaviate-host
WEAVIATE_API_KEY=your-weaviate-key
WEAVIATE_SCHEME=https

# Server
NODE_ENV=production
PORT=3000
```

## Step 3: Deploy to Coolify

### Using Docker Compose (Recommended for Monolith)

1. **Connect Repository to Coolify**
   - In Coolify dashboard, click "New Resource" → "Application"
   - Select "Docker Compose" as deployment type
   - Connect your GitHub repository
   - Set root directory to `/` 
   - Select the `docker-compose.yml` file

2. **Configure Build**
   - Build pack: Docker Compose
   - Branch: `main` (or your production branch)
   - Dockerfile: `./Dockerfile` (root Dockerfile)

3. **Set Environment Variables**
   - Add all variables listed above in Coolify's environment section
   - **Important**: Set `DATABASE_URL` to point to your Coolify PostgreSQL database

4. **Database Configuration**
   - Option A: Use Coolify's PostgreSQL database service
   - Option B: Connect to external database (update `DATABASE_URL`)
   - The app will use the remote database specified in `DATABASE_URL`

5. **Deploy**
   - Click "Deploy" in Coolify
   - Wait for build to complete (may take 5-10 minutes)
   - Access your app via the provided URL

## Step 4: Post-Deployment Setup

### Initial Database Setup (One-time)

After first deployment, run these commands in Coolify's terminal:

```bash
# Access the container
docker exec -it <container-name> sh

# Navigate to server directory
cd server

# Run database migrations
npm run db:push

# Seed admin user (if not already exists)
npx tsx seed-admin.ts
```

### Verify Deployment
1. Access the app URL provided by Coolify
2. Login with `admin` / `S3$@dsw543CSaw` (or the password you set)
3. Change admin password immediately in the UI
4. Test basic functionality:
   - Create a new search
   - Verify Browserless connection (check logs)
   - Test business enrichment

## Architecture Notes

### Monolithic Structure
- **Single Container**: The app runs as a single Docker container
- **Static Files**: Client is built and served by the server
- **Port**: Only port 3000 is exposed
- **Build**: Root `Dockerfile` handles both client and server builds

### Services
- **App**: Main application (client + server)
- **Database**: PostgreSQL (managed by Coolify or external)
- **Browserless**: External service (no local container)

## Troubleshooting

### Build Failures
```bash
# Test build locally first
npm run build

# If fails, check logs
docker-compose up --build
```

### Database Connection Issues
- Verify `DATABASE_URL` format matches your database
- Check if PostgreSQL is accessible from container
- Ensure SSL settings match your database config
- The app now uses the DATABASE_URL from environment, not the one in docker-compose

### Browserless Connection Issues
- Verify `BROWSERLESS_URL` includes the token parameter
- Check Browserless dashboard for connection logs
- Test connection: `cd server && npx tsx test-browserless-connection.ts`

### API Connection Issues
- Client now uses relative paths (`/api`)
- No CORS issues since everything is on the same domain
- Check network tab in browser DevTools

## Updating the App

After making changes:

```bash
# Commit changes
git add .
git commit -m "Description of changes"
git push origin main

# In Coolify, click "Redeploy"
```

The app will automatically rebuild and redeploy.

## Security Checklist

- [x] `.env` files excluded from git
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL (Coolify handles this)
- [ ] Restrict database access
- [ ] Monitor API key usage
- [ ] Regular security updates: `npm audit`

## Quick Reference

**Admin Login**: `admin` / `S3$@dsw543CSaw`

**Endpoints**:
- Application: `https://your-domain.com`
- API: `https://your-domain.com/api`

**Common Commands**:
```bash
# View logs
docker logs -f <container-name>

# Access container
docker exec -it <container-name> sh

# Restart service
docker restart <container-name>

# Check environment variables
docker exec <container-name> env
```

## Support

If you encounter issues:
1. Check Coolify logs in the dashboard
2. Verify all environment variables are set
3. Test the build locally with `docker-compose up --build`
4. Check the walkthrough.md for detailed changes
