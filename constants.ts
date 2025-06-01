
import { Race, Class, StatName, Stats } from './types';
import { SwordsIcon, MagicWandIcon, BowIcon, PersonIcon, ElfIcon, DwarfIcon, OrcIcon } from './components/icons';

export const STAT_NAMES_ORDERED: StatName[] = [
  StatName.Strength,
  StatName.Dexterity,
  StatName.Constitution,
  StatName.Intelligence,
  StatName.Wisdom,
  StatName.Charisma
];

export const STAT_NAME_TRANSLATIONS: { [key in StatName]: string } = {
  [StatName.Strength]: "Сила",
  [StatName.Dexterity]: "Ловкость",
  [StatName.Constitution]: "Телосложение",
  [StatName.Intelligence]: "Интеллект",
  [StatName.Wisdom]: "Мудрость",
  [StatName.Charisma]: "Харизма"
};

export const BASE_STAT_VALUE = 10;
export const MANUAL_POINTS_POOL = 6; // Points user can add or subtract
export const MIN_STAT_VALUE = 3; // Minimum value a stat can be reduced to

export const AVAILABLE_RACES: Race[] = [
  {
    id: 'human',
    name: 'Человек',
    description: 'Адаптивные и амбициозные, люди — самая распространенная раса, известная своим разнообразием и упорством.',
    baseStatModifiers: { [StatName.Strength]: 1, [StatName.Dexterity]: 1, [StatName.Constitution]: 1, [StatName.Intelligence]: 1, [StatName.Wisdom]: 1, [StatName.Charisma]: 1 },
    icon: PersonIcon({className: "w-12 h-12 mx-auto mb-2 text-purple-400"})
  },
  {
    id: 'elf',
    name: 'Эльф',
    description: 'Изящные и проницательные, эльфы обладают врожденной склонностью к магии и дикой природе, а также долгой продолжительностью жизни.',
    baseStatModifiers: { [StatName.Dexterity]: 2, [StatName.Intelligence]: 1 },
    icon: ElfIcon({className: "w-12 h-12 mx-auto mb-2 text-green-400"})
  },
  {
    id: 'dwarf',
    name: 'Дворф',
    description: 'Крепкие и выносливые, дворфы — мастера-ремесленники и воины, чувствующие себя как дома в горных твердынях.',
    baseStatModifiers: { [StatName.Constitution]: 2, [StatName.Strength]: 1 },
    icon: DwarfIcon({className: "w-12 h-12 mx-auto mb-2 text-amber-400"})
  },
  {
    id: 'orc',
    name: 'Орк',
    description: 'Могучие и свирепые, орки известны своей огромной силой и неукротимым духом в бою.',
    baseStatModifiers: { [StatName.Strength]: 2, [StatName.Constitution]: 1, [StatName.Charisma]: -1 },
    icon: OrcIcon({className: "w-12 h-12 mx-auto mb-2 text-red-400"})
  },
];

export const AVAILABLE_CLASSES: Class[] = [
  {
    id: 'warrior',
    name: 'Воин',
    description: 'Мастера боя, воины полагаются на силу, умение и тяжелую броню для победы над врагами.',
    baseStatModifiers: { [StatName.Strength]: 2, [StatName.Constitution]: 1 },
    icon: SwordsIcon({className: "w-12 h-12 mx-auto mb-2 text-sky-400"}),
    abilities: ["Второе дыхание", "Всплеск действий (на высоких уровнях)"]
  },
  {
    id: 'mage',
    name: 'Маг',
    description: 'Исследователи тайных искусств, маги владеют мощными заклинаниями, изменяя реальность своим интеллектом и знаниями.',
    baseStatModifiers: { [StatName.Intelligence]: 2, [StatName.Wisdom]: 1 },
    icon: MagicWandIcon({className: "w-12 h-12 mx-auto mb-2 text-purple-400"}),
    abilities: ["Колдовство", "Магическое восстановление"]
  },
  {
    id: 'rogue',
    name: 'Плут',
    description: 'Хитрые и ловкие, плуты преуспевают в скрытности, обмане и нанесении ударов, когда их меньше всего ожидают.',
    baseStatModifiers: { [StatName.Dexterity]: 2, [StatName.Charisma]: 1 },
    icon: BowIcon({className: "w-12 h-12 mx-auto mb-2 text-lime-400"}), 
    abilities: ["Скрытая атака", "Воровской жаргон"]
  },
  {
    id: 'ranger',
    name: 'Следопыт',
    description: 'Хозяева дикой природы, следопыты — умелые охотники и следопыты, часто устанавливающие связь с животными.',
    baseStatModifiers: { [StatName.Dexterity]: 1, [StatName.Wisdom]: 2 },
    icon: BowIcon({className: "w-12 h-12 mx-auto mb-2 text-emerald-400"}),
    abilities: ["Избранный враг", "Знаток природы"]
  },
];

export const API_KEY_ERROR_MESSAGE = "API-ключ для Gemini не настроен. Пожалуйста, убедитесь, что переменная окружения API_KEY установлена.";
export const GENERIC_ERROR_MESSAGE = "Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.";

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
