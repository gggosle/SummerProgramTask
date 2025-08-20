const request = require('supertest');
const app = require('../backend/app');
const timeDelay = 100000

describe('/api/ai endpoint', () => {
    it('summarize returns 200 and non-empty result', async () => {
        const res = await request(app)
            .post('/api/ai')
            .send({ mode: 'summarize', text: 'This is a sample text to summarize.' });

        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBeDefined();
        expect(res.body.result.length).toBeGreaterThan(0);
    }, timeDelay);

    it('rephrase without tone returns 400', async () => {
        const res = await request(app)
            .post('/api/ai')
            .send({ mode: 'rephrase', text: 'Some text to rephrase.' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/Tone required/);
    });

    it('classify returns one of the allowed labels', async () => {
        const res = await request(app)
            .post('/api/ai')
            .send({ mode: 'classify', text: 'This is a positive example.' });

        expect(res.statusCode).toBe(200);
        const allowedLabels = ['positive', 'negative', 'neutral'];
        const label = res.body.result?.toLowerCase();
        expect(allowedLabels).toContain(label);
    }, timeDelay);

    it('extract_json mode returns valid JSON with all required keys', async () => {
        const res = await request(app)
            .post('/api/ai')
            .send({ mode: 'extract_json', text: 'Some text to extract JSON' });

        expect(res.statusCode).toBe(200);
        expect(() => JSON.parse(res.body.result)).not.toThrow();
    }), timeDelay;

    it('rate limit path returns 429 after threshold', async () => {
        const threshold = 10;
        for (let i = 0; i < threshold; i++) {
            await request(app).post('/api/ai').send({ mode: 'summarize', text: 'test' });
        }
        const res = await request(app).post('/api/ai').send({ mode: 'summarize', text: 'test' });
        expect(res.statusCode).toBe(429);
    }, timeDelay);

});

