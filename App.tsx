
import React, { useState, useEffect } from 'react';
import CharacterCreator from './components/CharacterCreator';
import ChatInterface from './components/ChatInterface';
import { Character, GamePhase } from './types';
import { API_KEY_ERROR_MESSAGE } from './constants';
import LoadingSpinner from './components/LoadingSpinner';
import DebugMenu from './components/DebugMenu'; 
import { CogIcon } from './components/icons'; 

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.CharacterCreation);
  const [character, setCharacter] = useState<Character | null>(null);
  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean | null>(null); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  // debugLevelUpTrigger state removed

  useEffect(() => {
    let keyFromEnv: string | undefined = undefined;
    if (typeof process !== 'undefined' && process.env) {
      keyFromEnv = process.env.API_KEY;
    }

    if (keyFromEnv && keyFromEnv !== "YOUR_API_KEY_HERE_PLACEHOLDER" && keyFromEnv.length > 10) { 
      setApiKeyAvailable(true);
    } else {
      setApiKeyAvailable(false);
      setErrorMessage(API_KEY_ERROR_MESSAGE);
    }
  }, []);

  const handleCharacterCreated = (newCharacter: Character) => {
    setCharacter(newCharacter);
    setGamePhase(GamePhase.Gameplay);
  };

  // handleGrantXpForLevelUp function removed

  if (apiKeyAvailable === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4">
        <LoadingSpinner size="w-16 h-16" />
        <p className="mt-4 text-xl">Инициализация приключения...</p>
      </div>
    );
  }
  
  if (!apiKeyAvailable && gamePhase === GamePhase.CharacterCreation) {
      return (
           <div className="fixed inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-50 p-4">
              <div className="bg-red-800 p-8 rounded-lg shadow-2xl text-center max-w-md">
                  <h2 className="text-2xl font-bold text-white mb-4">Ошибка конфигурации API-ключа</h2>
                  <p className="text-red-200">{API_KEY_ERROR_MESSAGE}</p>
                  <p className="text-sm text-red-300 mt-4">Пожалуйста, убедитесь, что переменные окружения настроены правильно. Функции ИИ будут недоступны.</p>
                   <button 
                    onClick={() => { 
                        setApiKeyAvailable(false); 
                    }}
                    className="mt-6 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md"
                  >
                    Продолжить с отключенным ИИ (ограниченно)
                  </button>
              </div>
          </div>
      );
  }
   if (gamePhase === GamePhase.Error && errorMessage && errorMessage !== API_KEY_ERROR_MESSAGE) {
      return (
           <div className="fixed inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-50 p-4">
              <div className="bg-red-800 p-8 rounded-lg shadow-2xl text-center max-w-md">
                  <h2 className="text-2xl font-bold text-white mb-4">Произошла ошибка</h2>
                  <p className="text-red-200">{errorMessage}</p>
              </div>
          </div>
      );
  }


  return (
    <div className="min-h-screen bg-slate-900">
      {gamePhase === GamePhase.Gameplay && (
        <>
          <button
            onClick={() => setShowDebugMenu(prev => !prev)}
            className="fixed top-4 right-4 z-50 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg"
            aria-label="Открыть отладочное меню"
          >
            <CogIcon className="w-6 h-6" />
          </button>
          {showDebugMenu && (
            // onGrantXpForLevelUp prop removed from DebugMenu
            <DebugMenu onClose={() => setShowDebugMenu(false)}/>
          )}
        </>
      )}

      {gamePhase === GamePhase.CharacterCreation && (
        <CharacterCreator onCharacterCreated={handleCharacterCreated} apiKeyAvailable={!!apiKeyAvailable} />
      )}
      {gamePhase === GamePhase.Gameplay && character && (
        <ChatInterface 
            character={character} 
            apiKeyAvailable={!!apiKeyAvailable} 
            // debugLevelUpTrigger prop removed
        />
      )}
    </div>
  );
};

export default App;
