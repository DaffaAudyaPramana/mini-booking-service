import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/confirm', authenticateToken, async (req: AuthRequest, res: any) => {
  const { seatId, scheduleId } = req.body;
  const userId = req.user?.id;

  if (!seatId || !scheduleId || !userId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Transaction to confirm booking
    const result = await prisma.$transaction(async (tx) => {
      // Find the seat first
      const seat = await tx.seat.findUnique({
        where: { id: seatId }
      });

      if (!seat) {
        throw new Error('Seat not found');
      }

      // Check if it is locked by this user and not expired
      const now = new Date();
      if (
        seat.status !== 'LOCKED' ||
        seat.lockedBy !== userId ||
        !seat.lockedUntil ||
        seat.lockedUntil < now
      ) {
        throw new Error('Seat is not locked by you or lock has expired');
      }

      // Proceed to book using Optimistic Locking
      const updateResult = await tx.seat.updateMany({
        where: {
          id: seatId,
          version: seat.version, // Ensure no one else touched it
        },
        data: {
          status: 'BOOKED',
          version: {
            increment: 1
          }
        }
      });

      if (updateResult.count === 0) {
        throw new Error('Concurrency conflict, please try again');
      }

      // Create Booking Record
      const booking = await tx.booking.create({
        data: {
          userId,
          scheduleId,
          seatId,
          status: 'CONFIRMED'
        }
      });

      return booking;
    });

    res.json({ message: 'Booking confirmed', booking: result });
  } catch (error: any) {
    console.error('Booking confirm error:', error);
    res.status(400).json({ message: error.message || 'Internal server error' });
  }
});

export default router;
