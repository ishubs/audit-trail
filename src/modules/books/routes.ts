import { type FastifyInstance } from 'fastify';

import {
  createBookController,
  deleteBookController,
  getBookController,
  listBooksController,
  updateBookController
} from './controller.js';

export async function registerBookRoutes(app: FastifyInstance) {
  app.get('/api/books', listBooksController);
  app.post('/api/books', createBookController);
  app.get('/api/books/:id', getBookController);
  app.patch('/api/books/:id', updateBookController);
  app.delete('/api/books/:id', deleteBookController);
}

