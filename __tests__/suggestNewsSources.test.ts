import request from 'supertest';
import app from '../src/index';

describe('POST /suggestNewsSources', () => {
  it('should return "Hello World!" for valid input', async () => {
    const validRequestBody = {
      topic: 'technology',
      bias: 'neutral',
    };
    const res = await request(app)
      .post('/suggestNewsSources')
      .send(validRequestBody);
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Hello World!');
  });

  it('should return 400 for invalid input', async () => {
    const invalidRequestBody = {
      // Missing topic and bias
    };
    const res = await request(app)
      .post('/suggestNewsSources')
      .send(invalidRequestBody);
    expect(res.statusCode).toEqual(400);
    // You might want to check the error message as well
  });
});
