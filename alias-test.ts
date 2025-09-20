import path from 'path';

try {
  // Try importing one of your components via alias
  const card = require('@/components/ui/card');
  console.log('✅ Alias resolved! Imported:', Object.keys(card));
} catch (e: any) {
  console.error('❌ Alias test failed:', e.message);
}