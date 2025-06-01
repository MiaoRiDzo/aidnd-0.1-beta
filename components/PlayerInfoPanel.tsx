
import React from 'react';
import { Character, Skill, Stats, StatName } from '../types'; 
import { STAT_NAMES_ORDERED, STAT_NAME_TRANSLATIONS, BASE_STAT_VALUE } from '../constants';
import { InfoIcon, PlayerCharacterIcon } from './icons';

interface PlayerInfoPanelProps {
  characterBasicInfo: Omit<Character, 'statuses' | 'hp' | 'maxHp' | 'stats' | 'skills' | 'isNsfwEnabled'>;
  currentStatuses: string[];
  hp: number;
  maxHp: number;
  stats: Stats;
  skills: Skill[];
  isNsfwEnabled: boolean;
}

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ 
    characterBasicInfo, currentStatuses, hp, maxHp, stats, skills, isNsfwEnabled
}) => {
  const defaultErrorSkillNames = ["Навыки не сгенерированы", "Ошибка генерации", "Нет сгенерированных навыков"];
  const skillsExist = skills && skills.length > 0 &&
                      !(skills.length === 1 && defaultErrorSkillNames.includes(skills[0].name));

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg flex-1 min-h-0 flex flex-col">
      <div className="flex items-center mb-4 flex-shrink-0">
        <InfoIcon className="w-6 h-6 text-purple-400 mr-3 flex-shrink-0" />
        <h2 className="text-xl font-bold text-purple-400">Ваш Герой</h2>
      </div>
      
      <div className="flex items-center mb-2 pb-2 border-b border-slate-700 flex-shrink-0">
        <PlayerCharacterIcon className="w-16 h-16 text-purple-300 mr-4 rounded-full bg-slate-700 p-2 flex-shrink-0" />
        <div>
            <p className="text-2xl font-semibold text-slate-100">{characterBasicInfo.name}</p>
            <p className="text-md text-purple-300">{characterBasicInfo.race.name} {characterBasicInfo.class.name}</p>
            {isNsfwEnabled && <p className="text-xs text-red-400 font-semibold">(Режим 18+ Активен)</p>}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
        <div className="mb-3 bg-slate-700 px-2 py-1 rounded">
            <span className="text-slate-300 text-sm">Здоровье: </span>
            <span className="font-bold text-white text-sm">{hp} / {maxHp}</span>
        </div>

        <div className="mb-3">
          <h3 className="text-md font-semibold text-purple-300 mb-1">Характеристики:</h3>
          <ul className="space-y-1 text-sm">
            {STAT_NAMES_ORDERED.map(statName => (
              <li key={statName} className="flex justify-between items-center bg-slate-700 px-2 py-1 rounded">
                <span className="text-slate-300">{STAT_NAME_TRANSLATIONS[statName]}:</span>
                <span className="font-bold text-white">{stats[statName] ?? BASE_STAT_VALUE}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {skillsExist && (
          <div className="mb-3">
            <h3 className="text-md font-semibold text-purple-300 mb-1">Навыки:</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 bg-slate-700 p-2 rounded max-h-32 overflow-y-auto custom-scrollbar">
              {skills.map((skill: Skill, index: number) => (
                <li key={index} title={skill.description} className="cursor-help">
                  <strong >{skill.name}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-1">
          <h3 className="text-md font-semibold text-purple-300 mb-1">Статусы:</h3>
          {currentStatuses && currentStatuses.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 bg-slate-700 p-2 rounded max-h-20 overflow-y-auto custom-scrollbar">
                  {currentStatuses.map((status, index) => (
                  <li key={index}>{status}</li>
                  ))}
              </ul>
          ) : (
              <p className="text-sm text-slate-400 italic bg-slate-700 p-2 rounded">Нет активных статусов.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerInfoPanel;
