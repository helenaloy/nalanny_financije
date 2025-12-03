#!/bin/bash

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps

# Build frontend
echo "Building frontend..."
npm run build

echo "Build completed successfully!"

