import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.json({ status: 'AI Avatar App is live', version: '2.0.0' });
});

app.post('/generate-script', async (req, res) => {
  const { topic } = req.body;
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4', messages: [{ role: 'user', content: 'Write a punchy 30-second TikTok script about: ' + topic + '. No hashtags. Just spoken words.' }], max_tokens: 300 },
      { headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY } }
    );
    res.json({ script: response.data.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/bulk-generate', async (req, res) => {
  const { topic, count = 3 } = req.body;
  const limit = Math.min(count, 10);
  try {
    const promises = Array.from({ length: limit }, () =>
      axios.post('https://api.openai.com/v1/chat/completions',
        { model: 'gpt-4', messages: [{ role: 'user', content: 'Write a unique punchy 30-second TikTok script about: ' + topic + '. No hashtags. Just spoken words.' }], max_tokens: 300 },
        { headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY } }
      )
    );
    const results = await Promise.all(promises);
    res.json({ scripts: results.map(r => r.data.choices[0].message.content) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/generate-voice', async (req, res) => {
  const { text, voice_id = '21m00Tcm4TlvDq8ikWAM' } = req.body;
  try {
    const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/' + voice_id,
      { text, model_id: 'eleven_monolingual_v1' },
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
    );
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/generate-avatar', async (req, res) => {
  const { script, avatar_id } = req.body;
  try {
    const response = await axios.post('https://api.heygen.com/v2/video/generate',
      { video_inputs: [{ character: { type: 'avatar', avatar_id }, voice: { type: 'text', input_text: script } }], dimension: { width: 1080, height: 1920 } },
      { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY } }
    );
    res.json(response.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/video-status/:video_id', async (req, res) => {
  try {
    const response = await axios.get('https://api.heygen.com/v1/video_status.get?video_id=' + req.params.video_id,
      { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY } }
    );
    res.json(response.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/post-tiktok', async (req, res) => {
  const { video_url, caption = '' } = req.body;
  try {
    const init = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/',
      { post_info: { title: caption, privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false }, source_info: { source: 'PULL_FROM_URL', video_url } },
      { headers: { Authorization: 'Bearer ' + process.env.TIKTOK_ACCESS_TOKEN, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, data: init.data });
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }); }
});

app.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
