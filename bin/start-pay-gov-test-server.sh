#!/bin/bash -e
function create_env_file () {
  read -p "Enter a port to use for test server: " port
  # No access token is written: local runs skip authentication entirely.
  # BASE_URL is required — the server substitutes it into the service address
  # inside the WSDL it serves, and renders "undefined/wsdl/" without it.
  # APP_ENV is not written here; it is set to local when the server starts below.
  printf 'PORT=%s\nBASE_URL=http://localhost:%s\n' "$port" "$port" > .env
}

# $0 is usually a symlink in node_modules/.bin (or npm's global or npx cache),
# so resolve it to find the package root. Node is always present wherever this
# package is installed; `realpath` is not on older macOS.
package_dir=$(node -e 'console.log(require("path").resolve(require("fs").realpathSync(process.argv[1]), "../.."))' "$0")
cd "$package_dir"

if [ ! -f .env ]; then
  echo "Environment variables have not been set up."
  create_env_file
elif [ -n "$1" ] && [ "$1" = "update-env" ]; then
  echo "Updating environment variables."
  create_env_file
fi

# Run the prebuilt server. `npm run dev` would need typescript and concurrently,
# which are dev dependencies and aren't installed for consumers of this package.
APP_ENV=local exec node dist/server.js
