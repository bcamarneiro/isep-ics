# Secrets Directory

This directory contains sensitive configuration files for production deployment.

## Files Required

- `isep_username.txt` - Your ISEP portal username
- `isep_password.txt` - Your ISEP portal password

## Setup Instructions

1. Create the secret files:
   ```bash
   echo "your_username" > secrets/isep_username.txt
   echo "your_password" > secrets/isep_password.txt
   ```

2. Set proper permissions:
   ```bash
   chmod 600 secrets/*.txt
   ```

3. Deploy with production compose:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## Security Notes

- These files contain sensitive information
- Never commit these files to version control
- Use proper file permissions (600)
- Consider using external secret management systems in production
