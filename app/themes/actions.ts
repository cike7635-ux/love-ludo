// /app/themes/actions.ts
// 修复版本：确保新用户有默认主题
'use server';

import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profile';
import fs from 'fs/promises';
import path from 'path';

// 获取用户所有主题
export async function listMyThemes() {
  try {
    const supabase = await createClient();
    
    // 确保用户资料存在
    await ensureProfile();
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: '用户未登录' };
    }
    
    // 查询用户主题
    const { data, error } = await supabase
      .from('themes')
      .select('*, task_count')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('查询主题失败:', error);
      return { data: null, error: error.message };
    }
    
    // 🔥 关键修复：如果用户没有主题，初始化默认主题
    if (!data || data.length === 0) {
      console.log(`用户 ${user.email} 没有主题，开始初始化默认主题`);
      
      try {
        // 读取默认主题模板
        const filePath = path.join(process.cwd(), 'lib', 'tasks.json');
        const content = await fs.readFile(filePath, 'utf-8');
        const templates = JSON.parse(content);
        
        console.log(`找到 ${templates.length} 个默认主题模板`);
        
        // 创建默认主题
        const createdThemes = [];
        for (const tpl of templates) {
          // 创建主题
          const { data: theme, error: themeError } = await supabase
            .from('themes')
            .insert({
              title: tpl.title,
              description: tpl.description,
              creator_id: user.id,
              is_public: false,
              task_count: tpl.tasks.length
            })
            .select()
            .single();
          
          if (themeError) {
            console.error('创建主题失败:', themeError);
            continue;
          }
          
          // 创建任务
          for (const task of tpl.tasks) {
            await supabase.from('tasks').insert({
              theme_id: theme.id,
              description: task.description,
              type: task.type || 'interaction',
              order_index: task.order_index || 0,
              is_ai_generated: false
            });
          }
          
          createdThemes.push(theme);
        }
        
        console.log(`为用户 ${user.email} 创建了 ${createdThemes.length} 个默认主题`);
        
        // 返回创建的主题
        return { data: createdThemes, error: null };
        
      } catch (initError) {
        console.error('初始化主题失败:', initError);
        // 返回空数组而不是错误，让用户手动创建主题
        return { data: [], error: null };
      }
    }
    
    return { data, error: null };
    
  } catch (error) {
    console.error('获取主题异常:', error);
    return { data: null, error: '服务器错误' };
  }
}

// 其他函数保持不变...
