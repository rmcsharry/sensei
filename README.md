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
7. `git push heroku main`
8. `heroku open`

## Optional: to use the command line interface

1. `touch .env`
2. add `OPENAI_API_KEY={YOUR-KEY}` to `.env`
3. `node prompt.js`

## Optional: use GitHub workflows

Use [GitHub](https://github.com/) to host your repository and set up CI before deploying to Heroku. There is a GitHub workflow file you can tinker with. 