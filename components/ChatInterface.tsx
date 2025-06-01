
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Character, ChatMessage, FocusTargetInfo, DiceRollRequest, DiceRollReport, StatName, Skill, Stats } from '../types';
import { startChatSession } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { SendIcon, PlayerCharacterIcon } from './icons';
import { Chat, Content } from '@google/genai';
import PlayerInfoPanel from './PlayerInfoPanel';
import FocusInfoPanel from './FocusInfoPanel';
import WorldLogPanel from './WorldLogPanel';
import DiceRoller from './DiceRoller';
import { STAT_NAME_TRANSLATIONS } from '../constants';


const AiAvatar: React.FC = () => (
    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
        ИИ
    </div>
);

const UserPlayerAvatar: React.FC = () => {
    return <PlayerCharacterIcon className="w-10 h-10 rounded-full bg-slate-600 p-1 text-purple-300 shadow-md flex-shrink-0" />;
};

const FOCUS_PANEL_UPDATE_REGEX = /FOCUS_PANEL_UPDATE::({.*?}|null)/s;
const PLAYER_STATUS_UPDATE_REGEX = /PLAYER_STATUS_UPDATE::({.*?})/s;
const DICE_ROLL_REQUEST_REGEX = /DICE_ROLL_REQUEST::({.*?})/s;
const PLAYER_HP_UPDATE_REGEX = /PLAYER_HP_UPDATE::({.*?})/s;
const AWARD_XP_REGEX = /AWARD_XP::({.*?})/s; // Kept for stripping, but not processed for leveling
const LEVEL_UP_INITIATE_REGEX = /LEVEL_UP_INITIATE::({.*?})/s; // Kept for stripping

interface ProcessedAiCommandsResult {
  cleanedText: string;
  // xpAwardInfo and readyForLevelUpInfo are removed as leveling is gone
}

type AddMessagePayload = {
  sender: ChatMessage['sender'];
  text: string;
  id?: string;
  timestamp?: Date;
};

const cleanPotentialUndefined = (text: string): string => {
  // Remove "undefined" string if it appears at the very end of the AI response
  const undefinedSuffix = "undefined";
  if (text.endsWith(undefinedSuffix)) {
    return text.substring(0, text.length - undefinedSuffix.length).trim();
  }
  return text.trim(); // Also trim whitespace generally
};


