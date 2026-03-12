import { Bot, InlineKeyboard } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const botToken = process.env.BOT_TOKEN;
if (!botToken) throw new Error("BOT_TOKEN is required");

const webAppUrl = process.env.WEBAPP_URL;
if (!webAppUrl) throw new Error("WEBAPP_URL is required (Mini App URL)");

const bot = new Bot(botToken);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp("Open App", webAppUrl);

  await ctx.reply(
    "Привет! Открыть приложение для практики:",
    { reply_markup: keyboard },
  );
});

bot.command("practice", async (ctx) => {
  const raw = ctx.match?.trim?.() ?? "";
  const topic = raw || "javascript";
  const url = new URL(webAppUrl);
  url.searchParams.set("topic", topic);

  const keyboard = new InlineKeyboard().webApp("Открыть практику", url.toString());
  await ctx.reply("Открыть практику по теме:", { reply_markup: keyboard });
});

bot.start();

