/**
 * src/commands/admin/users.js
 * Command /users — Daftar user terdaftar di bot.
 */

'use strict';

const userRepository = require('../../database/userRepository');
const { formatDate } = require('../../utils/formatter');

async function usersCommand(ctx) {
  const users = await userRepository.getAllUsers(20, 0);
  const total = await userRepository.countUsers();

  if (users.length === 0) {
    return ctx.reply('👥 Belum ada user yang terdaftar.');
  }

  let message = `👥 *DAFTAR USER* (20 terbaru dari ${total} total)\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const user of users) {
    const banLabel = user.is_banned ? ' 🚫 BANNED' : '';
    message +=
      `🆔 \`${user.telegram_id}\`${banLabel}\n` +
      `👤 ${user.first_name || 'N/A'} (@${user.username || '-'})\n` +
      `📅 Bergabung: ${formatDate(user.created_at)}\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n_Total user terdaftar: ${total}_`;

  await ctx.replyWithMarkdown(message);
}

module.exports = usersCommand;
