# senpai
framework for quickly developing and deploying AI agents

## Steps to run

1. `git clone https://github.com/pemulis/senpai.git`
2. `cd senpai`
3. `yarn`
4. `touch .env`
5. add `OPENAI_API_KEY={YOUR-KEY}` to `.env`
4. `heroku login`
5. `heroku create`
6. add `HEROKU_URI={YOUR-URI}` to `.env`
7. `heroku config:set OPENAI_API_KEY={YOUR-KEY}`
8. `git push heroku main`
9. `heroku open`
10. `node prompt.js`