#!/bin/bash

# Check if a branch name and API key were provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 branch-name OPENAI_API_KEY"
    exit 1
fi

BRANCH_NAME=$1
OPENAI_API_KEY=$2

# Create a new branch
git checkout -b $BRANCH_NAME

# Update the branch name in sensei.json
jq --arg branch "$BRANCH_NAME" '.branch = $branch' sensei.json > temp.json && mv temp.json sensei.json

# Add the updated sensei.json to the staging area
git add sensei.json

# Commit the change with a message
git commit -m "update branch name in sensei.json to $BRANCH_NAME"

# Create a new Heroku app
heroku create $BRANCH_NAME

# Set Heroku config variables
heroku config:set OPENAI_API_KEY=$OPENAI_API_KEY --app $BRANCH_NAME

# Add logging with Logtail free plan
heroku addons:create logtail:free --app $BRANCH_NAME

# Deploy a Postgres database under the basic plan
heroku addons:create heroku-postgresql:basic --app $BRANCH_NAME

# Create a database table to store messages
heroku pg:psql --app "$BRANCH_NAME" <<EOF
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(255),
    content TEXT,
    guide VARCHAR(255),
    thread VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Create a database table to store companions (accounts that send queries, could be human or AI)
heroku pg:psql --app "$BRANCH_NAME" <<EOF
CREATE TABLE companions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    hashedPassword VARCHAR(255),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Add Heroku remote for this branch
git remote add $BRANCH_NAME https://git.heroku.com/$BRANCH_NAME.git

# Push the branch to Heroku
git push $BRANCH_NAME $BRANCH_NAME:main

# Open the Heroku app in a browser
heroku open --app $BRANCH_NAME