// /app/admin/keys/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function KeyManager() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  
  // 生成密钥的表单状态
  const [form, setForm] = useState({
    description: 'VIP用户一年期',
    maxUses: 1,
    validDays: 365, // 账号有效期天数
    keyExpiresDays: 30, // 密钥本身有效期（注册使用期限）
  });

  // 加载现有密钥列表
  const loadKeys = async () => {
    const res = await fetch('/api/admin/keys');
    const data = await res.json();
    setKeys(data);
  };

  // 生成新密钥
  const generateKey = async () => {
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    const data = await res.json();
    if (res.ok) {
      setNewKey(data.key);
      loadKeys(); // 刷新列表
      alert(`新密钥已生成：${data.key}`);
    }
  };

  // 复制密钥到剪贴板
  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    alert('已复制到剪贴板');
  };

  useEffect(() => {
    loadKeys();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1>访问密钥管理系统</h1>
      
      {/* 生成密钥表单 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
        <h2>生成新密钥</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <label>描述：</label>
          <input 
            type="text" 
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            style={{ width: '300px', marginLeft: '10px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>最大使用次数：</label>
          <input 
            type="number" 
            value={form.maxUses}
            onChange={(e) => setForm({...form, maxUses: parseInt(e.target.value)})}
            style={{ width: '100px', marginLeft: '10px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>用户账号有效期（天）：</label>
          <input 
            type="number" 
            value={form.validDays}
            onChange={(e) => setForm({...form, validDays: parseInt(e.target.value)})}
            style={{ width: '100px', marginLeft: '10px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>密钥注册有效期（天）：</label>
          <input 
            type="number" 
            value={form.keyExpiresDays}
            onChange={(e) => setForm({...form, keyExpiresDays: parseInt(e.target.value)})}
            style={{ width: '100px', marginLeft: '10px' }}
            placeholder="30"
          />
          <small style={{ marginLeft: '10px', color: '#666' }}>
            在这个天数内必须完成注册，过期则密钥失效
          </small>
        </div>
        
        <button 
          onClick={generateKey}
          style={{ 
            background: '#0070f3', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          生成密钥
        </button>
        
        {newKey && (
          <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff' }}>
            <p><strong>新密钥：</strong> {newKey}</p>
            <button onClick={() => copyKey(newKey)}>复制密钥</button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              请立即复制并保存此密钥，页面刷新后将不再显示
            </p>
          </div>
        )}
      </div>
      
      {/* 密钥列表 */}
      <div>
        <h2>已生成的密钥</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>密钥</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>描述</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>已使用</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>账号有效期</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>密钥有效期</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <code>{key.key_code}</code>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key.description}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key.used_count}/{key.max_uses}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key.account_valid_for_days}天
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key.key_expires_at ? new Date(key.key_expires_at).toLocaleDateString() : '永久'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {key.is_active ? '✅ 有效' : '❌ 禁用'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button onClick={() => copyKey(key.key_code)}>复制</button>
                  <button 
                    onClick={async () => {
                      if (confirm('确定要禁用此密钥吗？')) {
                        await fetch(`/api/admin/keys/${key.id}`, { method: 'DELETE' });
                        loadKeys();
                      }
                    }}
                    style={{ marginLeft: '5px', background: '#ff4444', color: 'white' }}
                  >
                    禁用
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
