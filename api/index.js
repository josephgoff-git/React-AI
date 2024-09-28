const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser'); 
require('dotenv').config(); 
const multer = require('multer');
const path = require('path');
// const fs = require('fs');
const fs = require('fs-extra');
// const AWS = require('awas-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*'
}));

// Middleware to set CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://reactaiplayground.online');
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  // res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  // res.header('Access-Control-Allow-Headers', 'Content-Type');
  // res.header('Access-Control-Allow-Credentials', 'true'); // Include if using credentials

  next();
});


app.use(bodyParser.json()); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Recieve Files
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

app.post('/upload-files', upload.array('file'), async (req, res) => {
  console.log("UPLOAD FILES")
  await fs.emptyDir('uploads');
  console.log('Contents of the uploads folder deleted.');
  
  try {
    const uploadedFiles = req.files;
    const filenames = req.body.filenames;

    if (!Array.isArray(filenames) || uploadedFiles.length !== filenames.length) {
      throw new Error('Invalid request data.');
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const filename = filenames[i];
      const filePath = path.join('uploads', filename);

      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(filePath, file.buffer);
    }

    console.log('Files saved to the server.');

    let reactAppDir = path.join('uploads', 'react-app');
    



    // const updateNpmCommand = `cd ${reactAppDir} && npm update -g npm`;
    const installCommand = `cd ${reactAppDir} && npm install --timeout=600000 --no-bin-links`;
    // const buildCommand = `cd ${reactAppDir} && npm run build`;
    const buildCommand = `cd ${reactAppDir} && npx react-scripts build`;

    exec(installCommand, async (buildError, buildStdout, buildStderr) => {
      if (buildError) {
        console.error('Error installing React app:', buildError);
        res.status(500).send('Error installing React app.');
        return;
      }

      console.log("Installation successful")

      exec(buildCommand, async (buildError, buildStdout, buildStderr) => {
        if (buildError) {
          console.error('Error building React app:', buildError);
          res.status(500).send('Error building React app.');
          return;
        }

        console.log('React app built successfully.');

        // Deploy to Vercel using the Vercel CLI
        reactAppDir = path.join('uploads', 'react-app', 'build');

        const timestamp1 = new Date().toISOString().replace(/[-:.TZ]/g, "");
        const deploymentTitle = `react-ai-${timestamp1}`;
        console.log(deploymentTitle);

        const deployCommand = `vercel --prod ${reactAppDir} --token=${process.env.VERCEL_TOKEN} --confirm --debug --name=${deploymentTitle}`;
        const deploymentOptions = {};

        try {
          // Execute the deployment command
          console.log("Deploying...");
          await execAsync(deployCommand, deploymentOptions);
          console.log('React app deployed to Vercel.');

          // Delete uploads contents
          res.status(200).send(`https://${deploymentTitle}.vercel.app`);
          await fs.emptyDir('uploads');
          console.log('Contents of the uploads folder deleted.');
        } catch (deployError) {
          console.error('Error during deployment:', deployError);
          res.status(500).send('Error during deployment.');
          return;
        }
      });





    });





    // exec(`cd ${reactAppDir} && npm update -g npm && npm install --timeout=600000 npm run build > build.log 2>&1`, async (error, stdout, stderr) => {
    //   if (error) {
    //     console.error('Error building React app:', error);
    //     res.status(500).send('Error building React app.');
    //     return;
    //   }

    //   console.log('React app built successfully.');

    //   // Deploy to Vercel using the Vercel CLI
    //   reactAppDir = path.join('uploads', 'react-app', 'build');

    //   const timestamp1 = new Date().toISOString().replace(/[-:.TZ]/g, "");
    //   let timestamp = timestamp1
    //   const deploymentTitle = `react-ai-${timestamp}`;
    //   console.log(deploymentTitle)

    //   const deployCommand = `vercel --prod ${reactAppDir} --token=${process.env.VERCEL_TOKEN} --confirm --debug --name=${deploymentTitle}`;
    //   const deploymentOptions = {}
      
    //   try {
    //     // Execute the deployment command
    //     console.log("Deploying...")
    //     await execAsync(deployCommand, deploymentOptions);
    //     console.log('React app deployed to Vercel.');

    //     // Delete uploads contents
    //     res.status(200).send("https://" + deploymentTitle + ".vercel.app");
    //     await fs.emptyDir('uploads');
    //     console.log('Contents of the uploads folder deleted.');
    //   } catch (deployError) {
    //     console.error('Error during deployment:', deployError);
    //     res.status(500).send('Error during deployment.');
    //     return;
    //   }

    // });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).send('Error uploading files.');
  }
});


// Github Proxy
app.get('/github-proxy', async (req, res) => {
  console.log("GIT PROXY")
  try {
    const response = await axios.get(req.query.url, {
      responseType: 'arraybuffer',
    });

    res.setHeader('Content-Disposition', `attachment; filename=${response.headers['content-disposition']}`);
    res.setHeader('Content-Type', response.headers['content-type']);

    res.send(response.data);
  } catch (error) {
    console.error('Error proxying request:', error);
    res.status(500).send('Error');
  }
});

// Get Message
app.post('/gpt-message', async (req, res) => {
  // console.log("GPT MESSAGE")
  const messages = req.body.messages
  const apiKey = process.env.OPENAI_API_KEY; 
  async function getMessage(messages) {
    const formattedMessages = messages.map(message => ({
      role: message.isBot ? "assistant" : "user",
      content: message.text
    }))
    const options = {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', options);
    const data = await response.json();
    const message = data.choices[0].message;
    if (message.content) {
      return message.content;
    }
    else if (message.function_call) {
      try {
        const result = JSON.parse(message.function_call.arguments);
        return result.code
      } catch {
        return message.function_call.arguments;
      }
    } 
    else {
      return "Appologies, server is down right now...";
    }
  }

  const result = await getMessage(messages)
  res.status(200).send(result);
});


app.post('/gpt-message-editor', async (req, res) => {
  console.log("GPT MESSAGE EDITOR")

  let messages = req.body.message
  let temp = req.body.temperature
  let gpt = req.body.gpt

  const apiKey = process.env.OPENAI_API_KEY; 
  async function getMessage(messages) {
    const formattedMessages = messages.map(message => ({
      role: message.isBot ? "assistant" : "user",
      content: message.text
    }))
    const options = {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `gpt-${gpt}`,
        temperature: temp,
        messages: formattedMessages,
        
      })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', options);
    const data = await response.json();
    const message = data.choices[0].message;
    if (message.content) {
      return message.content;
    }
    else if (message.function_call) {
      try {
        const result = JSON.parse(message.function_call.arguments);
        return result.code
      } catch {
        return message.function_call.arguments;
      }
    } 
    else {
      return "Appologies, server is down right now...";
    }
  }

  const result = await getMessage(messages)
  res.status(200).send(result);
});


// Listen
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


