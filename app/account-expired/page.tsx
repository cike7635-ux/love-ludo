export default function AccountExpiredPage() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>账号已过期</h1>
      <p style={{ marginBottom: '10px' }}>您的访问权限已到期。</p>
      <p style={{ marginBottom: '20px' }}>如需继续使用，请联系管理员获取新的访问密钥。</p>
      <div>
        <a 
          href="/login" 
          style={{ 
            display: 'inline-block',
            background: '#3498db', 
            color: 'white', 
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            marginRight: '10px'
          }}
        >
          重新登录
        </a>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block',
            background: '#95a5a6', 
            color: 'white', 
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none'
          }}
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
