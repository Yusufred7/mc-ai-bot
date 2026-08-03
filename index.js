const http = require('http');
// Render'ın kapanmasını önleyen web sunucusu
http.createServer((req, res) => res.end('Bot Aktif!')).listen(process.env.PORT || 3000);

const bedrock = require('bedrock-protocol');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Otomatik Adres Ayırma (ensarkun.progamer.me:34024 yazılsa bile sorunsuz çalışır)
let rawHost = process.env.MC_HOST || 'ensarkun.progamer.me';
let cleanHost = rawHost.split(':')[0].replace('https://', '').replace('http://', '');
let targetPort = parseInt(process.env.MC_PORT) || 34024;

console.log(`🤖 Bot bağlanıyor: ${cleanHost}:${targetPort}`);

const client = bedrock.createClient({
  host: cleanHost,
  port: targetPort,
  username: 'Roxy',
  offline: true,
  version: '1.20.80' // Sunucunun kabul ettiği Bedrock sürümü
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
