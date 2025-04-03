#!/bin/bash

echo "Setting up Holder Data Loader Tool..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Setup complete! You can now run the tool with 'npm start'" 