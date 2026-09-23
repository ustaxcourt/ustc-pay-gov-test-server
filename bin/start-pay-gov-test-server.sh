#!/bin/bash -e
function create_env_file () {
  read -p "Enter a port to use for test server: " port
  # No access token is written: local runs skip authentication entirely.
  # BASE_URL is required — the server substitutes it into the service address
  # inside the WSDL it serves, and renders "undefined/wsdl/" without it.
  # APP_ENV is not written here; `npm run dev` sets APP_ENV=local itself.
  printf 'PORT=%s\nBASE_URL=http://localhost:%s\n' "$port" "$port" > .env
}

cd $(npm root)/@ustaxcourt/ustc-pay-gov-test-server

if [ ! -f .env ]; then
  echo "Environment variables have not been set up."
  create_env_file
elif [ -n "$1" ] && [ "$1" = "update-env" ]; then
  echo "Updating environment variables."
  create_env_file
fi

npm run dev
