
export enum StatName {
  Strength = "Strength",
  Dexterity = "Dexterity",
  Constitution = "Constitution",
  Intelligence = "Intelligence",
  Wisdom = "Wisdom",
  Charisma = "Charisma"
}

export type Stats = {
  [key in StatName]?: number;
};

export interface Race {
  id: string;
  name: string;
  description: string;
  baseStatModifiers: Stats;
  icon?: React.ReactNode;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  baseStatModifiers: Stats;
  icon?: React.ReactNode;
  abilities: string[];
}

export interface Skill {
  name: string;
  description: string;
}

export interface Character {
  name: string;
  race: Race;
  class: Class;
  backstory: string;
  stats: Stats;
  worldElements: string[];
  skills: Skill[]; 
  statuses: string[];
  hp: number;
  maxHp: number;
  isNsfwEnabled: boolean; // Добавлено поле для NSFW режима
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

export enum GamePhase {
  CharacterCreation = "characterCreation",
  Gameplay = "gameplay",
  Error = "error"
}

export interface AiStatSuggestion {
  stat_modifiers: Stats;
  world_elements: string[];
  skills: Skill[]; 
}

export interface FocusTargetInfo {
  name: string;
  hp?: number; 
  maxHp?: number;
  type: string; 
  role?: string; 
  status?: string; 
  description?: string; 
}

// --- Типы для системы бросков кубиков ---

/**
 * Запрос от ИИ на совершение броска кубика.
 */
export interface DiceRollRequest {
  id: string; // Уникальный идентификатор для этого запроса на бросок
  statsToRoll: StatName[]; // Массив характеристик, по которым нужно сделать бросок
  description: string; // Описание действия, для которого совершается бросок
}

/**
 * Результат броска по одной характеристике.
 */
export interface SingleStatRollResult {
  statName: StatName;
  diceValue: number; // Значение, выпавшее на кубике (1-20)
  modifier: number; // Модификатор от характеристики
  totalValue: number; // Итоговое значение (diceValue + modifier)
}

/**
 * Полный отчет о результатах всех бросков по одному запросу.
 */
export interface DiceRollReport {
  rollId: string; // ID оригинального запроса DiceRollRequest
  rollDescription: string; // Описание из оригинального запроса
  results: SingleStatRollResult[]; // Массив результатов по каждой характеристике
}
