#!/bin/bash

# Ensure jq and Heroku CLI are installed
if ! command -v jq &> /dev/null || ! command -v heroku &> /dev/null; then
    echo "Error: This script requires both jq and the Heroku CLI to be installed."
    exit 1
fi

# Extract the Heroku app name (branch name) from sensei.json
HEROKU_APP_NAME=$(jq -r '.branch' sensei.json)

if [ "$HEROKU_APP_NAME" == "null" ] || [ -z "$HEROKU_APP_NAME" ]; then
    echo "Error: Branch (Heroku app) name not found in sensei.json."
    exit 1
fi

# Setup guides in sensei.json and .env, and configure Heroku variables
while (( "$#" >= 3 )); do
  name=$1
  description=$2
  uri=$3

  # Remove a trailing slash from the uri if present
  uri="${uri%/}"
  
  # Update sensei.json with new guide
  jq --arg name "$name" --arg desc "$description" '.guides += [{"name": $name, "description": $desc}]' sensei.json > temp.json && mv temp.json sensei.json

  # Add URI to .env file
  echo "$name=$uri" >> .env

  # Add URI to Heroku config using the dynamically obtained app name
  heroku config:set "$name=$uri" --app "$HEROKU_APP_NAME"

  # Shift arguments to move to the next set (name, description, URI)
  shift 3
done

echo "Guides setup completed."
