const http = require('http');
// Render'ın kapanmasını ve port hatasını önleyen web sunucusu
http.createServer((req, res) => res.end('Bot Aktif!')).listen(process.env.PORT || 3000);

const bedrock = require('bedrock-protocol');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Sunucunun Kabul Ettiği Güncel Bedrock Sürümü (26.32 / 1.20.80)
const client = bedrock.createClient({
  host: process.env.MC_HOST,
  port: parseInt(process.env.MC_PORT) || 19132,
  username: 'AIBot_Bedrock',
  offline: true,
  version: '1.20.80' // Sunucunun istediği tam uyumlu sürüm!
});

client.on('spawn', () => {
  console.log('🤖 Bedrock Botu Başarıyla Sunucuya Girdi!');
});

client.on('error', (err) => console.log('Bot Hatası:', err));
client.on('close', () => console.log('Bot Bağlantısı Kesildi!'));

client.on('text', async (packet) => {
  const username = packet.source_name;
  const message = packet.message;

  if (!username || username === 'AIBot_Bedrock') return;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Sen bir Minecraft Bedrock botusun. Oyunculara kısa ve yardımsever Türkçe cevaplar ver.' },
        { role: 'user', content: `${username}: ${message}` }
      ],
      model: 'llama-3.3-70b-versatile'
    });

    const reply = chatCompletion.choices[0].message.content;
    if (reply) {
      client.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: client.username,
        xuid: '',
        platform_chat_id: '',
        message: reply
      });
    }
  } catch (err) {
    console.error('AI Hatası:', err);
  }
});