interface ChatInterfaceProps {
    character: Character;
    apiKeyAvailable: boolean;
    // debugLevelUpTrigger prop removed
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ character, apiKeyAvailable }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusTargetInfo, setFocusTargetInfo] = useState<FocusTargetInfo | null>(null);

  const [currentPlayerStatuses, setCurrentPlayerStatuses] = useState<string[]>(character.statuses || []);
  const [currentHp, setCurrentHp] = useState<number>(character.hp);
  const [currentMaxHp, setCurrentMaxHp] = useState<number>(character.maxHp);
  // currentLevel, currentXp, currentXpToNextLevel removed
  const [currentStats, setCurrentStats] = useState<Stats>({...character.stats});
  const [currentSkills, setCurrentSkills] = useState<Skill[]>([...character.skills]);

  // isLevelUpModalOpen, levelUpData, isRequestingLevelUpData removed

  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeDiceRollRequest, setActiveDiceRollRequest] = useState<DiceRollRequest | null>(null);
  const [isDiceInterfaceActive, setIsDiceInterfaceActive] = useState(false);

  const characterForPlayerPanel = useMemo(() => {
    const {
        statuses, hp, maxHp, stats, skills, isNsfwEnabled,
        // level, xp, xpToNextLevel removed from destructuring
        ...restOfCharacter
    } = character;
    return restOfCharacter;
  }, [character]);

  useEffect(() => {
    setCurrentPlayerStatuses(character.statuses || []);
    setCurrentHp(character.hp);
    setCurrentMaxHp(character.maxHp);
    // setCurrentLevel, setCurrentXp, setCurrentXpToNextLevel removed
    setCurrentStats({...character.stats});
    setCurrentSkills([...character.skills]);
  }, [character]);


 const addMessageToHistory = useCallback((message: AddMessagePayload) => {
    setChatHistory(prev => [...prev, {
        id: message.id || Date.now().toString() + Math.random(),
        sender: message.sender,
        text: message.text,
        timestamp: message.timestamp || new Date()
    }]);
  }, []);

  const _getDisplayableTextFromPartialAiResponse = useCallback((aiText: string): string => {
    let displayableText = cleanPotentialUndefined(aiText);
    displayableText = displayableText.replace(FOCUS_PANEL_UPDATE_REGEX, '');
    displayableText = displayableText.replace(PLAYER_STATUS_UPDATE_REGEX, '');
    displayableText = displayableText.replace(DICE_ROLL_REQUEST_REGEX, '');
    displayableText = displayableText.replace(PLAYER_HP_UPDATE_REGEX, '');
    displayableText = displayableText.replace(AWARD_XP_REGEX, '');
    displayableText = displayableText.replace(LEVEL_UP_INITIATE_REGEX, '');
    return displayableText.trim();
  }, []);


  const _updateStateAndParseCommands = useCallback((aiText: string): ProcessedAiCommandsResult => {
    let processedText = cleanPotentialUndefined(aiText);
    // xpAwardInfo and readyForLevelUpInfo related logic removed

    const playerHpMatch = processedText.match(PLAYER_HP_UPDATE_REGEX);
    if (playerHpMatch && playerHpMatch[1]) {
        try {
            const hpUpdate = JSON.parse(playerHpMatch[1]) as { hp: number, maxHp: number };
            if (typeof hpUpdate.hp === 'number') setCurrentHp(hpUpdate.hp);
            if (typeof hpUpdate.maxHp === 'number') setCurrentMaxHp(hpUpdate.maxHp);
        } catch (e) { console.error("Error parsing PlayerHpUpdate JSON:", e, playerHpMatch[1]); }
        processedText = processedText.replace(PLAYER_HP_UPDATE_REGEX, '').trim();
    }

    const playerStatusMatch = processedText.match(PLAYER_STATUS_UPDATE_REGEX);
    if (playerStatusMatch && playerStatusMatch[1]) {
        try {
            const statusUpdate = JSON.parse(playerStatusMatch[1]) as { statuses: string[] };
            if (statusUpdate && Array.isArray(statusUpdate.statuses)) {
                setCurrentPlayerStatuses(statusUpdate.statuses);
            }
        } catch (e) { console.error("Error parsing PlayerStatusUpdate JSON:", e, playerStatusMatch[1]); }
        processedText = processedText.replace(PLAYER_STATUS_UPDATE_REGEX, '').trim();
    }

    const diceRollMatch = processedText.match(DICE_ROLL_REQUEST_REGEX);
    if (diceRollMatch && diceRollMatch[1]) {
      try {
        const newDiceRollRequest = JSON.parse(diceRollMatch[1]) as DiceRollRequest;
        if (Array.isArray(newDiceRollRequest.statsToRoll) &&
            newDiceRollRequest.statsToRoll.length > 0 &&
            newDiceRollRequest.statsToRoll.every(stat => Object.values(StatName).includes(stat as StatName)) &&
            typeof newDiceRollRequest.description === 'string' &&
            typeof newDiceRollRequest.id === 'string') {
          setActiveDiceRollRequest(newDiceRollRequest);
          setIsDiceInterfaceActive(true);
        } else { console.error("Invalid DiceRollRequest structure:", newDiceRollRequest); }
      } catch (e) { console.error("Error parsing DiceRollRequest JSON:", e, diceRollMatch[1]); }
      processedText = processedText.replace(DICE_ROLL_REQUEST_REGEX, '').trim();
    }

    const focusMatch = processedText.match(FOCUS_PANEL_UPDATE_REGEX);
    if (focusMatch && focusMatch[1]) {
      try {
        if (focusMatch[1].toLowerCase() === 'null' || (JSON.parse(focusMatch[1]) && Object.keys(JSON.parse(focusMatch[1])).length === 0) ) {
            setFocusTargetInfo(null);
        } else {
            const newFocusInfo = JSON.parse(focusMatch[1]);
            if (newFocusInfo.hp !== undefined && typeof newFocusInfo.hp !== 'number') newFocusInfo.hp = parseInt(String(newFocusInfo.hp), 10) || undefined;
            if (newFocusInfo.maxHp !== undefined && typeof newFocusInfo.maxHp !== 'number') newFocusInfo.maxHp = parseInt(String(newFocusInfo.maxHp), 10) || undefined;
            setFocusTargetInfo(newFocusInfo as FocusTargetInfo);
        }
      } catch (e) { console.error("Error parsing focus panel JSON:", e, focusMatch[1]); }
      processedText = processedText.replace(FOCUS_PANEL_UPDATE_REGEX, '').trim();
    }

    // AWARD_XP and LEVEL_UP_INITIATE are only stripped, not processed for game logic
    const awardXpMatch = processedText.match(AWARD_XP_REGEX);
    if (awardXpMatch) {
        processedText = processedText.replace(AWARD_XP_REGEX, '').trim();
    }

    const levelUpInitiateMatch = processedText.match(LEVEL_UP_INITIATE_REGEX);
    if (levelUpInitiateMatch) {
        processedText = processedText.replace(LEVEL_UP_INITIATE_REGEX, '').trim();
    }

    return { cleanedText: processedText };
  }, [addMessageToHistory]); // Dependencies updated

  // sendExplicitLevelUpRequestToAI function removed

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Effect for debug level up trigger removed

  useEffect(() => {
    if (character && !chatSession && apiKeyAvailable) {
      try {
        const fullCharacterData = { // Ensure all current character data is passed
            ...character, 
            hp: currentHp, 
            maxHp: currentMaxHp, 
            stats: currentStats, 
            skills: currentSkills, 
            statuses: currentPlayerStatuses,
            isNsfwEnabled: character.isNsfwEnabled
            // level, xp, xpToNextLevel are no longer part of Character type
        };
        const newChat = startChatSession(fullCharacterData, chatHistory.filter(msg => msg.sender !== 'system'));
        setChatSession(newChat);

        if (chatHistory.filter(msg => msg.sender !== 'system').length === 0) {
            setIsAiTyping(true);
            setError(null);
            const fetchInitialScene = async (chat: Chat) => {
              try {
                const stream = await chat.sendMessageStream({ message: "DM, пожалуйста, опиши для меня начальную сцену. Это самое начало моего приключения. Если сцена включает важного NPC, требует броска кубика, изменяет мои статусы или HP, используй соответствующие команды FOCUS_PANEL_UPDATE::, DICE_ROLL_REQUEST::, PLAYER_STATUS_UPDATE::, PLAYER_HP_UPDATE::." });
                let completeAiResponseText = "";
                const aiMessageId = Date.now().toString() + '-ai-initial';
                addMessageToHistory({ id: aiMessageId, sender: 'ai', text: "...", timestamp: new Date()});

                for await (const chunk of stream) {
                  completeAiResponseText += chunk.text;
                  const cleanedChunkText = cleanPotentialUndefined(completeAiResponseText);
                  const displayableText = _getDisplayableTextFromPartialAiResponse(cleanedChunkText);
                  setChatHistory(prev => prev.map(msg =>
                    msg.id === aiMessageId ? {...msg, text: displayableText || "..." } : msg
                  ));
                }

                const finalCleanedAiText = cleanPotentialUndefined(completeAiResponseText);
                const processingResults = _updateStateAndParseCommands(finalCleanedAiText);
                const finalTextForDisplay = processingResults.cleanedText;

                if (finalTextForDisplay.trim()) {
                    setChatHistory(prev => prev.map(msg =>
                        msg.id === aiMessageId ? {...msg, text: finalTextForDisplay } : msg
                    ));
                } else {
                    setChatHistory(prev => prev.filter(msg => msg.id !== aiMessageId));
                }
                // XP and Level up related processing removed
              } catch (e: any) {
                console.error("Ошибка при получении начальной сцены:", e);
                const errorMessage = `Рассказчик ИИ, кажется, задумался... (Ошибка: ${e.message || 'Неизвестная ошибка Gemini'}) Пожалуйста, попробуйте обновить страницу.`;
                addMessageToHistory({ sender: 'system', text: errorMessage });
                setError(errorMessage);
              } finally {
                setIsAiTyping(false);
              }
            };
            fetchInitialScene(newChat);
        }

      } catch (e: any) {
        console.error("Не удалось инициализировать сеанс чата:", e);
        const initError = `Не удалось начать приключение с ИИ. (Ошибка: ${e.message || 'Ошибка настройки'}) Убедитесь, что ваш API-ключ правильный, и попробуйте снова.`;
        setError(initError);
        addMessageToHistory({ sender: 'system', text: initError });
        setIsAiTyping(false);
      }
    } else if (!apiKeyAvailable && !error ) {
        const noKeyError = "API-ключ недоступен. Приключение не может начаться.";
        setError(noKeyError);
        addMessageToHistory({sender: 'system', text: noKeyError});
    }
  }, [
      character, chatSession, apiKeyAvailable, addMessageToHistory, _updateStateAndParseCommands,
      _getDisplayableTextFromPartialAiResponse, error,
      currentHp, currentMaxHp, currentStats, currentSkills, currentPlayerStatuses // Dependencies updated
  ]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isAiTyping || !chatSession || isDiceInterfaceActive) return; // isRequestingLevelUpData removed

    const userMessageText = userInput;
    addMessageToHistory({ sender: 'user', text: userMessageText });
    setUserInput('');
    setIsAiTyping(true);
    setError(null);

    try {
      const stream = await chatSession.sendMessageStream({ message: userMessageText });
      let completeAiResponseText = "";
      const aiMessageId = Date.now().toString() + '-ai-stream';

      addMessageToHistory({ id: aiMessageId, sender: 'ai', text: "...", timestamp: new Date()});

      for await (const chunk of stream) {
        completeAiResponseText += chunk.text;
        const cleanedChunkText = cleanPotentialUndefined(completeAiResponseText);
        const displayableText = _getDisplayableTextFromPartialAiResponse(cleanedChunkText);
        setChatHistory(prev => prev.map(msg =>
            msg.id === aiMessageId ? {...msg, text: displayableText || "..."} : msg
        ));
      }

      const finalCleanedAiText = cleanPotentialUndefined(completeAiResponseText);
      const processingResults = _updateStateAndParseCommands(finalCleanedAiText);
      const finalTextForDisplay = processingResults.cleanedText;

      if (finalTextForDisplay.trim()) {
        setChatHistory(prev => prev.map(msg =>
            msg.id === aiMessageId ? {...msg, text: finalTextForDisplay} : msg
        ));
      } else {
        setChatHistory(prev => prev.filter(msg => msg.id !== aiMessageId));
      }
      // XP and Level up related processing removed
    } catch (e: any) {
      console.error("Ошибка при отправке сообщения в Gemini:", e);
      const commError = `Связь с рассказчиком ИИ прервалась... (Ошибка: ${e.message || 'Ошибка связи'}) Попробуйте отправить сообщение еще раз.`;
      addMessageToHistory({ sender: 'system', text: commError });
      setError(commError);
      setChatHistory(prev => prev.filter(msg => !(msg.sender === 'ai' && msg.text === "...")));
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleDiceRollComplete = async (report: DiceRollReport) => {
    setIsDiceInterfaceActive(false);
    setActiveDiceRollRequest(null);

    const resultsString = report.results.map(r =>
        `${STAT_NAME_TRANSLATIONS[r.statName]} - Итог ${r.totalValue} (бросок ${r.diceValue}, мод. ${r.modifier > 0 ? '+' : ''}${r.modifier})`
    ).join('; ');

    const rollMessageForAI = `[Результат броска для "${report.rollDescription}" (ID: ${report.rollId}): ${resultsString}]`;

    addMessageToHistory({ sender: 'system', text: `Вы совершили бросок для "${report.rollDescription}": ${resultsString}`});

    if (!chatSession) { // isRequestingLevelUpData removed
        setError("Сессия чата не активна, не удалось отправить результаты броска.");
        return;
    }
    setIsAiTyping(true);
    setError(null);

    try {
      const stream = await chatSession.sendMessageStream({ message: rollMessageForAI });
      let completeAiResponseText = "";
      const aiMessageId = Date.now().toString() + '-ai-response-after-roll';
      addMessageToHistory({ id: aiMessageId, sender: 'ai', text: "...", timestamp: new Date()});

      for await (const chunk of stream) {
        completeAiResponseText += chunk.text;
        const cleanedChunkText = cleanPotentialUndefined(completeAiResponseText);
        const displayableText = _getDisplayableTextFromPartialAiResponse(cleanedChunkText);
        setChatHistory(prev => prev.map(msg =>
            msg.id === aiMessageId ? {...msg, text: displayableText || "..." } : msg
        ));
      }
      const finalCleanedAiText = cleanPotentialUndefined(completeAiResponseText);
      const processingResults = _updateStateAndParseCommands(finalCleanedAiText);
      const finalTextForDisplay = processingResults.cleanedText;

      if (finalTextForDisplay.trim()) {
        setChatHistory(prev => prev.map(msg =>
            msg.id === aiMessageId ? {...msg, text: finalTextForDisplay} : msg
        ));
      } else {
        setChatHistory(prev => prev.filter(msg => msg.id !== aiMessageId));
      }
      // XP and Level up related processing removed
    } catch (e: any) {
        console.error("Ошибка при отправке результатов броска ИИ:", e);
        const commError = `Ошибка при отправке результатов броска ИИ: ${e.message || 'Ошибка связи'}`;
        addMessageToHistory({ sender: 'system', text: commError });
        setError(commError);
        setChatHistory(prev => prev.filter(msg => !(msg.sender === 'ai' && msg.text === "...")));
    } finally {
        setIsAiTyping(false);
    }
  };

  // handleLevelUpConfirmed function removed

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 p-4 gap-4">
      <div className="flex-shrink-0 w-64 hidden md:block">
        <WorldLogPanel character={character} />
      </div>

      <div className="flex flex-col flex-grow min-w-0">
        <header className="mb-4 p-4 bg-slate-800 rounded-lg shadow-lg flex items-center space-x-4">
            <PlayerCharacterIcon className="w-16 h-16 rounded-full border-2 border-purple-500 text-purple-300 flex-shrink-0" />
            <div>
                <h1 className="text-2xl font-bold text-purple-400">{character.name}</h1>
                <p className="text-sm text-slate-300">{character.race.name} {character.class.name}</p> 
                {/* Level display removed */}
                {character.isNsfwEnabled && <p className="text-xs text-red-400 font-semibold">(Режим 18+ Активен)</p>}
            </div>
        </header>

        {error && <div className="my-2 p-3 bg-red-700 text-white rounded-md text-sm">{error}</div>}

        {!apiKeyAvailable && !error && (
            <div className="my-2 p-3 bg-yellow-600 text-white rounded-md text-sm">
                Внимание: API-ключ не обнаружен. Взаимодействие с ИИ будет отключено.
            </div>
        )}

        <div className="flex-grow overflow-y-auto mb-4 p-4 bg-slate-800 rounded-lg shadow-inner space-y-4 custom-scrollbar">
            {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end max-w-xs md:max-w-md lg:max-w-lg ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.sender === 'ai' && <div className="mr-2 self-start"><AiAvatar /></div>}
                {msg.sender === 'user' && <div className="ml-2 self-start"><UserPlayerAvatar /></div>}
                <div
                    className={`px-4 py-3 rounded-xl shadow ${
                    msg.sender === 'user' ? 'bg-purple-600 text-white rounded-br-none' :
                    msg.sender === 'ai' ? 'bg-slate-700 text-slate-200 rounded-bl-none' :
                    'bg-yellow-600 text-black rounded-lg text-center w-full'
                    }`}
                >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-purple-200' : 'text-slate-400'} ${msg.sender === 'system' ? 'hidden' : ''} text-opacity-75`}>
                    {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                </div>
            </div>
            ))}
            {isAiTyping && !isDiceInterfaceActive && (
             <div className="flex justify-start" aria-live="polite" aria-atomic="true">
                <div className="flex items-end">
                    <div className="mr-2 self-start"><AiAvatar /></div>
                    <div className="px-4 py-3 rounded-xl shadow bg-slate-700 text-slate-200 rounded-bl-none flex items-center">
                        <LoadingSpinner size="w-5 h-5" color="text-purple-400" />
                        <span className="ml-2 text-sm italic text-slate-400">ИИ пишет...</span>
                    </div>
                </div>
            </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <div className="mb-2 p-1 h-64 flex items-center justify-center">
            {isDiceInterfaceActive && activeDiceRollRequest ? (
                <DiceRoller
                    request={activeDiceRollRequest}
                    characterStats={currentStats}
                    onRollComplete={handleDiceRollComplete}
                />
            ) : (
                 <div className="text-sm text-slate-500 italic h-full flex items-center justify-center">
                 </div>
            )}
        </div>

        <footer className="p-1 bg-slate-800 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isAiTyping && !isDiceInterfaceActive && handleSendMessage()} // isRequestingLevelUpData removed
                placeholder={!apiKeyAvailable ? "Чат отключен (Нет API-ключа)" : isDiceInterfaceActive ? "Совершите бросок..." : "Что вы делаете?" } // isRequestingLevelUpData placeholder removed
                disabled={isAiTyping || !apiKeyAvailable || isDiceInterfaceActive } // isLevelUpModalOpen, isRequestingLevelUpData removed
                className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100 disabled:opacity-50"
            />
            <button
                onClick={handleSendMessage}
                disabled={isAiTyping || !userInput.trim() || !apiKeyAvailable || isDiceInterfaceActive } // isLevelUpModalOpen, isRequestingLevelUpData removed
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Отправить сообщение"
            >
                <SendIcon className="w-6 h-6"/>
            </button>
            </div>
        </footer>
      </div>

      <div className="flex-shrink-0 w-72 hidden lg:flex flex-col gap-4">
            <PlayerInfoPanel
                characterBasicInfo={characterForPlayerPanel}
                currentStatuses={currentPlayerStatuses}
                hp={currentHp}
                maxHp={currentMaxHp}
                // level, xp, xpToNextLevel props removed
                stats={currentStats}
                skills={currentSkills}
                isNsfwEnabled={character.isNsfwEnabled}
            />
            <FocusInfoPanel focusTargetInfo={focusTargetInfo} />
      </div>
      {/* LevelUpModal rendering removed */}
    </div>
  );
};

export default ChatInterface;
