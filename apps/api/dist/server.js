import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { verifyTelegramWebAppInitData } from "./telegram/verifyInitData.js";
dotenv.config();
const prisma = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(cors, {
    origin: true,
    credentials: true,
});
const botToken = process.env.BOT_TOKEN;
if (!botToken)
    throw new Error("BOT_TOKEN is required for Telegram initData verification");
app.get("/health", async () => ({ ok: true }));
const AuthBody = z.object({
    initData: z.string().min(1),
});
app.post("/auth/telegram", async (req, reply) => {
    const parsed = AuthBody.safeParse(req.body);
    if (!parsed.success)
        return reply.code(400).send({ error: "Invalid body" });
    const data = verifyTelegramWebAppInitData(parsed.data.initData, botToken);
    if (!data)
        return reply.code(401).send({ error: "Invalid initData" });
    if (!data.user)
        return reply.code(401).send({ error: "No user in initData" });
    const userObj = JSON.parse(data.user);
    const user = await prisma.user.upsert({
        where: { telegramId: String(userObj.id) },
        update: {
            username: userObj.username ?? null,
            firstName: userObj.first_name ?? null,
            lastName: userObj.last_name ?? null,
        },
        create: {
            telegramId: String(userObj.id),
            username: userObj.username ?? null,
            firstName: userObj.first_name ?? null,
            lastName: userObj.last_name ?? null,
        },
        select: { id: true, telegramId: true, username: true, firstName: true, lastName: true },
    });
    // MVP: возвращаем только userId; в будущем можно выдавать JWT/сессию.
    return { user };
});
const QuestionsQuery = z.object({
    topic: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
});
app.get("/questions", async (req, reply) => {
    const parsed = QuestionsQuery.safeParse(req.query);
    if (!parsed.success)
        return reply.code(400).send({ error: "Invalid query" });
    const { topic, limit = 20, cursor } = parsed.data;
    const items = await prisma.question.findMany({
        where: topic ? { topic } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, topic: true, text: true, difficulty: true, tags: true },
    });
    const nextCursor = items.length === limit ? items[items.length - 1]?.id : null;
    return { items, nextCursor };
});
app.get("/questions/:id", async (req, reply) => {
    const id = req.params.id;
    const q = await prisma.question.findUnique({
        where: { id },
        select: { id: true, topic: true, text: true, answer: true, difficulty: true, tags: true },
    });
    if (!q)
        return reply.code(404).send({ error: "Not found" });
    return q;
});
const AttemptBody = z.object({
    initData: z.string().min(1),
    questionId: z.string().min(1),
    userAnswer: z.string().min(1),
    selfScore: z.number().int().min(1).max(5),
});
app.post("/attempts", async (req, reply) => {
    const parsed = AttemptBody.safeParse(req.body);
    if (!parsed.success)
        return reply.code(400).send({ error: "Invalid body" });
    const data = verifyTelegramWebAppInitData(parsed.data.initData, botToken);
    if (!data || !data.user)
        return reply.code(401).send({ error: "Invalid initData" });
    const userObj = JSON.parse(data.user);
    const dbUser = await prisma.user.findUnique({ where: { telegramId: String(userObj.id) } });
    if (!dbUser)
        return reply.code(401).send({ error: "User not found; call /auth/telegram first" });
    const attempt = await prisma.attempt.create({
        data: {
            userId: dbUser.id,
            questionId: parsed.data.questionId,
            userAnswer: parsed.data.userAnswer,
            selfScore: parsed.data.selfScore,
        },
        select: { id: true, createdAt: true },
    });
    return { attempt };
});
const MeAttemptsQuery = z.object({
    initData: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});
app.get("/me/attempts", async (req, reply) => {
    const parsed = MeAttemptsQuery.safeParse(req.query);
    if (!parsed.success)
        return reply.code(400).send({ error: "Invalid query" });
    const data = verifyTelegramWebAppInitData(parsed.data.initData, botToken);
    if (!data || !data.user)
        return reply.code(401).send({ error: "Invalid initData" });
    const userObj = JSON.parse(data.user);
    const dbUser = await prisma.user.findUnique({ where: { telegramId: String(userObj.id) } });
    if (!dbUser)
        return reply.code(401).send({ error: "User not found; call /auth/telegram first" });
    const attempts = await prisma.attempt.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: parsed.data.limit ?? 20,
        select: {
            id: true,
            createdAt: true,
            selfScore: true,
            userAnswer: true,
            question: { select: { id: true, topic: true, text: true } },
        },
    });
    return { items: attempts };
});
app.post("/bookmarks/:questionId", async (req, reply) => {
    const questionId = req.params.questionId;
    const body = z.object({ initData: z.string().min(1) }).safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: "Invalid body" });
    const data = verifyTelegramWebAppInitData(body.data.initData, botToken);
    if (!data || !data.user)
        return reply.code(401).send({ error: "Invalid initData" });
    const userObj = JSON.parse(data.user);
    const dbUser = await prisma.user.findUnique({ where: { telegramId: String(userObj.id) } });
    if (!dbUser)
        return reply.code(401).send({ error: "User not found; call /auth/telegram first" });
    await prisma.bookmark.upsert({
        where: { userId_questionId: { userId: dbUser.id, questionId } },
        update: {},
        create: { userId: dbUser.id, questionId },
    });
    return { ok: true };
});
app.delete("/bookmarks/:questionId", async (req, reply) => {
    const questionId = req.params.questionId;
    const body = z.object({ initData: z.string().min(1) }).safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: "Invalid body" });
    const data = verifyTelegramWebAppInitData(body.data.initData, botToken);
    if (!data || !data.user)
        return reply.code(401).send({ error: "Invalid initData" });
    const userObj = JSON.parse(data.user);
    const dbUser = await prisma.user.findUnique({ where: { telegramId: String(userObj.id) } });
    if (!dbUser)
        return reply.code(401).send({ error: "User not found; call /auth/telegram first" });
    await prisma.bookmark.deleteMany({ where: { userId: dbUser.id, questionId } });
    return { ok: true };
});
const port = Number(process.env.API_PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
