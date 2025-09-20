
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding GarageGrid Lite...')
  
  // Create super admin user - Valerie
  const valeriePassword = await bcrypt.hash('SuperAdmin2025!', 12)
  
  const valerieUser = await prisma.user.upsert({
    where: { email: 'valerie@garagegrid.com' },
    update: {},
    create: {
      email: 'valerie@garagegrid.com',
      password: valeriePassword,
      name: 'Valerie Martinez',
      isAdmin: true,
      role: 'super_admin',
      permissions: [
        'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete', 'rooms:manage_all',
        'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout', 'items:manage_all',
        'boxes:create', 'boxes:read', 'boxes:update', 'boxes:delete', 'boxes:manage_all',
        'racks:create', 'racks:read', 'racks:update', 'racks:delete', 'racks:manage_all',
        'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage_roles',
        'system:settings', 'system:backup', 'system:logs', 'system:maintenance',
        'inventory:view', 'inventory:export', 'inventory:analytics', 'inventory:manage_expiration'
      ]
    },
  })

  console.log('✅ Created super admin user:', { id: valerieUser.id, email: valerieUser.email, name: valerieUser.name })

  // Create test admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@garagegrid.com' },
    update: {},
    create: {
      email: 'admin@garagegrid.com',
      password: hashedPassword,
      name: 'Admin User',
      isAdmin: true,
      role: 'admin',
      permissions: [
        'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete',
        'items:create', 'items:read', 'items:update', 'items:delete', 'items:checkout',
        'boxes:create', 'boxes:read', 'boxes:update', 'boxes:delete',
        'racks:create', 'racks:read', 'racks:update', 'racks:delete',
        'users:read', 'inventory:view', 'inventory:export', 'inventory:analytics'
      ]
    },
  })

  console.log('✅ Created admin user:', { id: adminUser.id, email: adminUser.email, name: adminUser.name })

  // Create user preferences for Valerie (super admin)
  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId: valerieUser.id,
        preferenceKey: 'theme',
      },
    },
    update: {},
    create: {
      userId: valerieUser.id,
      preferenceKey: 'theme',
      preferenceValue: 'light',
    },
  })

  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId: valerieUser.id,
        preferenceKey: 'notifications',
      },
    },
    update: {},
    create: {
      userId: valerieUser.id,
      preferenceKey: 'notifications',
      preferenceValue: 'enabled',
    },
  })

  // Create user preferences for the admin
  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId: adminUser.id,
        preferenceKey: 'theme',
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      preferenceKey: 'theme',
      preferenceValue: 'light',
    },
  })

  await prisma.userPreference.upsert({
    where: {
      userId_preferenceKey: {
        userId: adminUser.id,
        preferenceKey: 'notifications',
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      preferenceKey: 'notifications',
      preferenceValue: 'enabled',
    },
  })

  // Create a regular test user
  const testUserPassword = await bcrypt.hash('test123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@garagegrid.com' },
    update: {},
    create: {
      email: 'test@garagegrid.com',
      password: testUserPassword,
      name: 'Test User',
      isAdmin: false,
      role: 'user',
      permissions: [
        'rooms:create', 'rooms:read', 'rooms:update',
        'items:create', 'items:read', 'items:update', 'items:checkout',
        'boxes:create', 'boxes:read', 'boxes:update',
        'inventory:view'
      ]
    },
  })

  console.log('✅ Created test user:', { id: testUser.id, email: testUser.email, name: testUser.name })

  // Create clean sample rooms for the test user (no problematic colors)
  const room1 = await prisma.room.create({
    data: {
      name: 'Pantry',
      description: 'Food storage and kitchen overflow',
      color: '#3B82F6', // Blue
      userId: testUser.id,
    },
  })

  const room2 = await prisma.room.create({
    data: {
      name: 'Garage Storage',
      description: 'General household storage',
      color: '#EF4444', // Red  
      userId: testUser.id,
    },
  })

  const room3 = await prisma.room.create({
    data: {
      name: 'Basement',
      description: 'Long-term storage and bulk items',
      color: '#10B981', // Green
      userId: testUser.id,
    },
  })

  console.log('✅ Created sample rooms for test user')

  // Create comprehensive food inventory
  const foodItems = [
    // CANNED GOODS
    { name: 'Black Beans', category: 'Canned Goods', brand: 'Bush\'s', quantity: 6, value: 1.29, expirationDate: new Date('2025-12-31'), roomId: room1.id },
    { name: 'Diced Tomatoes', category: 'Canned Goods', brand: 'Hunt\'s', quantity: 8, value: 0.99, expirationDate: new Date('2025-10-15'), roomId: room1.id },
    { name: 'Chicken Broth', category: 'Canned Goods', brand: 'Swanson', quantity: 4, value: 2.49, expirationDate: new Date('2025-08-20'), roomId: room1.id },
    { name: 'Corn Kernels', category: 'Canned Goods', brand: 'Del Monte', quantity: 5, value: 1.19, expirationDate: new Date('2025-11-30'), roomId: room1.id },
    { name: 'Tuna in Water', category: 'Canned Goods', brand: 'StarKist', quantity: 12, value: 1.49, expirationDate: new Date('2026-03-15'), roomId: room1.id },
    { name: 'Tomato Sauce', category: 'Canned Goods', brand: 'Hunt\'s', quantity: 6, value: 0.79, expirationDate: new Date('2025-09-12'), roomId: room1.id },
    { name: 'Green Beans', category: 'Canned Goods', brand: 'French\'s', quantity: 4, value: 1.09, expirationDate: new Date('2025-12-01'), roomId: room1.id },
    { name: 'Peaches in Syrup', category: 'Canned Goods', brand: 'Del Monte', quantity: 3, value: 1.89, expirationDate: new Date('2025-07-30'), roomId: room1.id },
    
    // BOXED/PACKAGED GOODS
    { name: 'Spaghetti Pasta', category: 'Grains & Pasta', brand: 'Barilla', quantity: 8, value: 1.39, expirationDate: new Date('2026-05-20'), roomId: room1.id },
    { name: 'Brown Rice', category: 'Grains & Pasta', brand: 'Uncle Ben\'s', quantity: 3, value: 2.99, expirationDate: new Date('2025-12-15'), roomId: room1.id },
    { name: 'Quinoa', category: 'Grains & Pasta', brand: 'Ancient Harvest', quantity: 2, value: 4.49, expirationDate: new Date('2025-10-30'), roomId: room1.id },
    { name: 'Whole Wheat Bread', category: 'Bakery', brand: 'Dave\'s Killer Bread', quantity: 2, value: 3.99, expirationDate: new Date('2025-09-05'), roomId: room1.id },
    { name: 'Cheerios', category: 'Breakfast', brand: 'General Mills', quantity: 3, value: 4.29, expirationDate: new Date('2025-11-18'), roomId: room1.id },
    { name: 'Oatmeal', category: 'Breakfast', brand: 'Quaker', quantity: 2, value: 3.79, expirationDate: new Date('2025-12-25'), roomId: room1.id },
    { name: 'Crackers', category: 'Snacks', brand: 'Ritz', quantity: 4, value: 2.49, expirationDate: new Date('2025-08-15'), roomId: room1.id },

    // BAGGED ITEMS
    { name: 'White Rice', category: 'Grains & Pasta', brand: 'Jasmine', quantity: 2, value: 8.99, expirationDate: new Date('2026-02-28'), roomId: room3.id },
    { name: 'All-Purpose Flour', category: 'Baking', brand: 'King Arthur', quantity: 3, value: 4.49, expirationDate: new Date('2025-10-20'), roomId: room3.id },
    { name: 'White Sugar', category: 'Baking', brand: 'Domino', quantity: 2, value: 2.99, expirationDate: new Date('2027-01-31'), roomId: room3.id },
    { name: 'Brown Sugar', category: 'Baking', brand: 'C&H', quantity: 1, value: 3.29, expirationDate: new Date('2026-06-15'), roomId: room3.id },
    { name: 'Potato Chips', category: 'Snacks', brand: 'Lay\'s', quantity: 6, value: 2.99, expirationDate: new Date('2025-09-30'), roomId: room1.id },

    // DAIRY PRODUCTS  
    { name: 'Whole Milk', category: 'Dairy', brand: 'Organic Valley', quantity: 2, value: 4.99, expirationDate: new Date('2025-09-10'), roomId: room1.id },
    { name: 'Greek Yogurt', category: 'Dairy', brand: 'Chobani', quantity: 8, value: 1.29, expirationDate: new Date('2025-09-20'), roomId: room1.id },
    { name: 'Cheddar Cheese', category: 'Dairy', brand: 'Tillamook', quantity: 3, value: 4.49, expirationDate: new Date('2025-10-15'), roomId: room1.id },
    { name: 'Butter', category: 'Dairy', brand: 'Land O Lakes', quantity: 4, value: 3.99, expirationDate: new Date('2025-11-01'), roomId: room1.id },
    { name: 'Cream Cheese', category: 'Dairy', brand: 'Philadelphia', quantity: 2, value: 2.79, expirationDate: new Date('2025-09-25'), roomId: room1.id },

    // MEAT & PROTEIN
    { name: 'Ground Beef', category: 'Meat', brand: 'Fresh Market', quantity: 3, value: 6.99, expirationDate: new Date('2025-09-02'), roomId: room1.id },
    { name: 'Chicken Breast', category: 'Meat', brand: 'Perdue', quantity: 2, value: 8.49, expirationDate: new Date('2025-09-04'), roomId: room1.id },
    { name: 'Salmon Fillet', category: 'Seafood', brand: 'Wild Alaska', quantity: 4, value: 12.99, expirationDate: new Date('2025-09-01'), roomId: room1.id },
    { name: 'Eggs', category: 'Dairy', brand: 'Happy Egg Co', quantity: 2, value: 3.79, expirationDate: new Date('2025-09-15'), roomId: room1.id },
    { name: 'Bacon', category: 'Meat', brand: 'Applewood', quantity: 2, value: 5.99, expirationDate: new Date('2025-09-18'), roomId: room1.id },

    // FROZEN FOODS
    { name: 'Frozen Broccoli', category: 'Frozen', brand: 'Birds Eye', quantity: 6, value: 1.99, expirationDate: new Date('2026-02-28'), roomId: room1.id },
    { name: 'Frozen Pizza', category: 'Frozen', brand: 'DiGiorno', quantity: 3, value: 4.99, expirationDate: new Date('2025-12-31'), roomId: room1.id },
    { name: 'Ice Cream', category: 'Frozen', brand: 'Ben & Jerry\'s', quantity: 4, value: 5.49, expirationDate: new Date('2025-12-01'), roomId: room1.id },
    
    // CONDIMENTS & SPICES
    { name: 'Olive Oil', category: 'Condiments', brand: 'Bertolli', quantity: 2, value: 6.99, expirationDate: new Date('2026-05-15'), roomId: room1.id },
    { name: 'Salt', category: 'Spices', brand: 'Morton', quantity: 3, value: 0.99, expirationDate: new Date('2030-01-01'), roomId: room1.id },
    { name: 'Black Pepper', category: 'Spices', brand: 'McCormick', quantity: 2, value: 2.49, expirationDate: new Date('2026-08-20'), roomId: room1.id },
    { name: 'Ketchup', category: 'Condiments', brand: 'Heinz', quantity: 2, value: 2.99, expirationDate: new Date('2025-11-30'), roomId: room1.id },
    { name: 'Mustard', category: 'Condiments', brand: 'French\'s', quantity: 1, value: 1.79, expirationDate: new Date('2025-10-15'), roomId: room1.id },
  ]

  console.log('🍽️ Creating food inventory items...')
  
  for (const item of foodItems) {
    await prisma.item.create({
      data: {
        name: item.name,
        description: `${item.brand} ${item.name}`,
        category: item.category,
        quantity: item.quantity,
        value: item.value,
        expirationDate: item.expirationDate,
        userId: testUser.id,
        roomId: item.roomId,
        status: 'AVAILABLE',
        isFood: true,
        foodCategory: item.category,
        notes: `Brand: ${item.brand}`,
      }
    })
  }

  console.log('✅ Created comprehensive food inventory!')
  console.log('✅ Created user preferences')
  console.log('')
  console.log('🎉 GarageGrid Lite seeding completed successfully!')
  console.log('')
  console.log('Login credentials:')
  console.log('👑 Super Admin: valerie@garagegrid.com / SuperAdmin2025!')
  console.log('📧 Admin:       admin@garagegrid.com / admin123')
  console.log('📧 Test User:   test@garagegrid.com / test123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
