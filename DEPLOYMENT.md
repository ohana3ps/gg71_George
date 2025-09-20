
# GarageGrid Lite - Deployment Guide

## Deployment Issues Fixed

### 1. Authentication Configuration
- Removed deprecated `url` property from NextAuth options
- Fixed cookie configuration for production deployment
- Added proper secure cookie handling

### 2. Metadata Configuration
- Added `metadataBase` property to resolve Open Graph and Twitter image warnings
- Configured dynamic URL resolution based on environment

### 3. Environment Variables Setup
The following environment variables must be configured for deployment:

#### Required for Production
```bash
# Database
DATABASE_URL="your_production_database_url"

# Authentication - CRITICAL: Update this to your actual domain
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your_secure_secret_key"

# API Keys
ABACUSAI_API_KEY="your_api_key"

# App Configuration
NEXT_PUBLIC_APP_NAME="GarageGrid_Lite"
NODE_ENV="production"
```

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Update `NEXTAUTH_URL` to your actual domain
- [ ] Verify `DATABASE_URL` points to production database
- [ ] Ensure `NEXTAUTH_SECRET` is a secure random string
- [ ] Configure `ABACUSAI_API_KEY` if using AI features

### 2. Database Setup
- [ ] Run database migrations: `yarn prisma migrate deploy`
- [ ] Seed initial data: `yarn prisma db seed`
- [ ] Verify database connectivity

### 3. Build Verification
- [ ] Run `yarn build` to ensure clean production build
- [ ] Check for any TypeScript errors
- [ ] Verify all pages generate correctly

### 4. Security Configuration
- [ ] HTTPS must be enabled for production
- [ ] Secure cookies will be automatically enabled in production
- [ ] CORS settings are configured in NextAuth

## Deployment Commands

### Build for Production
```bash
cd /path/to/project/app
yarn install --frozen-lockfile
yarn prisma generate
yarn prisma migrate deploy
yarn build
yarn start
```

### Environment Setup
Create a production `.env` file with the required variables above.

## Common Issues & Solutions

### 1. "No session cookie found" Error
- **Cause**: Incorrect `NEXTAUTH_URL` or HTTPS/cookie configuration
- **Solution**: Ensure `NEXTAUTH_URL` matches your exact deployment domain with protocol

### 2. Database Connection Issues
- **Cause**: Wrong `DATABASE_URL` or network restrictions
- **Solution**: Verify database URL and ensure deployment environment can access database

### 3. Build Warnings
- **Cause**: Missing `metadataBase` in metadata configuration
- **Solution**: Fixed in this update - `metadataBase` now configured dynamically

### 4. CSRF Token Issues
- **Cause**: Cookie domain/security mismatches
- **Solution**: Configured proper cookie settings for production/development environments

## Testing Deployment

1. Build the application: `yarn build`
2. Start production server: `yarn start`
3. Test authentication flow
4. Verify all pages load correctly
5. Check database connectivity

## Notes
- The app uses JWT strategy for sessions (stateless)
- All cookies are properly configured for security
- Database schema includes audit trails for user actions
- Shared data architecture allows all users to access the same inventory
