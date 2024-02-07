const express = require('express');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { OpenAI } = require("openai");
const sensei = require('./sensei.json');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

require('dotenv').config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let messages = [];
let guide = '';
let companion = 'companion';
let thread = '';
let requestQueue = {};

if (sensei.systemPrompt) {
  saveMessage('system', sensei.systemPrompt);
}

async function saveMessage(role, content, guide = null, companion = null, thread = null) {
  const insertQuery = `INSERT INTO messages (role, content, guide, thread, created_at) VALUES ($1, $2, $3, $4, NOW())`;
  try {
    await pool.query(insertQuery, [role, content, guide, thread]);
  } catch (err) {
    console.error('Error saving message to database:', err);
  }
}

async function respond(prompt, requestId, target) {
  try {
    let result;

    if (target === "chat") {
      result = await callChat(messages, prompt);
    }

    if (target === "assistant") {
      // If guide or thread are unassigned, pass them as undefined or null to callAssistant
      const initialGuide = guide || null;
      const initialThread = thread || null;
      const { 
        returnValue,
        guide: updatedGuide,
        thread: updatedThread 
      } = await callAssistant(messages, prompt, initialGuide, initialThread);
  
      if (updatedGuide) guide = updatedGuide;
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
  saveMessage('user', prompt);

  const response = await openai.chat.completions.create({
    model: sensei.model,
    messages,
  });

  returnValue = response.choices[0].message;

  saveMessage(returnValue.role, returnValue.content);

  return returnValue;
}

async function callAssistant(messages, prompt, guide, thread) {
  messages.push({
    role: 'user',
    content: prompt,
  });

  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  } 
  if (!guide) {
    guide = await openai.beta.assistants.create({
      name: sensei.branch,
      instructions: sensei.systemPrompt,
      tools: [{ type: "code_interpreter" }, { type: "retrieval"}],
      model: sensei.model
    });
  } else {
    // guide already exists
  }

  if (!thread) {
    thread = await openai.beta.threads.create();
  } else {
    // thread already exists
  }

  saveMessage('user', prompt, guide.id, companion, thread.id);

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
      assistant_id: guide.id,
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
  saveMessage(guide.name, botMessage, guide.id, companion, thread.id);
  let returnValue;
  if (guide.name){ 
    returnValue = {
      role: guide.name,
      content: botMessage
    }
  } else {
    returnValue = {
      role: guide.id,
      content: botMessage
    }
  }
  return {
    returnValue,
    guide,
    thread
  };
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/prompt', [
  body('prompt').not().isEmpty().withMessage('Prompt is required'),
  body('prompt').trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let prompt = sanitizeHtml(req.body.prompt, {
    allowedTags: [],
    allowedAttributes: {},
  });

  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  requestQueue[requestId] = { status: 'processing', data: null };
  respond(prompt, requestId, sensei.target);
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

app.post('/register', [
  body('name').trim().escape(),
  body('password').trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, password } = req.body;
  const hashedpassword = await bcrypt.hash(password, 10);

  try {
      await pool.query(
          "INSERT INTO companions (name, hashedpassword, created_at) VALUES ($1, $2, NOW())",
          [name, hashedpassword]
      );
      res.status(201).send("Companion registered successfully");
  } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
  }
});

app.post('/login', [
  body('name').trim().escape(),
  body('password').trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM companions WHERE name = $1", [name]);
    if (result.rows.length > 0) {
      const companion = result.rows[0];
      const match = await bcrypt.compare(password, companion.hashedpassword);
      if (match) {
        res.send("Logged in successfully");
      } else {
        res.status(401).send("Password is incorrect");
      }
    } else {
      res.status(404).send("Companion not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});