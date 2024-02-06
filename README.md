# Sensei
Framework for quickly developing and deploying AI agents. Geared toward rapid development and experimentation.

## Prerequisites

You have an [OpenAI API account](https://openai.com/blog/openai-api) and a [Heroku](https://signup.heroku.com/) account, and you have the `yarn`, `node`, and `heroku` packages installed on your machine. You will also need to have billing information set up with Heroku, though the readme instructions will guide you to cheap or free Heroku services where available.

## Steps to get started

1. `git clone https://github.com/pemulis/sensei.git`
2. `cd sensei`
3. `brew install jq` (if on Mac, otherwise [follow these instructions](https://jqlang.github.io/jq/download/))
4. `chmod +x start.sh`
5. `./start.sh {project-name} {OPENAI-API-KEY}`

This will create and check out a new project with that name, deploy it to Heroku, set it up with your OpenAI API key, add logging with the Logtail free plan, and a Heroku Postgres database under the Basic plan. Note: This will fail if the project name is not unique.

To deploy changes to Heroku:
`git push {project-name} {project-name}:main`

To open the app from the command line:
`heroku open --app {project-name}`.

## Config options

The `sensei.json` config file allows you to set a few values: `target`, `model`, and `systemPrompt`.

Example:

```
{
  "target": "assistant",
  "model": "gpt-4-1106-preview",
  "branch": "kitty-cat",
  "systemPrompt": "You are a little kitty cat."
}
```

Both the [Chat Completions API](https://platform.openai.com/docs/guides/text-generation/chat-completions-api) and the [Assistants API](https://platform.openai.com/docs/assistants/overview) are supported as targets. To use the Chat Completions API, change the value for `target` to `chat`.

## Create a new branch

An easy way to create and deploy multiple AIs with different behavior is to create a new branch from `main` and then modify the `sensei.json` config and application code to suit your needs.

From the root of the directory:
1. `chmod +x branch.sh`
2. `./branch.sh {branch-name} {OPENAI-API-KEY}`

The `./branch.sh` script is basically the same as the `./start.sh` script, but skips running `yarn` and `heroku login`. Just like project names, the branch name must be unique to deploy successfully to Heroku.

## Experimental: use the command line interface

1. `touch .env`
2. add `OPENAI_API_KEY={YOUR-KEY}` to `.env`
3. `node prompt.js`

## Experimental: use GitHub workflows

Use [GitHub](https://github.com/) to host your repository and set up CI before deploying to Heroku. There is a GitHub workflow file you can tinker with. 