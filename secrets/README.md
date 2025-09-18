# Secrets Directory

This directory contains sensitive configuration files for production deployment.

## Files Required

- `isep_username.txt` - Your ISEP portal username
- `isep_password.txt` - Your ISEP portal password
- `isep_code_user.txt` - Your ISEP student code
- `isep_code_user_code.txt` - Your ISEP student code (usually same as above)

## Setup Instructions

1. Create the secret files:
   ```bash
   echo "your_username" > secrets/isep_username.txt
   echo "your_password" > secrets/isep_password.txt
   echo "your_student_code" > secrets/isep_code_user.txt
   echo "your_student_code" > secrets/isep_code_user_code.txt
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
