import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data (optional, but good for idempotent seeds)
  await prisma.booking.deleteMany()
  await prisma.seat.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.route.deleteMany()
  await prisma.operator.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      password: hashedPassword,
      name: 'User Satu',
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      password: hashedPassword,
      name: 'User Dua',
    },
  })

  // 2. Create Operator
  const operator = await prisma.operator.create({
    data: {
      name: 'GKM Trans',
    },
  })

  // 3. Create Route
  const route = await prisma.route.create({
    data: {
      operatorId: operator.id,
      origin: 'Bandung',
      destination: 'Jakarta',
    },
  })

  // 4. Create Schedule
  const schedule = await prisma.schedule.create({
    data: {
      routeId: route.id,
      departure: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      price: 150000,
    },
  })

  // 5. Create Seats (1A, 1B, 2A, 2B)
  const seatNumbers = ['1A', '1B', '2A', '2B']
  for (const seatNumber of seatNumbers) {
    await prisma.seat.create({
      data: {
        scheduleId: schedule.id,
        seatNumber: seatNumber,
        status: 'AVAILABLE',
      },
    })
  }

  console.log('Database has been seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
