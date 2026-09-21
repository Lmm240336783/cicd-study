const fs = require('fs');
const https = require('https');

const apiKey = 'sk-acc99efb81c8e4cfc93af5052aa39b08f871355fdd8028f76ed3f8e4edbd3b88';
const outDir = 'E:/??/cicd-study/output/imagegen';
fs.mkdirSync(outDir, { recursive: true });

const body = JSON.stringify({
  model: 'gpt-image-2',
  prompt: 'Use case: photorealistic-natural. Asset type: standalone preview image. Primary request: a cute cat sitting on a sunlit windowsill, realistic fur detail, warm natural light, soft background blur. Style/medium: photorealistic. Composition/framing: medium close-up, centered subject. Lighting/mood: cozy and calm morning sunlight. Constraints: no text, no watermark.',
  size: '1024x1024',
  quality: 'medium'
});

const req = https.request('https://api.psydo.top/v1/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  },
  timeout: 180000
}, (res) => {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync(`${outDir}/psydo-image-response.json`, data, 'utf8');
    console.log(`STATUS=${res.statusCode}`);
    console.log(data.slice(0, 2000));
    try {
      const parsed = JSON.parse(data);
      const first = parsed?.data?.[0];
      if (first?.b64_json) {
        const file = `${outDir}/cat-generated.png`;
        fs.writeFileSync(file, Buffer.from(first.b64_json, 'base64'));
        console.log(`SAVED=${file}`);
      } else if (first?.url) {
        console.log(`IMAGE_URL=${first.url}`);
      }
    } catch (err) {
      console.error(`PARSE_ERR=${err.message}`);
      process.exitCode = 1;
    }
  });
});

req.on('timeout', () => {
  req.destroy(new Error('Request timed out'));
});
req.on('error', (err) => {
  console.error(`REQ_ERR=${err.message}`);
  process.exit(1);
});
req.write(body);
req.end();
