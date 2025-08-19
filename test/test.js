const request = require('supertest');
const app = require('../backend/app');

describe('/api/ai endpoint', () => {
    it('summarize returns 200 and non-empty result', async () => {
        const res = await request(app)
            .post('/api/ai')
            .send({ mode: 'summarize', text: 'This is a sample text to summarize.' });

        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBeDefined();
        expect(res.body.result.length).toBeGreaterThan(0);
    }, 100000);

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
    }, 100000);

    it('rate limit path returns 429 after threshold', async () => {
        const threshold = 10;
        for (let i = 0; i < threshold; i++) {
            await request(app).post('/api/ai').send({ mode: 'summarize', text: 'test' });
        }
        const res = await request(app).post('/api/ai').send({ mode: 'summarize', text: 'test' });
        expect(res.statusCode).toBe(429);
    }, 100000);
});
