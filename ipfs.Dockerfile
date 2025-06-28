# Start with the official go-ipfs image as the base
FROM ipfs/go-ipfs:latest

# Copy the startup script you created into a known executable path
# This location is in the container's $PATH
COPY start_ipfs.sh /usr/local/bin/start_ipfs.sh

# Make the script executable inside the container
RUN chmod +x /usr/local/bin/start_ipfs.sh

# Set our script as the container's entrypoint.
# This overrides the base image's default entrypoint (which is the ipfs binary)
# and ensures our script is run directly by the shell.
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start_ipfs.sh"]
