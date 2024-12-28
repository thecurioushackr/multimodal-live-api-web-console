import { FC } from 'react';

export const Sidebar: FC = () => {
  return (
    <aside className="w-64 bg-background border-r border-divider">
      <div className="p-4">
        <h2 className="text-xl font-bold">Ace Assistant</h2>
      </div>
      {/* Add sidebar content here */}
    </aside>
  );
}; 