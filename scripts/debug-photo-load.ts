import turso from '../src/lib/turso';

async function debug() {
  if (!turso) {
    console.error('Turso not available');
    return;
  }
  
  const result = await turso.execute(
    "SELECT photo_pairs FROM maintenance_records WHERE equipment_id = 'lotus-ict' AND month = '2026-08'"
  );
  
  if (result.rows.length > 0) {
    const photoPairsStr = result.rows[0].photo_pairs as string;
    const photoPairs = JSON.parse(photoPairsStr);
    
    console.log('Full photo pairs structure:');
    console.log(JSON.stringify(photoPairs, null, 2));
    
    // 检查每个 pair 的字段
    photoPairs.forEach((pair: any, index: number) => {
      console.log(`\n--- Pair ${index + 1} ---`);
      console.log('pair.id:', pair.id);
      console.log('pair.beforeKey:', pair.beforeKey);
      console.log('pair.afterKey:', pair.afterKey);
      console.log('pair.before:', pair.before);
      console.log('pair.after:', pair.after);
      
      if (pair.before) {
        console.log('pair.before.dataUrl:', pair.before.dataUrl?.substring(0, 50));
        console.log('pair.before.s3Url:', pair.before.s3Url);
      }
      if (pair.after) {
        console.log('pair.after.dataUrl:', pair.after.dataUrl?.substring(0, 50));
        console.log('pair.after.s3Url:', pair.after.s3Url);
      }
    });
  }
}

debug().catch(console.error);
