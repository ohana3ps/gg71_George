
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load environment variables
config()

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Fetching current users...\n')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('Current Active Users:')
    console.log('==================')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'} (${user.email}) - ${user.role} - Created: ${user.createdAt.toLocaleDateString()}`)
    })
    console.log(`\nTotal: ${users.length} users\n`)
    
    // Categorize users based on requirements
    const legacyUsers = users.filter(u => {
      const isNotTest = !u.email.includes('test') && (!u.name || !u.name.toLowerCase().includes('test'))
      const isNotSpecial = !['Valerie', 'Mom'].some(name => u.name?.includes(name))
      return isNotTest && isNotSpecial
    })
    
    const specialUsers = users.filter(u => 
      u.name && ['Valerie', 'Mom'].some(name => u.name!.includes(name))
    )
    
    const testUsers = users.filter(u => 
      u.email.includes('test') || (u.name && u.name.toLowerCase().includes('test'))
    )
    
    console.log('=== USER CATEGORIES ===')
    console.log(`📂 Legacy/Original users (${legacyUsers.length}):`)
    legacyUsers.forEach(u => console.log(`  - ${u.name || 'No Name'} (${u.email})`))
    
    console.log(`\n👥 Special users - Valerie, Mom (${specialUsers.length}):`)
    specialUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`))
    
    console.log(`\n🧪 Test users (${testUsers.length}):`)
    testUsers.forEach((u, index) => console.log(`  ${index + 1}. ${u.name || 'No Name'} (${u.email})`))
    
    // Calculate what to keep and what to delete
    const keepCount = legacyUsers.length + specialUsers.length + 3 // Keep 3 test users
    const testUsersToKeep = testUsers.slice(0, 3) // Keep first 3 test users (oldest)
    const testUsersToDelete = testUsers.slice(3) // Delete the rest
    
    console.log(`\n📊 CLEANUP PLAN:`)
    console.log(`   Keep: ${legacyUsers.length} legacy + ${specialUsers.length} special + 3 test = ${keepCount} users`)
    console.log(`   Delete: ${testUsersToDelete.length} excess test users`)
    
    if (testUsersToDelete.length === 0) {
      console.log('\n✅ No cleanup needed - user count is already optimal!')
      return
    }
    
    console.log(`\n🗑️  Users to DELETE:`)
    testUsersToDelete.forEach(u => console.log(`  - ${u.name || 'No Name'} (${u.email})`))
    
    console.log(`\n✅ Users to KEEP:`)
    console.log(`   Legacy users: ${legacyUsers.length}`)
    legacyUsers.forEach(u => console.log(`     - ${u.name || 'No Name'} (${u.email})`))
    console.log(`   Special users: ${specialUsers.length}`)
    specialUsers.forEach(u => console.log(`     - ${u.name} (${u.email})`))
    console.log(`   Test users: 3`)
    testUsersToKeep.forEach(u => console.log(`     - ${u.name || 'No Name'} (${u.email})`))
    
    // Performing the cleanup as requested
    console.log(`\n🚀 Performing cleanup...`)
    
    for (const user of testUsersToDelete) {
      await prisma.user.delete({
        where: { id: user.id }
      })
      console.log(`   ✅ Deleted: ${user.name || 'No Name'} (${user.email})`)
    }
    
    console.log(`\n✨ Cleanup complete! Deleted ${testUsersToDelete.length} users`)
    console.log(`   Final user count: ${users.length - testUsersToDelete.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
