// /hooks/use-heartbeat.ts - 心跳钩子
'use client';

import { useEffect, useRef } from 'react';

export function useHeartbeat() {
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 心跳函数
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          console.warn('心跳请求失败');
        }
      } catch (error) {
        console.error('心跳请求异常:', error);
      }
    };

    // 每60秒发送一次心跳
    heartbeatRef.current = setInterval(sendHeartbeat, 60000);
    
    // 立即发送第一次心跳
    sendHeartbeat();

    // 清理函数
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);
}