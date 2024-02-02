const express = require('express');
const { OpenAI } = require("openai");
const sensei = require('./sensei.json');

require('dotenv').config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let messages = [];
let assistant = '';
let thread = '';
let requestQueue = {};

if (sensei.systemPrompt) {
  messages.push({
    role: 'system',
    content: sensei.systemPrompt,
  });
}

async function respond(prompt, requestId, target) {
  try {
    let result;

    if (target === "chat") {
      result = await callChat(messages, prompt);
    }

    if (target === "assistant") {
      // If assistant or thread are unassigned, pass them as undefined or null to callAssistant
      const initialAssistant = assistant || null;
      const initialThread = thread || null;
      const { 
        returnValue,
        assistant: updatedAssistant,
        thread: updatedThread 
      } = await callAssistant(messages, prompt, initialAssistant, initialThread);
  
      if (updatedAssistant) assistant = updatedAssistant;
      if (updatedThread) thread = updatedThread;
      result = returnValue;
    }
    
    requestQueue[requestId].status = 'completed';
    requestQueue[requestId].data = result;
  } catch (error) {
    requestQueue[requestId].status = 'failed';
    requestQueue[requestId].data = error.message;
  }
}

async function callChat(messages, prompt) {
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

  return returnValue;
}

async function callAssistant(messages, prompt, assistant, thread) {
  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  } 
  if (!assistant) {
    assistant = await openai.beta.assistants.create({
      name: sensei.branch,
      instructions: sensei.systemPrompt,
      tools: [{ type: "code_interpreter" }, { type: "retrieval"}],
      model: sensei.model
    });
  } else {
    // assistant already exists
  }

  if (!thread) {
    thread = await openai.beta.threads.create();
  } else {
    // thread already exists
  }

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

  while (run.status != "completed") {
    await delay(2000);
    run = await openai.beta.threads.runs.retrieve(
      thread.id,
      runId
    );
    if (run.status === "failed") { console.log("run failed:", run); }
    if (run.status === "requires_action") {
      let tools_outputs = [];
      let tool_calls = run.required_action.submit_tool_outputs.tool_calls;
      for (let tool_call of tool_calls) {
        let functionName = tool_call.function.name;
        let functionArguments = Object.values(JSON.parse(tool_call.function.arguments));
        let response;
        if (Object.prototype.hasOwnProperty.call(functions, functionName)) {
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
  return {
    returnValue,
    assistant,
    thread
  };
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/prompt', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).send({ message: 'Prompt is required' });
  }

  // Generate a unique ID for the request
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Initialize the request status
  requestQueue[requestId] = { status: 'processing', data: null };

  // Process asynchronously
  respond(prompt, requestId, sensei.target);

  // Respond with requestId
  res.json({ requestId });
});

app.get('/status/:requestId', (req, res) => {
  const { requestId } = req.params;
  
  if (requestQueue[requestId]) {
    const { status, data } = requestQueue[requestId];
    
    if (status === 'completed' || status === 'failed') {
      delete requestQueue[requestId];
    }
    
    res.json({ status, data });
  } else {
    res.status(404).send({ message: 'Request not found' });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});