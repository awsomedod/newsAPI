import request from 'supertest';
import app from '../src/index'; // Assuming your app is exported from index.ts

describe('GET /', () => {
  it('should return "Hello World!"', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Hello World! sgs');
  });
});
