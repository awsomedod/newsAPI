import express from 'express';
import { z } from 'zod';
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});


const SuggestNewsSourcesInputSchema = z.object({
  topic: z.string(),
  bias: z.string(),
});

type SuggestNewsSourcesInput = z.infer<typeof SuggestNewsSourcesInputSchema>;

app.post('/suggestNewsSources', (req, res) => {
  try {
    const input: SuggestNewsSourcesInput = SuggestNewsSourcesInputSchema.parse(req.body);
    console.log(input);
    res.send(`Hello World!`);
  } catch (error) {
    res.status(400).send(error.message);
  }
})

export default app;

if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
}


