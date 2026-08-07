import turso from '../src/lib/turso';

async function checkCache() {
  if (!turso) {
    console.error('Turso not available');
    return;
  }
  
  const result = await turso.execute(
    "SELECT photo_pairs FROM maintenance_records WHERE equipment_id = 'lotus-ict' AND month = '2026-08'"
  );
  
  if (result.rows.length > 0) {
    const photoPairsStr = result.rows[0].photo_pairs as string;
    console.log('Raw photo_pairs:', photoPairsStr.substring(0, 500));
    
    const photoPairs = JSON.parse(photoPairsStr);
    console.log('\nParsed photo pairs structure:');
    console.log(JSON.stringify(photoPairs, null, 2));
    
    // 检查每个字段的类型
    if (photoPairs[0]) {
      console.log('\nField types:');
      console.log('beforeKey:', typeof photoPairs[0].beforeKey, photoPairs[0].beforeKey);
      console.log('afterKey:', typeof photoPairs[0].afterKey, photoPairs[0].afterKey);
      console.log('before:', typeof photoPairs[0].before, photoPairs[0].before?.substring(0, 100));
      console.log('after:', typeof photoPairs[0].after, photoPairs[0].after?.substring(0, 100));
    }
  }
}

checkCache().catch(console.error);
