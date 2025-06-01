
import React, { useState, useEffect, useCallback } from 'react';
import { Character, Race, Class, Stats, StatName, AiStatSuggestion, Skill } from '../types';
import { 
    AVAILABLE_RACES, AVAILABLE_CLASSES, BASE_STAT_VALUE, STAT_NAMES_ORDERED, 
    STAT_NAME_TRANSLATIONS, MANUAL_POINTS_POOL, MIN_STAT_VALUE
} from '../constants';
import { analyzeBackstoryWithGemini } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, PlayerCharacterIcon } from './icons';

interface CharacterCreatorProps {
  onCharacterCreated: (character: Character) => void;
  apiKeyAvailable: boolean;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCharacterCreated, apiKeyAvailable }) => {
  const [step, setStep] = useState(1);
  const [characterName, setCharacterName] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [backstory, setBackstory] = useState('');
  const [isNsfwEnabled, setIsNsfwEnabled] = useState(false); 
  
  const [currentStats, setCurrentStats] = useState<Stats>(
    STAT_NAMES_ORDERED.reduce((acc, stat) => ({ ...acc, [stat]: BASE_STAT_VALUE }), {})
  );
  const [statsAfterAi, setStatsAfterAi] = useState<Stats | null>(null); 

  const [aiSuggestions, setAiSuggestions] = useState<AiStatSuggestion | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalPointsDelta, setTotalPointsDelta] = useState(0); 
  const [statsInitializedForManualStep, setStatsInitializedForManualStep] = useState(false);
  const [isGodModeEnabled, setIsGodModeEnabled] = useState(false); // Added for God Mode


  const calculateCurrentStats = useCallback(() => {
    let baseCalcStats: Stats = STAT_NAMES_ORDERED.reduce((acc, statName) => {
        acc[statName] = BASE_STAT_VALUE;
        return acc;
    }, {} as Stats);

    const race = AVAILABLE_RACES.find(r => r.id === selectedRaceId);
    const charClass = AVAILABLE_CLASSES.find(c => c.id === selectedClassId);

    if (race) {
        for (const stat in race.baseStatModifiers) {
            baseCalcStats[stat as StatName] = (baseCalcStats[stat as StatName] || BASE_STAT_VALUE) + (race.baseStatModifiers[stat as StatName] || 0);
        }
    }

    if (charClass) {
        for (const stat in charClass.baseStatModifiers) {
            baseCalcStats[stat as StatName] = (baseCalcStats[stat as StatName] || BASE_STAT_VALUE) + (charClass.baseStatModifiers[stat as StatName] || 0);
        }
    }
    
    if (aiSuggestions?.stat_modifiers) {
        const combinedWithAi = {...baseCalcStats};
        for (const statKey in aiSuggestions.stat_modifiers) {
            const statName = statKey as StatName;
            if (combinedWithAi[statName] !== undefined) {
                 combinedWithAi[statName] = (combinedWithAi[statName] || BASE_STAT_VALUE) + (aiSuggestions.stat_modifiers[statName] || 0);
            }
        }
        setStatsAfterAi(combinedWithAi); 

        if (step < 6) { 
            setCurrentStats(combinedWithAi);
        } else if (step === 6 && !statsInitializedForManualStep) { 
            setCurrentStats(combinedWithAi); 
            setTotalPointsDelta(0); 
            setStatsInitializedForManualStep(true);
        }
    } else { 
        setStatsAfterAi(baseCalcStats); 
        if (step < 6) {
             setCurrentStats(baseCalcStats);
        }  else if (step === 6 && !statsInitializedForManualStep) {
            setCurrentStats(baseCalcStats);
            setTotalPointsDelta(0);
            setStatsInitializedForManualStep(true);
        }
    }
  }, [selectedRaceId, selectedClassId, aiSuggestions, step, statsInitializedForManualStep]);


  useEffect(() => {
    calculateCurrentStats();
  }, [calculateCurrentStats]);

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && !characterName.trim()) {
      setError("Пожалуйста, введите имя вашего персонажа."); return;
    }
    if (step === 2 && !selectedRaceId) {
      setError("Пожалуйста, выберите расу для вашего персонажа."); return;
    }
    if (step === 3 && !selectedClassId) {
      setError("Пожалуйста, выберите класс для вашего персонажа."); return;
    }
    if (step === 4 && !backstory.trim()) {
      setError("Пожалуйста, напишите предысторию. Даже короткая подойдет!"); return;
    }
    if (step === 5 && !aiSuggestions && apiKeyAvailable && !isLoadingAi) {
        setError("Пожалуйста, сначала проанализируйте предысторию с ИИ или пропустите, если анализ недоступен/не удался."); return;
    }
    if (step === 6 && !isGodModeEnabled) { // God Mode check for validation
        if (totalPointsDelta > MANUAL_POINTS_POOL) {
            setError(`Вы превысили лимит очков на увеличение (${totalPointsDelta} > ${MANUAL_POINTS_POOL}).`); return;
        }
        if (totalPointsDelta < -MANUAL_POINTS_POOL) {
             setError(`Вы превысили лимит очков на уменьшение (${totalPointsDelta} < -${MANUAL_POINTS_POOL}).`); return;
        }
    }
    setStatsInitializedForManualStep(false); 
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStatsInitializedForManualStep(false); 
    setStep(prev => prev - 1);
  }

  const handleAnalyzeBackstory = async () => {
    if (!backstory.trim() || !selectedRaceId || !selectedClassId) {
      setError("Пожалуйста, укажите имя, расу, класс и предысторию перед анализом ИИ.");
      return;
    }
    if (!apiKeyAvailable) {
        setError("API-ключ недоступен. Функции ИИ отключены.");
        setAiSuggestions({ 
            stat_modifiers: STAT_NAMES_ORDERED.reduce((acc, stat) => ({...acc, [stat]: 0}), {}), 
            world_elements: ["Функции ИИ отключены из-за отсутствия API-ключа."],
            skills: [{ name: "Навыки не сгенерированы", description: "ИИ отключен." }]
        });
        return;
    }

    setIsLoadingAi(true);
    setError(null);
    const race = AVAILABLE_RACES.find(r => r.id === selectedRaceId)!;
    const charClass = AVAILABLE_CLASSES.find(c => c.id === selectedClassId)!;
    try {
      const suggestions = await analyzeBackstoryWithGemini(race.name, charClass.name, backstory);
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error(e);
      setError("Не удалось получить предложения от ИИ. Пожалуйста, попробуйте еще раз или продолжите без них.");
      setAiSuggestions({ 
          stat_modifiers: STAT_NAMES_ORDERED.reduce((acc, stat) => ({...acc, [stat]: 0}), {}), 
          world_elements: ["Анализ ИИ не удался."],
          skills: [{ name: "Навыки не сгенерированы", description: "Ошибка ИИ." }]
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleManualStatChange = (statName: StatName, operation: 'increment' | 'decrement') => {
    if (!statsAfterAi) return;

    const currentValue = currentStats[statName] || BASE_STAT_VALUE;
    let newValue = currentValue;

    if (operation === 'increment') {
        newValue = currentValue + 1;
    } else { 
        newValue = currentValue - 1;
    }

    if (newValue < MIN_STAT_VALUE) {
        setError(`Характеристика не может быть ниже ${MIN_STAT_VALUE}.`);
        return;
    }

    let prospectiveDelta = 0;
    STAT_NAMES_ORDERED.forEach(sName => {
        const baseVal = statsAfterAi[sName] || BASE_STAT_VALUE;
        const currentValInLoop = (sName === statName) ? newValue : (currentStats[sName] || BASE_STAT_VALUE);
        prospectiveDelta += (currentValInLoop - baseVal);
    });

    if (!isGodModeEnabled) { // God Mode check for applying limits
        if (prospectiveDelta > MANUAL_POINTS_POOL) {
            setError(`Вы не можете увеличить сумму характеристик более чем на ${MANUAL_POINTS_POOL} очков от предложенных ИИ. Текущее изменение: ${prospectiveDelta}`);
            return;
        }
        if (prospectiveDelta < -MANUAL_POINTS_POOL) {
             setError(`Вы не можете уменьшить сумму характеристик более чем на ${MANUAL_POINTS_POOL} очков от предложенных ИИ. Текущее изменение: ${prospectiveDelta}`);
            return;
        }
    }
    
    setError(null);
    setCurrentStats(prev => ({ ...prev, [statName]: newValue }));
    setTotalPointsDelta(prospectiveDelta); // Always update delta for display
};


  const handleFinalizeCharacter = () => {
    if (!characterName || !selectedRaceId || !selectedClassId || !backstory || !currentStats ) {
        setError("Убедитесь, что все поля заполнены и все шаги пройдены.");
        return;
    }
    const race = AVAILABLE_RACES.find(r => r.id === selectedRaceId)!;
    const charClass = AVAILABLE_CLASSES.find(c => c.id === selectedClassId)!;
    
    const constitution = currentStats[StatName.Constitution] || BASE_STAT_VALUE;
    const conMod = Math.floor((constitution - 10) / 2);
    const calculatedMaxHp = Math.max(10, 20 + conMod * 2); 

    const finalCharacter: Character = {
      name: characterName,
      race,
      class: charClass,
      backstory,
      stats: currentStats, 
      worldElements: aiSuggestions?.world_elements || ["Нет особых элементов мира из предыстории."],
      skills: aiSuggestions?.skills || [{ name: "Нет сгенерированных навыков", description: "Предыстория не анализировалась или ИИ не предложил навыки." }],
      statuses: [], 
      hp: calculatedMaxHp,
      maxHp: calculatedMaxHp,
      isNsfwEnabled: isNsfwEnabled, 
    };
    onCharacterCreated(finalCharacter);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: 
        return ( 
          <div>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Как зовут вашего персонажа?</h2>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="например, Элара Светлая Поляна"
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none mb-6"
            />
            <div className="mt-4 p-4 border border-slate-600 rounded-lg bg-slate-700/50">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNsfwEnabled}
                  onChange={(e) => setIsNsfwEnabled(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-purple-500 bg-slate-600 border-slate-500 rounded focus:ring-purple-500 focus:ring-offset-slate-800"
                />
                <span className="ml-3 text-slate-200 font-medium">Включить режим 18+ (NSFW)</span>
              </label>
              <p className="text-xs text-slate-400 mt-2">
                Внимание: Включение этого режима разрешает откровенный контент, включая насилие, сексуальные сцены и нецензурную лексику. Только для совершеннолетних.
              </p>
            </div>
          </div>
        );
      case 2: 
        return ( 
          <div>
            <h2 className="text-2xl font-bold mb-6 text-purple-300">Выберите вашу расу</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AVAILABLE_RACES.map(race => (
                <button
                  key={race.id}
                  onClick={() => setSelectedRaceId(race.id)}
                  className={`p-4 bg-slate-800 rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 border-2 ${selectedRaceId === race.id ? 'border-purple-500 ring-2 ring-purple-500' : 'border-slate-700'}`}
                >
                  {race.icon}
                  <h3 className="text-lg font-semibold mt-2 text-slate-100">{race.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 h-16 overflow-y-auto custom-scrollbar">{race.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 3: 
        return ( 
          <div>
            <h2 className="text-2xl font-bold mb-6 text-purple-300">Выберите ваш класс</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AVAILABLE_CLASSES.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`p-4 bg-slate-800 rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 border-2 ${selectedClassId === cls.id ? 'border-purple-500 ring-2 ring-purple-500' : 'border-slate-700'}`}
                >
                  {cls.icon}
                  <h3 className="text-lg font-semibold mt-2 text-slate-100">{cls.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 h-16 overflow-y-auto custom-scrollbar">{cls.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 4: 
        return ( 
          <div>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Создайте свою предысторию</h2>
            <p className="text-sm text-slate-400 mb-4">Ваша история формирует вас. Напишите несколько предложений или больше о прошлом вашего персонажа. Это повлияет на ваши начальные характеристики, навыки и элементы мира с помощью ИИ!</p>
            <textarea
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              placeholder="Родившись в тихой деревне, я всегда мечтал(а) о приключениях..."
              rows={8}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none custom-scrollbar"
            />
          </div>
        );
      case 5: 
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Улучшение предыстории с помощью ИИ</h2>
            {!aiSuggestions && !isLoadingAi && (
                 <button
                    onClick={handleAnalyzeBackstory}
                    disabled={isLoadingAi || !apiKeyAvailable}
                    className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {apiKeyAvailable ? "Анализировать предысторию с ИИ" : "Анализ ИИ отключен (Нет API-ключа)"}
                </button>
            )}
            {isLoadingAi && <div className="flex justify-center items-center py-8"><LoadingSpinner size="w-12 h-12" /> <p className="ml-3 text-lg">ИИ обдумывает вашу судьбу...</p></div>}
            {aiSuggestions && !isLoadingAi && (
              <div className="mt-6 p-4 bg-slate-800 rounded-lg">
                <h3 className="text-xl font-semibold text-purple-400 mb-3">Предложения ИИ:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-medium text-slate-300 mb-1">Изменения характеристик:</h4>
                         <ul className="list-disc list-inside text-sm text-slate-400">
                            {STAT_NAMES_ORDERED.map(statName => {
                                const modifier = aiSuggestions.stat_modifiers[statName];
                                if (modifier && modifier !== 0) {
                                return <li key={statName}>{STAT_NAME_TRANSLATIONS[statName]}: {modifier > 0 ? `+${modifier}` : modifier}</li>;
                                }
                                return null;
                            })}
                             {(Object.values(aiSuggestions.stat_modifiers).every(val => val === 0)) && <li>Нет изменений характеристик от ИИ.</li>}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-300 mb-1">Предложенные навыки:</h4>
                        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                            {aiSuggestions.skills && aiSuggestions.skills.length > 0 && !(aiSuggestions.skills[0].name === "Навыки не сгенерированы" || aiSuggestions.skills[0].name === "Ошибка генерации") ? 
                                aiSuggestions.skills.map((skill: Skill, index: number) => (
                                  <li key={index} title={skill.description}>
                                    <strong className="cursor-help">{skill.name}</strong>
                                  </li>
                                )) :
                                <li>Нет предложенных навыков.</li>
                            }
                        </ul>
                    </div>
                </div>
                <div className="mt-3">
                  <h4 className="font-medium text-slate-300 mb-1">Уникальные элементы мира:</h4>
                  <ul className="list-disc list-inside text-sm text-slate-400">
                    {aiSuggestions.world_elements.map((el, index) => <li key={index}>{el}</li>)}
                  </ul>
                </div>
                <p className="text-xs text-slate-500 mt-4">Эти предложения были применены к вашим базовым характеристикам. На следующем шаге вы сможете их скорректировать.</p>
              </div>
            )}
          </div>
        );
      case 6: 
        if (!statsAfterAi || !currentStats) { 
            return <div className="text-center py-8">Загрузка данных для корректировки... Пожалуйста, убедитесь, что предыдущие шаги выполнены.</div>;
        }
        const pointsAvailableToAdd = MANUAL_POINTS_POOL - totalPointsDelta;
        const pointsAvailableToReduce = MANUAL_POINTS_POOL + totalPointsDelta;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-2 text-purple-300">Ручная корректировка характеристик</h2>
                
                <div className="my-4 p-3 bg-slate-700/80 rounded-lg border border-slate-600">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGodModeEnabled}
                      onChange={(e) => setIsGodModeEnabled(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-yellow-400 bg-slate-600 border-slate-500 rounded focus:ring-yellow-400 focus:ring-offset-slate-800"
                      aria-describedby="godModeDescription"
                    />
                    <span className="ml-3 text-yellow-300 font-medium">Режим Бога (безлимитные очки)</span>
                  </label>
                  {isGodModeEnabled && <p id="godModeDescription" className="text-xs text-yellow-500 mt-1">Осторожно! Лимиты на распределение очков отключены.</p>}
                </div>

                <p className="text-sm text-slate-400 mb-1">
                    Текущий баланс изменений от предложений ИИ: <strong className={totalPointsDelta > 0 ? 'text-green-400' : totalPointsDelta < 0 ? 'text-red-400' : 'text-slate-300'}>{totalPointsDelta >= 0 ? '+' : ''}{totalPointsDelta}</strong>
                </p>
                {!isGodModeEnabled ? (
                    <>
                        <p className="text-sm text-slate-400 mb-1">
                            Общий бюджет на изменение характеристик: <strong className="text-purple-300">±{MANUAL_POINTS_POOL}</strong> очков.
                        </p>
                        <p className="text-sm text-slate-400 mb-4">
                            (Можно еще <strong className="text-green-400">добавить {Math.max(0, pointsAvailableToAdd)}</strong> / <strong className="text-red-400">уменьшить на {Math.max(0, pointsAvailableToReduce)}</strong> очков)
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-yellow-400 mb-4 font-semibold">
                        РЕЖИМ БОГА: Лимиты на очки характеристик отключены. Минимальное значение: {MIN_STAT_VALUE}.
                    </p>
                )}


                <div className="space-y-3">
                    {STAT_NAMES_ORDERED.map(statName => (
                        <div key={statName} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                            <label htmlFor={statName} className="text-md font-medium text-slate-200 w-1/3">{STAT_NAME_TRANSLATIONS[statName]}</label>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => handleManualStatChange(statName, 'decrement')}
                                    className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-md text-white text-lg font-semibold disabled:opacity-50 transition-colors"
                                    disabled={(currentStats[statName] || BASE_STAT_VALUE) <= MIN_STAT_VALUE || (!isGodModeEnabled && totalPointsDelta <= -MANUAL_POINTS_POOL)}
                                    aria-label={`Уменьшить ${STAT_NAME_TRANSLATIONS[statName]}`}
                                >-</button>
                                <span className="w-12 p-1 text-center text-xl font-bold text-white tabular-nums">
                                  {currentStats[statName] || BASE_STAT_VALUE}
                                </span>
                                 <button 
                                    onClick={() => handleManualStatChange(statName, 'increment')}
                                    className="w-8 h-8 flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-md text-white text-lg font-semibold disabled:opacity-50 transition-colors"
                                    disabled={!isGodModeEnabled && totalPointsDelta >= MANUAL_POINTS_POOL}
                                    aria-label={`Увеличить ${STAT_NAME_TRANSLATIONS[statName]}`}
                                >+</button>
                            </div>
                             <div className="w-20 text-right">
                                <span className="text-xs text-slate-500">База ИИ: {statsAfterAi[statName] || BASE_STAT_VALUE}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
        case 7: 
        const race = AVAILABLE_RACES.find(r => r.id === selectedRaceId);
        const charClass = AVAILABLE_CLASSES.find(c => c.id === selectedClassId);
        const defaultErrorSkillNames = ["Навыки не сгенерированы", "Ошибка генерации", "Нет сгенерированных навыков"];
        const displaySkills = aiSuggestions?.skills && aiSuggestions.skills.length > 0 && 
                              !(aiSuggestions.skills.length === 1 && defaultErrorSkillNames.includes(aiSuggestions.skills[0].name));

        return (
            <div>
                <h2 className="text-3xl font-bold mb-6 text-center text-purple-300">Ваш персонаж готов!</h2>
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-purple-500 flex items-center justify-center bg-slate-700 shrink-0">
                           <PlayerCharacterIcon className="w-24 h-24 sm:w-28 sm:h-28 text-purple-300" />
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="text-3xl sm:text-4xl font-bold text-white">{characterName}</h3>
                            <p className="text-lg sm:text-xl text-purple-400">{race?.name} {charClass?.name}</p>
                            {isNsfwEnabled && <p className="text-sm text-red-400 mt-1">(Режим 18+ Активен)</p>}
                        </div>
                    </div>

                    <div className="mb-4">
                        <h4 className="text-lg font-semibold text-purple-400 mb-2">Итоговые характеристики:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                            {STAT_NAMES_ORDERED.map(statName => (
                                <div key={statName} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                                    <span className="text-sm font-medium text-slate-300">{STAT_NAME_TRANSLATIONS[statName]}:</span>
                                    <span className="text-lg font-bold text-white">{currentStats[statName] ?? BASE_STAT_VALUE}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {displaySkills && aiSuggestions?.skills && (
                        <div className="mb-4">
                            <h4 className="text-lg font-semibold text-purple-400 mb-2">Навыки:</h4>
                             <ul className="list-disc list-inside text-sm text-slate-300 bg-slate-700 p-3 rounded space-y-1">
                                {aiSuggestions.skills.map((skill: Skill, index: number) => (
                                  <li key={index} title={skill.description}>
                                    <strong className="cursor-help">{skill.name}</strong>
                                  </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="mb-4">
                        <h4 className="text-lg font-semibold text-purple-400 mb-2">Краткая предыстория:</h4>
                        <p className="text-sm text-slate-300 bg-slate-700 p-3 rounded max-h-28 overflow-y-auto custom-scrollbar">{backstory}</p>
                    </div>

                    {aiSuggestions?.world_elements && aiSuggestions.world_elements.length > 0 && 
                     !["Нет особых элементов мира из предыстории.", "Анализ ИИ не удался.", "ИИ не смог интерпретировать предысторию, поэтому мир пока остается загадкой.", "Функции ИИ отключены из-за отсутствия API-ключа."].includes(aiSuggestions.world_elements[0]) &&
                     (
                        <div>
                            <h4 className="text-lg font-semibold text-purple-400 mb-2">Элементы мира из предыстории:</h4>
                            <ul className="list-disc list-inside text-sm text-slate-300 bg-slate-700 p-3 rounded">
                                {aiSuggestions.world_elements.map((el, index) => <li key={index}>{el}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
      default:
        return <div>Неизвестный шаг</div>;
    }
  };

  const progressPercentage = ((step -1) / 6) * 100; 

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-slate-100">
      <div className="w-full max-w-2xl bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-10">
        <h1 className="text-4xl font-bold text-center mb-2 text-purple-400">Создайте своего героя</h1>
        <p className="text-center text-slate-400 mb-8">Следуйте шагам, чтобы воплотить вашего персонажа в жизнь.</p>
        
        <div className="w-full bg-slate-700 rounded-full h-2.5 mb-8">
            <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500 text-white rounded-lg text-sm">{error}</div>}
        
        <div className="min-h-[350px] mb-8"> 
            {renderStepContent()}
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrevStep}
            disabled={step === 1}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2"/> Назад
          </button>
          {step < 7 ? ( 
             <button
                onClick={handleNextStep}
                disabled={(step === 5 && !aiSuggestions && apiKeyAvailable && !isLoadingAi) || (step === 5 && isLoadingAi)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
             >
                {step === 6 ? 'Обзор персонажа' : step === 5 ? 'К ручной настройке' : 'Далее'} <ChevronRightIcon className="w-5 h-5 ml-2"/>
            </button>
          ) : (
            <button
              onClick={handleFinalizeCharacter}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center"
            >
              Начать приключение! <SparklesIcon className="w-5 h-5 ml-2"/>
            </button>
          )}
        </div>
      </div>
       <footer className="text-center text-xs text-slate-500 mt-8">
            Создано с помощью Gemini AI и вашего воображения
        </footer>
    </div>
  );
};

export default CharacterCreator;
