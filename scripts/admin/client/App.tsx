import { useState } from 'react';
import { ArticleWorkspace } from './components/ArticleWorkspace.tsx';
import { ConfigWorkspace } from './components/ConfigWorkspace.tsx';
import { ImageWorkspace } from './components/ImageWorkspace.tsx';
import './styles.css';

type AdminView = 'articles' | 'config' | 'images';

const navItems: Array<{ view: AdminView; label: string; description: string }> = [
  { view: 'articles', label: '文章', description: '文章编辑与发布' },
  { view: 'config', label: '配置', description: '站点 YAML 设置' },
  { view: 'images', label: '图片', description: '封面与头图资源' },
];

export function App() {
  const [activeView, setActiveView] = useState<AdminView>('articles');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="管理导航">
        <div className="admin-brand">
          <strong>Koharu Admin</strong>
          <span>本地博客管理工作台</span>
        </div>
        <nav className="admin-nav" aria-label="工作区">
          {navItems.map((item) => (
            <button
              aria-current={activeView === item.view ? 'page' : undefined}
              className="admin-nav__button"
              key={item.view}
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        {activeView === 'articles' && <ArticleWorkspace />}
        {activeView === 'config' && <ConfigWorkspace />}
        {activeView === 'images' && <ImageWorkspace />}
      </main>
    </div>
  );
}
