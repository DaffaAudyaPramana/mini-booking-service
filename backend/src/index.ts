import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';
import bookingsRoutes from './routes/bookings';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/bookings', bookingsRoutes);

// Export for testing
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
