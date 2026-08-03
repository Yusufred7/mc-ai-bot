const mineflayer = require('mineflayer');
const { pathfinder, movements, goals } = require('mineflayer-pathfinder');
const Groq = require('groq-sdk');

// Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Bedrock / Geyser Uyumlu Bot Ayarları
const bot = mineflayer.createBot({
  host: process.env.MC_HOST || 'SUNUCU_IP_YAZ', // Örn: 'oyun.aternos.me'
  port: parseInt(process.env.MC_PORT) || 19132, // Bedrock varsayılan portu 19132'dir!
  username: 'AIBot_Bedrock',
  version: false // Otomatik versiyon tespiti
});

bot.loadPlugin(pathfinder);

bot.on('spawn', () => {
  console.log('🤖 Bedrock Botu Başarıyla Sunucuya Girdi!');
});

// OYUN İÇİ SOHBET DİNLEYİCİSİ
bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const systemPrompt = `
    Sen bir Minecraft Bedrock botusun. Kullanıcının mesajını analiz et ve SADECE geçerli bir JSON ver.
    Eylemler (action):
    - "MINE": Blok kaz (target: "stone", "iron_ore", "oak_log", "coal_ore")
    - "FOLLOW": Takip et
    - "STOP": Dur
    - "CHAT": Sohbet et (reply: "mesaj")
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Oyuncu (${username}): ${message}` }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const decision = JSON.parse(chatCompletion.choices[0].message.content);

    if (decision.reply) bot.chat(decision.reply);

    if (decision.action === 'MINE') {
      const mcData = require('minecraft-data')(bot.version);
      const targetBlock = bot.findBlock({
        matching: mcData.blocksByName[decision.target] ? mcData.blocksByName[decision.target].id : mcData.blocksByName.stone.id,
        maxDistance: 32
      });

      if (targetBlock) {
        const defaultMove = new movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(new goals.GoalBlock(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z));
        bot.once('goal_reached', () => {
          bot.dig(targetBlock, (err) => {
            if (!err) bot.chat('Kazım tamamlandı!');
          });
        });
      } else {
        bot.chat(`Yakında ${decision.target} bulamadım.`);
      }
    } else if (decision.action === 'FOLLOW') {
      const player = bot.players[username];
      if (player && player.entity) {
        const mcData = require('minecraft-data')(bot.version);
        bot.pathfinder.setMovements(new movements(bot, mcData));
        bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 1));
      }
    } else if (decision.action === 'STOP') {
      bot.pathfinder.setGoal(null);
    }
  } catch (err) {
    console.error('Hata:', err);
  }
});
