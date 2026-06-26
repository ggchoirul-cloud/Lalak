/**
 * src/commands/admin/batalkandeposit.js
 * Command /batalkandeposit <invoice> — Batalkan deposit yang masih pending.
 */

'use strict';

const premkuService = require('../../services/premkuService');
const premkuRepository = require('../../database/premkuRepository');
const premkuPollingService = require('../../services/premkuPollingService');
const logger = require('../../utils/logger');

async function batalkanDepositCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const invoice = args[0];

  if (!invoice) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\nGunakan: /batalkandeposit <invoice>',
      { parse_mode: 'Markdown' }
    );
  }

  try {
    const result = await premkuService.cancelDeposit(invoice);

    if (!result || result.success !== true) {
      return ctx.reply(`❌ ${result?.message || 'Gagal membatalkan deposit.'}`);
    }

    premkuPollingService.stopDepositPolling(invoice);
    await premkuRepository.updateDepositStatus(invoice, 'canceled');

    logger.info('Admin:batalkandeposit', `Deposit ${invoice} dibatalkan oleh ${ctx.from.id}`);

    await ctx.replyWithMarkdown(`✅ Deposit \`${invoice}\` berhasil dibatalkan.`);

  } catch (error) {
    logger.error('Admin:batalkandeposit', error.message);
    await ctx.reply(`❌ *Gagal membatalkan*\n\n${error.message}`, { parse_mode: 'Markdown' });
  }
}

module.exports = batalkanDepositCommand;
