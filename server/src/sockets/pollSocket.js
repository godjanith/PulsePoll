import crypto from 'node:crypto';
import { castVote } from '../repositories/pollRepository.js';

const deriveFallbackHash = (socket) => {
  const ipHeader = socket.handshake.headers['x-forwarded-for'];
  const ip = (Array.isArray(ipHeader) ? ipHeader[0] : String(ipHeader || socket.handshake.address || 'unknown-ip')).split(',')[0].trim();
  const userAgent = String(socket.handshake.headers['user-agent'] || 'unknown-ua').slice(0, 300);
  return crypto.createHash('sha256').update(`${ip}::${userAgent}`).digest('hex');
};

const isSafeId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 128;

export const registerPollSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_poll', async (payload = {}) => {
      const { pollId } = payload;
      if (!isSafeId(pollId)) return;
      const room = `poll:${pollId}`;
      await socket.join(room);
      io.to(room).emit('viewer_count', {
        pollId,
        viewers: io.sockets.adapter.rooms.get(room)?.size || 1,
      });
    });

    socket.on('leave_poll', async (payload = {}) => {
      const { pollId } = payload;
      if (!isSafeId(pollId)) return;
      const room = `poll:${pollId}`;
      await socket.leave(room);
      io.to(room).emit('viewer_count', {
        pollId,
        viewers: io.sockets.adapter.rooms.get(room)?.size || 0,
      });
    });

    socket.on('cast_vote', async (payload = {}, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const { pollId, optionId, voterHash: clientHash } = payload;
      if (!isSafeId(pollId) || !isSafeId(optionId)) {
        const error = { success: false, code: 'BAD_REQUEST', message: 'Poll ID and option ID are required.' };
        ack(error);
        socket.emit('vote_error', error);
        return;
      }

      const voterHash = typeof clientHash === 'string' && clientHash.length >= 8 && clientHash.length <= 256
        ? clientHash
        : deriveFallbackHash(socket);

      try {
        const result = await castVote({ pollId, optionId, voterHash });
        if (!result.success) {
          ack(result);
          socket.emit('vote_error', result);
          return;
        }

        const pollData = result.poll;
        const broadcast = {
          pollId,
          poll: pollData,
          updatedOptionId: optionId,
          timestamp: new Date().toISOString(),
        };

        ack({ success: true, poll: pollData });
        socket.emit('vote_success', { pollId, optionId });
        io.to(`poll:${pollId}`).emit('poll_updated', broadcast);
        io.emit('lobby_poll_updated', {
          pollId,
          totalVotes: pollData.totalVotes,
          options: pollData.options,
        });
      } catch (error) {
        console.error('[Socket] Vote processing failed:', error.message);
        const result = { success: false, code: 'INTERNAL_ERROR', message: 'The vote could not be processed. Please try again.' };
        ack(result);
        socket.emit('vote_error', result);
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('poll:')) {
          const pollId = room.slice('poll:'.length);
          const viewers = Math.max((io.sockets.adapter.rooms.get(room)?.size || 1) - 1, 0);
          io.to(room).emit('viewer_count', { pollId, viewers });
        }
      }
    });
  });
};
