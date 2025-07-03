#!/bin/sh
# This script configures and then runs the IPFS daemon.

# Exit if any command fails
set -e

# This is the location of the IPFS repository inside the Docker container
IPFS_PATH=/data/ipfs

# Initialize the IPFS repository with a default profile if it doesn't exist
if [ ! -d "$IPFS_PATH/blocks" ]; then
  echo "Initializing IPFS repository at $IPFS_PATH..."
  # The 'server' profile is recommended for nodes that are not behind a NAT
  ipfs init --profile server
else
  echo "IPFS repository already exists at $IPFS_PATH."
fi

echo "Setting IPFS API and Gateway to listen on all interfaces (0.0.0.0)..."
# Set the API and Gateway addresses to be accessible from outside the container
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

echo "Starting IPFS daemon..."
# Start the IPFS daemon. The 'exec' command replaces the shell process with the daemon.
exec ipfs daemon
