const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const rateLimit = require('express-rate-limit');

const model = "gpt-4o-mini";
const allowedModes = ["summarize", "rephrase", "extract_json", "classify"];
const toneOptions = ["casual", "professional", "friendly"];
const PROMPT_IDS = {
    summarize: "pmpt_68a43cd77b5c8196924ff823de21c20d0011ce4641a83e2f",
    rephrase: {
        casual: "pmpt_68a43ea19bb88197b3382ee827317e43085b89ff1e451679",
        professional: "pmpt_68a43ecbf2788193af540d7619ebc9530f9168cea5f8471f",
        friendly: "pmpt_68a43eff2d5881979ba56ad2209887dd06760801538514c6"
    },
    extract_json: "pmpt_68a43f40a4008197b2cea1a8499b50250fbf06e0850b62d0",
    classify: "pmpt_68a43f7a0ad081939d09b2b0eaf98e8b02ceeb34e14ff45e"
};

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY in .env");
    process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        ok: false,
        error: "Too many requests, please try again later."
    }
});

app.post("/api/ai", apiLimiter, async (req, res) => {
    try {
        const { mode, text, tone } = req.body || {};

        if (!text || typeof text !== "string" || text.length < 1 || text.length > 5000) {
            return res.status(400).json({ error: "Provide 'text' (1–5000 chars)." });
        }

        if (!allowedModes.includes(mode)) {
            return res.status(400).json({ error: "Invalid mode." });
        }

        if (mode === "rephrase" && !toneOptions.includes(tone)) {
            return res.status(400).json({ error: "Tone required for rephrase." });
        }

        const selectedPromptId =
            mode === "rephrase" ? PROMPT_IDS.rephrase[tone] : PROMPT_IDS[mode];

        const promptObj = { id: selectedPromptId };

        const response = await client.responses.create({
            model: "gpt-5",
            prompt: promptObj,
            input: text,
            max_output_tokens: 10000,
        });

        const result = response.output_text;

        if (!result || typeof result !== "string" || result.length < 1) {
            return res.status(500).json({ error: "No valid response from AI." });
        }

        let finalResult = result;
        if (mode === "extract_json") {
            try {
                finalResult = JSON.stringify(JSON.parse(result), null, 2);
            } catch {
                finalResult = JSON.stringify({ error: "Invalid JSON", raw: result }, null, 2);
            }
        }

        res.json({
            ok: true,
            mode,
            result: finalResult,
            usage: {
                prompt: response.usage?.input_tokens ?? null,
                completion: response.usage?.output_tokens ?? null,
                total: response.usage?.total_tokens ?? null
            }
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Something went wrong, try again later" });
    }
});


module.exports = app;