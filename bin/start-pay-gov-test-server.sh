#!/bin/bash -e
function create_env_file () {
  read -p "Enter a port to use for test server: " port
  read -p "Enter an access token to use when authenticating requests: " access_token
  printf "PORT=$port\nACCESS_TOKEN=$access_token" > .env
}

cd $(npm root)/@ustaxcourt/ustc-pay-gov-test-server

if [ ! -f .env ]; then
  echo "Environment variables have not been set up."
  create_env_file
elif [ -n $1 ] && [ "$1" = "update-env" ]; then
  echo "Updating environment variables."
  create_env_file
fi

npm run dev