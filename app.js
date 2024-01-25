const express = require('express');
const { OpenAI } = require("openai");
const sensei = require('./sensei.json');

require('dotenv').config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

messages = [];
botMessage = "";

if (sensei.systemPrompt) {
  messages.push({
    role: 'system',
    content: sensei.systemPrompt,
  });
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/chat', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).send({ message: 'Prompt is required' });
  }

  if (sensei.target == "chat-completions") {
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await openai.chat.completions.create({
      model: sensei.model,
      messages,
    });

    returnValue = response.choices[0].message;

    messages.push({
      role: returnValue.role,
      content: returnValue.content,
    });
    res.send(returnValue);

    console.log("Messages:", messages);
    console.log("Response choice 0:", response.choices[0]);
  }

  if (sensei.target == "assistant") {
    function delay(time) {
      return new Promise(resolve => setTimeout(resolve, time));
    } 

    const assistant = await openai.beta.assistants.create({
      name: sensei.branch,
      instructions: sensei.systemPrompt,
      tools: [{ type: "code_interpreter" }, { type: "retrieval"}],
      model: sensei.model
    });
    console.log("assistant:", assistant);

    const thread = await openai.beta.threads.create();
    console.log("thread:", thread);

    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: prompt
      }
    );

    let run = await openai.beta.threads.runs.create(
      thread.id,
      { 
        assistant_id: assistant.id,
        // instructions: "You can add custom instructions, which will override the system prompt.."
      }
    );
    let runId = run.id;
    console.log("run:", run);

    while (run.status != "completed") {
      await delay(2000);
      console.log("run status:", run.status);
      run = await openai.beta.threads.runs.retrieve(
        thread.id,
        runId
      );
      if (run.status === "failed") { console.log("run:", run); }
      if (run.status === "requires_action") {
        let tools_outputs = [];
        let tool_calls = run.required_action.submit_tool_outputs.tool_calls;
        for (let tool_call of tool_calls) {
          let functionName = tool_call.function.name;
          let functionArguments = Object.values(JSON.parse(tool_call.function.arguments));
          let response;
          if (Object.prototype.hasOwnProperty.call(functions, functionName)) {
            console.log("functionName:", functionName);
            console.log("functionArguments:", functionArguments);
            response = await functions[functionName](...functionArguments);
          } else {
            response = 'We had an issue calling an external function.'
          }
          tools_outputs.push(
            {
              tool_call_id: tool_call.id,
              output: JSON.stringify(response)
            }
          );
        }
        run = openai.beta.threads.runs.submitToolOutputs(
          thread.id,
          runId,
          {
            tool_outputs: tools_outputs
          }
        );
      }
    }

    let originalMessageLength = messages.length;
    let completedThread = await openai.beta.threads.messages.list(thread.id);
    let newMessages = completedThread.data.slice();
    for (let message of newMessages) {
      messages.push(message.content[0]);
    }
    messages = messages.slice(originalMessageLength);
    let botMessage = messages[0].text.value;
    let returnValue = {
      role: "assistant",
      content: botMessage
    }
    res.send(returnValue);

    console.log("Messages:", messages);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});