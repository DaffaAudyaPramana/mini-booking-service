import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per `window` (here, per 1 minute)
  message: { message: 'Too many search requests from this IP, please try again after a minute' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// GET /schedules?route_id=&date=
router.get('/', searchLimiter, async (req, res) => {
  const { route_id, date } = req.query;

  try {
    const whereClause: any = {};
    
    if (route_id) {
      whereClause.routeId = String(route_id);
    }
    
    if (date) {
      // date is expected in YYYY-MM-DD format
      const startDate = new Date(String(date));
      startDate.setUTCHours(0, 0, 0, 0);
      
      const endDate = new Date(String(date));
      endDate.setUTCHours(23, 59, 59, 999);
      
      whereClause.departure = {
        gte: startDate,
        lte: endDate,
      };
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        route: {
          include: {
            operator: true
          }
        }
      }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /schedules/:id/seats
router.get('/:id/seats', async (req, res) => {
  const { id } = req.params;

  try {
    const seats = await prisma.seat.findMany({
      where: { scheduleId: id },
      orderBy: { seatNumber: 'asc' }
    });

    // Check for expired locks and map them as available
    const now = new Date();
    const mappedSeats = seats.map(seat => {
      let status = seat.status;
      
      if (status === 'LOCKED' && seat.lockedUntil && seat.lockedUntil < now) {
        // Technically it's available because the lock expired. 
        // We could also run a background job or lazy-update it in DB here.
        status = 'AVAILABLE';
      }

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        status: status,
      };
    });

    res.json(mappedSeats);
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /schedules/:id/seats/:seatId/lock
router.post('/:id/seats/:seatId/lock', authenticateToken, async (req: any, res: any) => {
  const { id, seatId } = req.params;
  const userId = req.user.id;
  
  try {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId }
    });

    if (!seat || seat.scheduleId !== id) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    const now = new Date();
    
    // Check if it's already booked or locked by someone else and not expired
    if (seat.status === 'BOOKED') {
      return res.status(400).json({ message: 'Seat is already booked' });
    }
    
    if (seat.status === 'LOCKED' && seat.lockedBy !== userId && seat.lockedUntil && seat.lockedUntil > now) {
      return res.status(400).json({ message: 'Seat is locked by another user' });
    }

    // Optimistic Locking: update using current version
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    
    const updateResult = await prisma.seat.updateMany({
      where: {
        id: seatId,
        version: seat.version // Ensure no one else modified it in the meantime
      },
      data: {
        status: 'LOCKED',
        lockedBy: userId,
        lockedUntil: lockExpiry,
        version: {
          increment: 1
        }
      }
    });

    if (updateResult.count === 0) {
      return res.status(409).json({ message: 'Concurrency conflict, seat was locked by another user' });
    }

    res.json({ message: 'Seat locked successfully', lockedUntil: lockExpiry });
  } catch (error) {
    console.error('Error locking seat:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
