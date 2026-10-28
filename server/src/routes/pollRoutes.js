import express from 'express';
import { createPoll, getPolls, getPollById, submitVote } from '../controllers/pollController.js';

const router = express.Router();
router.route('/').get(getPolls).post(createPoll);
router.post('/:id/vote', submitVote);
router.get('/:id', getPollById);

export default router;
