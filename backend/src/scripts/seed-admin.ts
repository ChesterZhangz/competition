import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User } from '../models/user.model';

const SALT_ROUNDS = 12;

async function seedSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Super admin details
    const superAdminData = {
      email: 'chester@viquard.com',
      nickname: 'ChesterZhang',
      password: 'Zyq0610..',
    };

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: superAdminData.email });

    if (existingAdmin) {
      // Update to super_admin role if needed
      if (existingAdmin.role !== 'super_admin') {
        existingAdmin.role = 'super_admin';
        existingAdmin.status = 'active';
        existingAdmin.emailVerified = true;
        await existingAdmin.save();
        console.log('Updated existing user to super_admin:', superAdminData.email);
      } else {
        console.log('Super admin already exists:', superAdminData.email);
      }
    } else {
      // Create new super admin
      const passwordHash = await bcrypt.hash(superAdminData.password, SALT_ROUNDS);

      await User.create({
        email: superAdminData.email,
        nickname: superAdminData.nickname,
        passwordHash,
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
      });

      console.log('Super admin created successfully:', superAdminData.email);
    }

    console.log('\nSuper Admin Account:');
    console.log('Email:', superAdminData.email);
    console.log('Password:', superAdminData.password);
    console.log('Role: super_admin');

  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedSuperAdmin();
