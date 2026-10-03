import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import WorkerProfile from './models/WorkerProfile.js';
import Ticket from './models/Ticket.js';
import Review from './models/Review.js';

dotenv.config();

const seedData = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/worker-management';
    console.log(`Connecting to database for seeding: ${connStr}`);
    await mongoose.connect(connStr);

    // 1. Clear database
    console.log('Cleaning existing records...');
    await User.deleteMany({});
    await WorkerProfile.deleteMany({});
    await Ticket.deleteMany({});
    await Review.deleteMany({});

    console.log('Inserting seed records...');

    // 2. Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@worker.com',
      password: 'admin123',
      phone: '9876543210',
      role: 'admin',
      address: {
        street: 'Admin Headquarters, Block A',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    console.log('Admin account created: admin@worker.com / admin123');

    // 3. Create Clients
    const client1 = await User.create({
      name: 'Amit Sharma',
      email: 'client1@client.com',
      password: 'client123',
      phone: '9820012345',
      role: 'user',
      address: {
        street: '102, Shanti Niwas, MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    const client2 = await User.create({
      name: 'Priya Patel',
      email: 'client2@client.com',
      password: 'client123',
      phone: '9819954321',
      role: 'user',
      address: {
        street: 'Flat 5B, Skyline Heights, Link Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
      },
    });
    console.log('Clients created:\n - client1@client.com / client123\n - client2@client.com / client123');

    // 4. Create Workers and Profiles
    const worker1User = await User.create({
      name: 'Ramesh Kumar (Electrician)',
      email: 'worker1@worker.com',
      password: 'worker123',
      phone: '9930055667',
      role: 'worker',
      address: {
        street: 'Room 12, chawl no. 4, Dharavi',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    const worker1Profile = await WorkerProfile.create({
      userId: worker1User._id,
      skills: ['Electrical', 'General Repairs'],
      rating: 4.8,
      isAvailable: true,
      serviceArea: '400001',
      jobsCompleted: 15,
    });

    const worker2User = await User.create({
      name: 'Sunil Patil (Plumber)',
      email: 'worker2@worker.com',
      password: 'worker123',
      phone: '9920033445',
      role: 'worker',
      address: {
        street: '56, Shiv Nagar, Kurla',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    const worker2Profile = await WorkerProfile.create({
      userId: worker2User._id,
      skills: ['Plumbing'],
      rating: 4.5,
      isAvailable: true,
      serviceArea: '400001',
      jobsCompleted: 8,
    });

    const worker3User = await User.create({
      name: 'Jagdish Suthar (Carpenter)',
      email: 'worker3@worker.com',
      password: 'worker123',
      phone: '9821122334',
      role: 'worker',
      address: {
        street: 'Block C-3, MHADA Colony, Bandra',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
      },
    });
    const worker3Profile = await WorkerProfile.create({
      userId: worker3User._id,
      skills: ['Carpentry', 'General Repairs'],
      rating: 4.9,
      isAvailable: true,
      serviceArea: '400002',
      jobsCompleted: 22,
    });
    console.log('Workers created:\n - worker1@worker.com / worker123 (Electrician, Pincode 400001)\n - worker2@worker.com / worker123 (Plumber, Pincode 400001)\n - worker3@worker.com / worker123 (Carpenter, Pincode 400002)');

    // 5. Create some tickets
    // Ticket 1: Completed, reviewed
    const ticket1 = await Ticket.create({
      userId: client1._id,
      workerId: worker1User._id,
      title: 'Kitchen light switch replacement',
      category: 'Electrical',
      description: 'The kitchen light switch sparks when flipped. Needs immediate replacement.',
      severity: 'High',
      status: 'Completed',
      location: {
        address: '102, Shanti Niwas, MG Road',
        pincode: '400001',
      },
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      resolutionNotes: 'Replaced burnt spark-prone modular switch with a brand new 6A switch. Verified wiring safety.',
    });

    await Review.create({
      ticketId: ticket1._id,
      userId: client1._id,
      workerId: worker1User._id,
      rating: 5,
      comment: 'Very professional, arrived quickly and fixed it in 15 minutes! Thank you.',
    });

    // Ticket 2: Assigned, in progress
    await Ticket.create({
      userId: client1._id,
      workerId: worker2User._id,
      title: 'Bathroom tap leak',
      category: 'Plumbing',
      description: 'The main basin tap leaks drop-by-drop and wastes a lot of water.',
      severity: 'Medium',
      status: 'In Progress',
      location: {
        address: '102, Shanti Niwas, MG Road',
        pincode: '400001',
      },
    });

    // Ticket 3: Pending, auto-assignment fails (No worker with skill Masonry)
    await Ticket.create({
      userId: client2._id,
      title: 'Cracked brick boundary wall repair',
      category: 'Masonry',
      description: 'The garden wall has a 1-meter long crack. Needs plastering and cementing.',
      severity: 'Low',
      status: 'Pending',
      location: {
        address: 'Flat 5B, Skyline Heights, Link Road',
        pincode: '400002',
      },
    });

    // Seeded accounts are pre-verified so demo logins work immediately.
    await User.updateMany({}, { $set: { isVerified: true } });

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
