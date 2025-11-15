const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true 
});
const API_URL = process.env.API_URL || 'http://localhost:3000';

// User state management
const userStates = new Map();

// Key generation through API
async function generateKeys(userId) {
    try {
        const response = await axios.post(`${API_URL}/keygen`, { userId });
        return response.data;
    } catch (error) {
        console.error('Key generation error:', error);
        return null;
    }
}

// Commands

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `Welcome to Encrypted Prediction Market! 🎯

This bot allows you to create encrypted prediction markets in group chats using client-side encryption.

Commands:
/join - Join the encrypted pool and get your keys
/predict - Create a new prediction market
/resolve - Resolve an existing market
/keys - Get your encryption keys again

All predictions are encrypted client-side and completely anonymous to the server.`;

    bot.sendMessage(chatId, welcomeMessage);
});

// Handle /join command
bot.onText(/\/join/, async (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    const loadingMsg = await bot.sendMessage(chatId, 'Generating secure keys...');

    const keys = await generateKeys(userId);
    if (!keys) {
        await bot.editMessageText('Error generating keys. Please try again.', {
            chat_id: chatId,
            message_id: loadingMsg.message_id
        });
        return;
    }

    // Send private key via DM
    const dmMessage = `🔐 Your Private Key (KEEP SECRET):
\`${keys.privKey}\`

📢 Your Public Key (Share with others):
\`${keys.pubKey}\`

⚠️ Save your private key securely! If you lose it, you cannot decrypt past predictions.`;
    
    try {
        await bot.sendMessage(userId, dmMessage, { parse_mode: 'Markdown' });
        
        if (msg.chat.type === 'private') {
            await bot.editMessageText('✅ Keys sent via private message!', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        } else {
            await bot.deleteMessage(chatId, loadingMsg.message_id);
            bot.sendMessage(chatId, `@${msg.from.username || msg.from.first_name} has joined the encrypted pool! 🎯`, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: 'Check your keys', callback_data: 'keys' }
                    ]]
                }
            });
        }
    } catch (error) {
        await bot.editMessageText('Please start the bot in private first: @' + bot.getMe().username, {
            chat_id: chatId,
            message_id: loadingMsg.message_id
        });
    }
});

// Handle /predict command
bot.onText(/\/predict (.+)/, async (msg, match) => {
    const question = match[1];
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (!question.trim()) {
        bot.sendMessage(chatId, 'Usage: /predict <your question>\nExample: /predict Will BTC hit 100k by end of 2024?');
        return;
    }

    const loadingMsg = await bot.sendMessage(chatId, 'Creating encrypted market...');

    try {
        const response = await axios.post(`${API_URL}/market/create`, {
            question,
            userId,
            groupId: msg.chat.id
        });

        const { marketId, miniAppUrl } = response.data;

        // Remove loading message
        await bot.deleteMessage(chatId, loadingMsg.message_id);

        // Create inline keyboard for the mini app
        const keyboard = {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🎯 Open Prediction Market', url: miniAppUrl }
                ]]
            }
        };

        bot.sendMessage(chatId, `🎯 New Prediction Market Created!\n\nQ: ${question}\nMarket ID: \`${marketId}\``, {
            parse_mode: 'Markdown',
            ...keyboard
        });

        // Send detailed info via DM
        const dmMessage = `📊 Market Created\n\nQ: ${question}\nMarket ID: \`${marketId}\`\nGroup: ${msg.chat.title || 'Direct Message'}\n\nShare this link with others: ${miniAppUrl}`;
        bot.sendMessage(userId, dmMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Market creation error:', error);
        await bot.editMessageText('Error creating market. Please try again.', {
            chat_id: chatId,
            message_id: loadingMsg.message_id
        });
    }
});

// Handle /resolve command (admin only)
bot.onText(/\/resolve\s+(\w+)\s+(yes|no)/i, async (msg, match) => {
    const marketId = match[1];
    const outcome = match[2].toLowerCase() === 'yes';
    const userId = msg.from.id;

    if (userId.toString() !== process.env.ADMIN_USER_ID) {
        bot.sendMessage(msg.chat.id, '❌ Only admins can resolve markets');
        return;
    }

    const loadingMsg = await bot.sendMessage(msg.chat.id, 'Resolving market...');

    try {
        await axios.post(`${API_URL}/resolve`, {
            marketId,
            outcome
        }, {
            headers: {
                'x-admin-token': process.env.ADMIN_TOKEN
            }
        });

        await bot.editMessageText(`✅ Market \`${marketId}\` resolved to: ${outcome ? 'YES' : 'NO'}`, {
            chat_id: msg.chat.id,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Market resolution error:', error);
        await bot.editMessageText('Error resolving market.', {
            chat_id: msg.chat.id,
            message_id: loadingMsg.message_id
        });
    }
});

// Handle /keys command
bot.onText(/\/keys/, async (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    const keys = await generateKeys(userId);
    if (!keys) {
        bot.sendMessage(chatId, 'Error retrieving keys. Try /join first.');
        return;
    }

    const message = `🔐 Your Encryption Keys\n\nPrivate Key (KEEP SECRET):\n\`${keys.privKey}\`\n\nPublic Key:\n\`${keys.pubKey}\`\n\n⚠️ Your private key is essential for decrypting predictions.`;
    
    try {
        await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
        if (chatId !== userId) {
            bot.sendMessage(chatId, '📧 Keys sent to your private messages!');
        }
    } catch (error) {
        bot.sendMessage(chatId, 'Please start the bot in private first to receive your keys.');
    }
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
    const { message, data } = callbackQuery;
    const chatId = message.chat.id;

    switch (data) {
        case 'keys':
            await bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(chatId, 'Sending keys via private message...');
            bot.onText(/\/keys/)();
            break;
        default:
            bot.answerCallbackQuery(callbackQuery.id, 'Unknown action');
    }
});

console.log('Telegram bot started successfully');