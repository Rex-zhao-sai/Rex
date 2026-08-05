import { createClient } from '@libsql/client';

// Turso 数据库客户端
// 注意：NEXT_PUBLIC_ 前缀的环境变量会自动暴露给客户端
// 构建时环境变量可能不可用，需要检查
const tursoUrl = process.env.NEXT_PUBLIC_TURSO_URL;
const tursoToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

const turso = (tursoUrl && tursoToken) 
  ? createClient({ url: tursoUrl, authToken: tursoToken })
  : null;

export default turso;

// 检查 Turso 是否可用
export function isTursoAvailable(): boolean {
  return turso !== null;
}

// 辅助函数：执行 SQL
export async function executeSQL(sql: string, args: any[] = []) {
  if (!turso) throw new Error('Turso 不可用：环境变量未配置');
  return await turso.execute({ sql, args });
}

// 辅助函数：查询单条记录
export async function querySingle(sql: string, args: any[] = []) {
  if (!turso) throw new Error('Turso 不可用：环境变量未配置');
  const result = await turso.execute({ sql, args });
  return result.rows[0] || null;
}

// 辅助函数：查询多条记录
export async function queryAll(sql: string, args: any[] = []) {
  if (!turso) throw new Error('Turso 不可用：环境变量未配置');
  const result = await turso.execute({ sql, args });
  return result.rows;
}
