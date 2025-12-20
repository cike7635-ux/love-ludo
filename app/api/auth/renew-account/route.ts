// 简化测试版
import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    success: true, 
    message: '续费API测试正常' 
  });
}
