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
  res.json({ status: 'Dollar Double Empire AI Ad Studio live', version: '3.0.0' });
});

// Generate full ad concept via Anthropic Claude
app.post('/generate-ad-concept', async (req, res) => {
  const { topic, campaign_type = 'authority', platform = 'tiktok' } = req.body;
  try {
    const systemPrompt = `You are an elite direct-response ad copywriter for Dollar Double Empire — a high-converting AI content brand. Respond ONLY with a valid JSON object, no markdown, no extra text.`;
    const userPrompt = `Create a complete ad concept for: "${topic}"
Campaign type: ${campaign_type} hook. Platform: ${platform}.
Return this exact JSON:
{
  "headline": "Short punchy headline ALL CAPS max 6 words",
  "hook": "First 3 seconds spoken hook that stops the scroll",
  "script": "Full 30-second voiceover script spoken words only",
  "image_prompt": "Hyper-detailed DALL-E 3 prompt for a ${platform === 'tiktok' ? '1024x1792 vertical' : '1024x1024 square'} ad visual with style lighting composition mood colors and any text overlays",
  "caption": "Post caption with hashtags for ${platform}",
  "cta": "Call to action line"
}`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }, {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    });

    const concept = JSON.parse(response.data.content[0].text.trim());
    res.json({ concept });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate image via DALL-E 3
app.post('/generate-image', async (req, res) => {
  const { prompt, size = '1024x1024' } = req.body;
  try {
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'hd',
      style: 'vivid'
    }, { headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY } });

    res.json({ image_url: response.data.data[0].url, revised_prompt: response.data.data[0].revised_prompt });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate script via GPT-4o
app.post('/generate-script', async (req, res) => {
  const { topic } = req.body;
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: `Write a punchy 30-second TikTok voiceover script about: ${topic}. No hashtags. No stage directions. Just spoken words. Hook in first 3 seconds. End with CTA.` }],
      max_tokens: 400
    }, { headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY } });
    res.json({ script: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Bulk generate scripts
app.post('/bulk-generate', async (req, res) => {
  const { topic, count = 3 } = req.body;
  const limit = Math.min(count, 10);
  try {
    const promises = Array.from({ length: limit }, (_, i) =>
      axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: `Write a UNIQUE 30-second TikTok script about: ${topic}. Variation #${i + 1} — different angle and hook. No hashtags. Just spoken words.` }],
        max_tokens: 400
      }, { headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY } })
    );
    const results = await Promise.all(promises);
    res.json({ scripts: results.map(r => r.data.choices[0].message.content) });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate voice via ElevenLabs
app.post('/generate-voice', async (req, res) => {
  const { text, voice_id = '21m00Tcm4TlvDq8ikWAM' } = req.body;
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      { text, model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true } },
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
    );
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate avatar video via HeyGen
app.post('/generate-avatar', async (req, res) => {
  const { script, avatar_id } = req.body;
  try {
    const response = await axios.post('https://api.heygen.com/v2/video/generate', {
      video_inputs: [{ character: { type: 'avatar', avatar_id }, voice: { type: 'text', input_text: script } }],
      dimension: { width: 1080, height: 1920 }
    }, { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Check HeyGen video status
app.get('/video-status/:video_id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.heygen.com/v1/video_status.get?video_id=${req.params.video_id}`,
      { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Post to TikTok
app.post('/post-tiktok', async (req, res) => {
  const { video_url, caption = '' } = req.body;
  try {
    const init = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      post_info: { title: caption, privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
      source_info: { source: 'PULL_FROM_URL', video_url }
    }, { headers: { Authorization: 'Bearer ' + process.env.TIKTOK_ACCESS_TOKEN, 'Content-Type': 'application/json' } });
    res.json({ success: true, data: init.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Dollar Double Empire AI Ad Studio on port ${PORT}`));
