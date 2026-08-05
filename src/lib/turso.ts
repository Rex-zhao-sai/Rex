import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Turso 数据库客户端
const turso = createClient({
  url: process.env.NEXT_PUBLIC_TURSO_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default turso;

// 辅助函数：执行 SQL
export async function executeSQL(sql: string, args: any[] = []) {
  return await turso.execute({ sql, args });
}

// 辅助函数：查询单条记录
export async function querySingle(sql: string, args: any[] = []) {
  const result = await turso.execute({ sql, args });
  return result.rows[0] || null;
}

// 辅助函数：查询多条记录
export async function queryAll(sql: string, args: any[] = []) {
  const result = await turso.execute({ sql, args });
  return result.rows;
}
