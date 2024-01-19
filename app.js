const express = require('express');
const fs = require('fs');
const { OpenAI } = require("openai");
const sensei = require('./sensei.json');

require('dotenv').config();
const app = express();

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

messages = [];

app.post('/chat', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).send({ message: 'Prompt is required' });
  }
  
  messages.push({
    role: 'user',
    content: prompt,
  });

  if (sensei.target == "chat-completions") {
    const response = await openai.chat.completions.create({
      model: sensei.model,
      messages,
    });

    messages.push({
      role: response.choices[0].message.role,
      content: response.choices[0].message.content,
    });
    res.send(response.choices[0].message);

    console.log("Messages:", messages);
    console.log("Response choice 0:", response.choices[0]);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});