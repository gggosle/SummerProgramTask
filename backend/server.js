const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY in .env");
    process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(express.json({ limit: "1mb" }));

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Single backend endpoint
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

        if (mode === "rephrase" && !["casual", "professional", "friendly"].includes(tone)) {
            return res.status(400).json({ error: "Tone required for rephrase." });
        }

        const model = "gpt-4o-mini";
        let messages = [];
        let response_format;

        if (mode === "summarize") {
            messages = [
                { role: "system", content: "Summarize concisely, keep key facts." },
                { role: "user", content: text }
            ];
        } else if (mode === "rephrase") {
            messages = [
                { role: "system", content: "Rephrase faithfully without adding/removing facts." },
                { role: "user", content: `Rephrase in a ${tone} tone:\n\n${text}` }
            ];
        } else if (mode === "extract_json") {
            response_format = { type: "json_object" };
            messages = [
                { role: "system", content: "Extract structured info. Return ONLY JSON." },
                { role: "user", content: text }
            ];
        } else if (mode === "classify") {
            messages = [
                { role: "system", content: "Classify sentiment: positive | neutral | negative" },
                { role: "user", content: text }
            ];
        }

        const completion = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.5,
            response_format
        });

        let result = completion.choices[0].message?.content?.trim() || "";

        if (mode === "extract_json") {
            try {
                result = JSON.stringify(JSON.parse(result), null, 2);
            } catch {
                result = JSON.stringify({ error: "Invalid JSON", raw: result }, null, 2);
            }
        }

        res.json({
            ok: true,
            mode,
            result,
            usage: {
                prompt: completion.usage?.prompt_tokens ?? null,
                completion: completion.usage?.completion_tokens ?? null,
                total: completion.usage?.total_tokens ?? null
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
