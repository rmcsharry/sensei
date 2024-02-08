#!/bin/bash

# Check if project name, OpenAI API key, and session secret were provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 project-name YOUR-OPENAI-API-KEY YOUR-SESSION-SECRET"
    exit 1
fi

PROJECT_NAME=$1
OPENAI_API_KEY=$2
SESSION_SECRET=$3

# Install dependencies
yarn

# Login to Heroku
heroku login

# Update the branch name in sensei.json
jq --arg branch "$PROJECT_NAME" '.branch = $branch' sensei.json > temp.json && mv temp.json sensei.json

# Add the updated sensei.json to the staging area
git add sensei.json

# Commit the change with a message
git commit -m "update branch name in sensei.json to $PROJECT_NAME"

# Create a new Heroku app
heroku create "$PROJECT_NAME"

# Set Heroku config variables
heroku config:set OPENAI_API_KEY="$OPENAI_API_KEY" --app "$PROJECT_NAME"
heroku config:set SESSION_SECRET="$SESSION_SECRET" --app "$PROJECT_NAME"

# Add logging with Logtail free plan
heroku addons:create logtail:free --app "$PROJECT_NAME"

# Deploy a Postgres database under the basic plan
heroku addons:create heroku-postgresql:basic --app "$PROJECT_NAME"

# Create a database table to store messages
heroku pg:psql --app "$PROJECT_NAME" <<EOF
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(255),
    content TEXT,
    guide VARCHAR(255),
    companion VARCHAR(255),
    thread VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Create a database table to store companions (accounts that send queries, could be human or AI)
heroku pg:psql --app "$PROJECT_NAME" <<EOF
CREATE TABLE companions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    hashedpassword VARCHAR(255),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Index messages by guide, companion, and thread for easy retrieval
heroku pg:psql --app "$PROJECT_NAME" <<EOF
CREATE INDEX idx_messages_guide ON messages(guide);
CREATE INDEX idx_messages_companion ON messages(companion);
CREATE INDEX idx_messages_thread ON messages(thread);
EOF

# Push the main branch to Heroku
git push $PROJECT_NAME $PROJECT_NAME:main

# Open the Heroku app in a browser
heroku open --app "$PROJECT_NAME"
