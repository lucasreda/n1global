// Simple dependency injection container
export const container = {
  resolve: (key) => {
    if (key === 'openai') {
      const OpenAI = require('openai');
      return new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return null;
  }
};