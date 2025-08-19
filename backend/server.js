const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

const model = "gpt-4o-mini";
const allowedModes = ["summarize", "rephrase", "extract_json", "classify"];
const toneOptions = ["casual", "professional", "friendly"];

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY in .env");
    process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "../frontend")));

app.post("/api/ai", async (req, res) => {
    try {
        const { mode, text, tone } = req.body || {};

        if (!text || typeof text !== "string" || text.length < 1 || text.length > 5000) {
            return res.status(400).json({ error: "Provide 'text' (1–5000 chars)." });
        }

        const allowedModes = ["summarize", "rephrase", "extract_json", "classify"];
        if (!allowedModes.includes(mode)) {
            return res.status(400).json({ error: "Invalid mode." });
        }

        const toneOptions = ["casual", "professional", "friendly"];
        if (mode === "rephrase" && !toneOptions.includes(tone)) {
            return res.status(400).json({ error: "Tone required for rephrase." });
        }

        const PROMPT_IDS = {
            summarize: "pmpt_68a43cd77b5c8196924ff823de21c20d0011ce4641a83e2f",
            rephrase: {
                casual: "pmpt_68a43ea19bb88197b3382ee827317e43085b89ff1e451679",
                professional: "pmpt_68a43ecbf2788193af540d7619ebc9530f9168cea5f8471f",
                friendly: "pmpt_68a43eff2d5881979ba56ad2209887dd06760801538514c6"
            },
            extract_json: "pmpt_68a43f40a4008197b2cea1a8499b50250fbf06e0850b62d0",
            classify: "pmpt_68a43f40a4008197b2cea1a8499b50250fbf06e0850b62d0"
        };

        const selectedPromptId =
            mode === "rephrase" ? PROMPT_IDS.rephrase[tone] : PROMPT_IDS[mode];

        const promptObj = { id: selectedPromptId };

        const response = await client.responses.create({
            model: "gpt-5",
            prompt: promptObj,
            input: text,
        });

        const result = response.output_text || "";

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
                prompt: response.usage?.prompt_tokens ?? null,
                completion: response.usage?.completion_tokens ?? null,
                total: response.usage?.total_tokens ?? null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
