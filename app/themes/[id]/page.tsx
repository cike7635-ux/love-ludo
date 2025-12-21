// /app/themes/[id]/page.tsx - 修复保存按钮重复提交问题
'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import { getThemeById, listTasksByTheme, updateTheme, createTask, updateTask, deleteTask } from "../actions";
import GenerateTasksSection from "@/components/generate-tasks";
import { useRouter } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };

export default function ThemeDetailPage({ params }: Params) {
  const [theme, setTheme] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeSaveStatus, setThemeSaveStatus] = useState<{
    isSaving: boolean;
    showSuccess: boolean;
  }>({ isSaving: false, showSuccess: false });
  const [taskSavingId, setTaskSavingId] = useState<string | null>(null);
  const router = useRouter();

  // 初始化数据
  useState(() => {
    const initData = async () => {
      const { id: themeId } = await params;
      const [themeResult, tasksResult] = await Promise.all([
        getThemeById(themeId),
        listTasksByTheme(themeId),
      ]);
      
      setTheme(themeResult.data);
      setTasks(tasksResult.data || []);
      setLoading(false);
    };
    initData();
  });

  // 处理主题保存
  const handleSaveTheme = async (formData: FormData) => {
    if (themeSaveStatus.isSaving) return;
    
    setThemeSaveStatus({ isSaving: true, showSuccess: false });
    
    try {
      await updateTheme(formData);
      
      // 显示成功状态
      setThemeSaveStatus({ isSaving: false, showSuccess: true });
      
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setThemeSaveStatus({ isSaving: false, showSuccess: false });
      }, 3000);
      
    } catch (error) {
      setThemeSaveStatus({ isSaving: false, showSuccess: false });
      console.error('保存失败:', error);
    }
  };

  // 处理任务保存
  const handleSaveTask = async (formData: FormData, taskId: string) => {
    if (taskSavingId === taskId) return;
    
    setTaskSavingId(taskId);
    
    try {
      await updateTask(formData);
      
      // 显示成功状态
      setTimeout(() => {
        setTaskSavingId(null);
      }, 1000);
      
    } catch (error) {
      setTaskSavingId(null);
      console.error('保存任务失败:', error);
    }
  };

  // 处理添加任务
  const handleAddTask = async (formData: FormData) => {
    await createTask(formData);
    // 刷新页面数据
    const { id: themeId } = await params;
    const tasksResult = await listTasksByTheme(themeId);
    setTasks(tasksResult.data || []);
  };

  // 处理删除任务
  const handleDeleteTask = async (formData: FormData) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(formData);
      // 刷新页面数据
      const { id: themeId } = await params;
      const tasksResult = await listTasksByTheme(themeId);
      setTasks(tasksResult.data || []);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-svh flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink mx-auto mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="max-w-md mx-auto min-h-svh flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold mb-2">主题不存在</h3>
          <p className="text-gray-400 mb-4">请返回主题列表重试</p>
          <Button asChild className="gradient-primary glow-pink">
            <Link href="/themes">返回主题列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-svh flex flex-col pb-24 px-6">
      <div className="glass px-6 pt-4 pb-6 rounded-b-3xl -mx-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/themes" className="text-white/80 hover:text-white flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </Link>
          <h2 className="text-xl font-bold">主题管理</h2>
          <div className="w-16" />
        </div>
      </div>

      <div className="space-y-4">
        {/* 主题信息表单 */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-4">主题信息</h3>
          <form action={handleSaveTheme} className="space-y-4">
            <input type="hidden" name="id" value={theme.id} />
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">主题标题</Label>
              <Input
                id="title"
                name="title"
                defaultValue={theme.title}
                required
                className="bg-white/10 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">主题描述</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:border-brand-pink transition-all"
                defaultValue={theme.description ?? ""}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              {themeSaveStatus.showSuccess && (
                <div className="flex items-center text-green-400 animate-pulse">
                  <Check className="w-4 h-4 mr-1" />
                  <span className="text-sm">保存成功</span>
                </div>
              )}
              <Button 
                type="submit" 
                className="gradient-primary glow-pink"
                disabled={themeSaveStatus.isSaving}
              >
                {themeSaveStatus.isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  '保存修改'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* 添加任务表单 */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-4">添加任务</h3>
          <form action={handleAddTask} className="space-y-4">
            <input type="hidden" name="theme_id" value={theme.id} />
            <input type="hidden" name="type" value="interaction" />
            <input type="hidden" name="order_index" value="0" />
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">任务内容</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:border-brand-pink transition-all"
                placeholder="例如：一起完成 10 分钟冥想并分享感受"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <GenerateTasksSection inline themeId={theme.id} themeTitle={theme.title} themeDescription={theme.description} />
              <Button type="submit" className="gradient-primary glow-pink flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>添加任务</span>
              </Button>
            </div>
          </form>
        </div>

        {/* 任务列表 */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">任务列表</h3>
            <span className="text-sm text-gray-400">{tasks.length} 个任务</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无任务，先添加一个吧</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4" key={task.id}>
                  <form action={(formData) => handleSaveTask(formData, task.id)} className="space-y-3">
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="type" value={task.type} />
                    <input type="hidden" name="order_index" value={task.order_index ?? 0} />
                    <input type="hidden" name="theme_id" value={theme.id} />
                    <div className="space-y-2">
                      <textarea
                        name="description"
                        rows={3}
                        className="w-full min-h-16 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:border-brand-pink transition-all"
                        defaultValue={task.description}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        onClick={() => {
                          const formData = new FormData();
                          formData.append('id', task.id);
                          handleDeleteTask(formData);
                        }}
                        variant="ghost"
                        size="icon"
                        aria-label="删除任务"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="submit" 
                        variant="outline" 
                        size="sm" 
                        className="border-white/20 hover:bg-white/10 flex items-center gap-2"
                        disabled={taskSavingId === task.id}
                      >
                        {taskSavingId === task.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            保存中...
                          </>
                        ) : (
                          '保存'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
