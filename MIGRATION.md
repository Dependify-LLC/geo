# Database Migration Guide

This guide explains how to migrate your data from your existing `geomaster-postgres` container to your new Coolify managed database.

## Prerequisites

- You need `docker` installed and running (if migrating from a local container).
- You need `postgresql-client` (specifically `psql`) installed on your machine to run the restore command.

## Connection Details

**New Database URL:**
```
postgres://postgres:rXgNx0MMimBIJi4v5mJ7qHBVuwvbRQRF3K9773bG9wPGjSlavh3sszgEJPjxYSsl@20.14.88.69:5432/geomaster_bi
```

## Migration Steps

### 1. Backup Existing Data

Run this command to create a backup of your current data from the running container.

**If running locally:**
```bash
docker exec -t geomaster-postgres pg_dump -U postgres geomaster_bi > dump.sql
```

**If running on a server (old deployment):**
SSH into your server and run the same command above. Then download the `dump.sql` file to your local machine.

### 2. Restore to New Database

Run this command to restore the data to the new managed database.

```bash
psql "postgres://postgres:rXgNx0MMimBIJi4v5mJ7qHBVuwvbRQRF3K9773bG9wPGjSlavh3sszgEJPjxYSsl@20.14.88.69:5432/geomaster_bi" < dump.sql
```

> [!NOTE]
> If you don't have `psql` installed locally, you can use a temporary docker container to run the restore:
> ```bash
> docker run -i --rm postgres:15-alpine psql "postgres://postgres:rXgNx0MMimBIJi4v5mJ7qHBVuwvbRQRF3K9773bG9wPGjSlavh3sszgEJPjxYSsl@20.14.88.69:5432/geomaster_bi" < dump.sql
> ```

### 3. Verify Migration

After the command completes, your data should be in the new database. You can verify by connecting to it:

```bash
psql "postgres://postgres:rXgNx0MMimBIJi4v5mJ7qHBVuwvbRQRF3K9773bG9wPGjSlavh3sszgEJPjxYSsl@20.14.88.69:5432/geomaster_bi"
```
Then run `\dt` to list tables.
