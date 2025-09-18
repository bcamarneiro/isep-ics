#!/bin/bash

# ISEP ICS Bridge - Secret Setup Script
# This script helps you set up secrets for both development and production

set -e

echo "🔐 ISEP ICS Bridge - Secret Setup"
echo "=================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env file with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Check if secrets directory exists
if [ ! -d "secrets" ]; then
    echo "📁 Creating secrets directory..."
    mkdir -p secrets
    echo "✅ Created secrets directory"
fi

# Check if secret files exist
if [ ! -f "secrets/isep_username.txt" ] || [ ! -f "secrets/isep_password.txt" ]; then
    echo "🔑 Setting up production secrets..."
    
    if [ ! -f "secrets/isep_username.txt" ]; then
        echo "Enter your ISEP username:"
        read -r username
        echo "$username" > secrets/isep_username.txt
        chmod 600 secrets/isep_username.txt
        echo "✅ Created secrets/isep_username.txt"
    fi
    
    if [ ! -f "secrets/isep_password.txt" ]; then
        echo "Enter your ISEP password:"
        read -rs password
        echo "$password" > secrets/isep_password.txt
        chmod 600 secrets/isep_password.txt
        echo "✅ Created secrets/isep_password.txt"
    fi
else
    echo "✅ Production secrets already exist"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your credentials for development"
echo "2. For development: docker compose up -d"
echo "3. For production: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "🔒 Security notes:"
echo "- .env file is for development only"
echo "- secrets/*.txt files are for production with Docker secrets"
echo "- Never commit these files to version control"
