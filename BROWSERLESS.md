# Browserless Integration

This application supports running with Browserless for scalable browser automation in containerized environments.

## Local Development

### Option 1: Use local browser (default)
No configuration needed. The app will launch Chromium on your machine.

### Option 2: Use Browserless locally
1. Start Browserless container:
   ```bash
   docker run -p 3001:3000 browserless/chrome
   ```

2. Set environment variable in `server/.env`:
   ```bash
   BROWSERLESS_URL=ws://localhost:3001
   ```

## Production Deployment (Coolify)

### Using Docker Compose

1. **Update `docker-compose.yml`** with your actual values:
   - Replace `your_postgres_password_here`
   - Replace `your_browserless_token_here` (optional, for security)
   - Add your API keys

2. **Deploy to Coolify**:
   - Import the repository
   - Coolify will detect `docker-compose.yml` automatically
   - Set environment variables in Coolify UI
   - Deploy!

### Environment Variables for Coolify

Set these in Coolify's environment configuration:

```bash
# Database
DATABASE_URL=postgres://postgres:password@postgres:5432/geomaster_bi

# Browser
BROWSERLESS_URL=ws://browserless:3000

# API Keys
TAVILY_API_KEY=your_key
EXA_API_KEY=your_key
FIRECRAWL_API_KEY=your_key
```

### Browserless Configuration

The Browserless service is configured with:
- **10 concurrent sessions** (adjust `CONCURRENT` in docker-compose.yml)
- **5-minute timeout** per session
- **Keep-alive enabled** for better performance
- **Anti-detection flags** for scraping

## Benefits

✅ **No local browser required** - Runs in containers
✅ **Scalable** - Handle multiple searches simultaneously
✅ **Reliable** - Browserless optimized for automation
✅ **Easy deployment** - Works great with Coolify
✅ **Cost-effective** - Self-hosted, no external service fees

## Monitoring

- Browserless dashboard: `http://localhost:3001` (local) or `http://browserless:3000` (in container network)
- Check browser sessions, usage, and performance

## Troubleshooting

**Can't connect to Browserless:**
- Ensure Browserless container is running
- Check `BROWSERLESS_URL` environment variable
- Verify network connectivity between containers

**Browser closes immediately:**
- Increase `TIMEOUT` in Browserless environment
- Check Browserless logs: `docker logs geomaster-browserless`

**CAPTCHA issues:**
- CAPTCHA handling works with Browserless
- The 60s/30s delays allow manual solving even in remote browser
- Consider using rotating proxies for better CAPTCHA avoidance
