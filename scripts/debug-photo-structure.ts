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
  }
}

debug().catch(console.error);
