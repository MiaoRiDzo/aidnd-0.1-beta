
import React from 'react';

interface DebugMenuProps {
  // onGrantXpForLevelUp prop removed
  onClose: () => void;
}

const DebugMenu: React.FC<DebugMenuProps> = ({ onClose }) => {
  return (
    <div className="fixed top-16 right-4 z-40 bg-slate-800 border border-purple-500 p-4 rounded-lg shadow-xl w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-purple-400">Отладка</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl" aria-label="Закрыть отладку">&times;</button>
      </div>
      <div className="space-y-2">
        {/* Button for granting XP for level up removed */}
        <p className="text-sm text-slate-400 italic">Другие опции отладки могут быть добавлены сюда.</p>
      </div>
    </div>
  );
};

export default DebugMenu;
