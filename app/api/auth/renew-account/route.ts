// 简化测试版
import { createRouteHandlerClient } from '@supabase/ssr'; 
export async function POST() {
  return NextResponse.json({ 
    success: true, 
    message: '续费API测试正常' 
  });
}
