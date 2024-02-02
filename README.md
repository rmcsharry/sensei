# sensei
framework for quickly developing and deploying AI agents

## Prerequisites

You have an [OpenAI API account](https://openai.com/blog/openai-api) and a [Heroku](https://signup.heroku.com/) account, and you have the `yarn`, `node`, and `heroku` packages installed on your machine.

## Steps to get started

1. `git clone https://github.com/pemulis/sensei.git`
2. `cd sensei`
3. `yarn`
4. `heroku login`
5. `heroku create`
6. `heroku config:set OPENAI_API_KEY={YOUR-KEY}`
7. `heroku addons:create logtail:free`
8. `git push heroku main`
9. `heroku open`

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

## Create a new agent in a new branch

An easy way to create and deploy multiple AI agents with different behavior is to create a new branch from `main` and then modify the system prompt in `sensei.json` and frontend in `index.html` to suit your needs. You can also add custom functionality to `app.js`.

Since you will now have multiple apps, you will need to reference them by name. The git push method will also change, since you will be working from a side branch but Heroku wants you to push to a main branch.

From the root of the directory:

1. `brew install jq` (if on Mac, otherwise [follow these instructions](https://jqlang.github.io/jq/download/))
2. `chmod +x branch.sh`
3. `./branch.sh {your-branch-name} {YOUR-OPENAI-API-KEY}`

This will create and check out a new branch with that name, deploy it to Heroku, set it up with your OpenAI API key, and add logging with the Logtail free plan.

Note: This will fail if the branch name is not unique.

If you want to track the branch on GitHub, run `git push origin {your-branch-name}`

When deploying changes to Heroku, run `git push {your-branch-name} {your-branch-name}:main` instead of `git push heroku main`

When opening the app from the command line, run `heroku open --app {your-branch-name}`

## Experimental: use the command line interface

1. `touch .env`
2. add `OPENAI_API_KEY={YOUR-KEY}` to `.env`
3. `node prompt.js`

## Experimental: use GitHub workflows

Use [GitHub](https://github.com/) to host your repository and set up CI before deploying to Heroku. There is a GitHub workflow file you can tinker with. 