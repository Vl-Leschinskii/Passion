export type GumilevGroup = "passi" | "garm" | "sub";

export type SeedHero = {
  nameRu: string;
  nameEn: string;
  subRu: string;
  subEn: string;
  group: GumilevGroup;
  descRu: string;
  descEn: string;
  scores: [number, number, number, number, number];
};

export type SeedBook = {
  slug: string;
  titleRu: string;
  titleEn: string;
  sortOrder: number;
  driveNameHints: string[];
  heroes: SeedHero[];
};

export const SEED_BOOKS: SeedBook[] = [
  {
    slug: "gone",
    titleRu: "Унесённые ветром",
    titleEn: "Gone with the Wind",
    sortOrder: 0,
    driveNameHints: ["унесенные", "унесённые", "mitchell", "митчелл", "gone"],
    heroes: [
      {
        nameRu: "Скарлетт О’Хара",
        nameEn: "Scarlett O'Hara",
        subRu: "Пассионарий-прагматик",
        subEn: "Pragmatic passionary",
        group: "passi",
        descRu:
          "Выживает любой ценой, ломает правила, но не способна на бескорыстную жертву. Умна, прагматична, эмоционально нестабильна.",
        descEn:
          "Survives at any cost, breaks rules, but cannot make a selfless sacrifice. Smart, pragmatic, emotionally unstable.",
        scores: [0.6, 0.7, 0.6, -0.5, 0.4],
      },
      {
        nameRu: "Ретт Батлер",
        nameEn: "Rhett Butler",
        subRu: "Пассионарий-циник",
        subEn: "Cynical passionary",
        group: "passi",
        descRu:
          "Умён, независим, любит Скарлетт по-своему. Открыт новому, дисциплинирован, но не жертвует собой до конца.",
        descEn:
          "Clever and independent; loves Scarlett on his own terms. Open to novelty and disciplined, but will not fully sacrifice himself.",
        scores: [0.8, 0.8, 0.7, -0.1, -0.3],
      },
      {
        nameRu: "Мелани Уилкс",
        nameEn: "Melanie Wilkes",
        subRu: "Гармоник с пассионарным ядром",
        subEn: "Harmonic with a passionary core",
        group: "garm",
        descRu:
          "Тихая сила, моральный компас, умирает за других. Альтруистична, добросовестна, эмоционально устойчива.",
        descEn:
          "Quiet strength and moral compass; dies for others. Altruistic, conscientious, emotionally stable.",
        scores: [0.1, 0.6, -0.3, 0.9, -0.6],
      },
      {
        nameRu: "Эшли Уилкс",
        nameEn: "Ashley Wilkes",
        subRu: "Субпассионарий-романтик",
        subEn: "Romantic subpassionary",
        group: "sub",
        descRu:
          "Умён, но беспомощен, живёт прошлым, не способен к действию. Высокая открытость при низкой добросовестности.",
        descEn:
          "Intelligent but helpless, lives in the past, unable to act. High openness with low conscientiousness.",
        scores: [0.7, -0.5, -0.6, 0.5, 0.4],
      },
      {
        nameRu: "Мамушка",
        nameEn: "Mammy",
        subRu: "Гармоник-хранитель",
        subEn: "Guardian harmonic",
        group: "garm",
        descRu:
          "Опора семьи, консервативна, предана до конца. Добросовестна, но закрыта новому.",
        descEn:
          "Family pillar; conservative and loyal to the end. Conscientious but closed to novelty.",
        scores: [-0.5, 0.7, 0.2, 0.8, 0.0],
      },
      {
        nameRu: "Джеральд О’Хара",
        nameEn: "Gerald O'Hara",
        subRu: "Пассионарий на спаде",
        subEn: "Declining passionary",
        group: "passi",
        descRu:
          "Сила в прошлом, в настоящем — инерция и гибель. Импульсивен, экстравертирован, ригиден.",
        descEn:
          "Strength in the past; inertia and ruin in the present. Impulsive, extraverted, rigid.",
        scores: [-0.3, 0.4, 0.8, 0.4, -0.2],
      },
      {
        nameRu: "Индия Уилкс",
        nameEn: "India Wilkes",
        subRu: "Гармоник с уклоном вниз",
        subEn: "Harmonic tilting downward",
        group: "garm",
        descRu: "Жертва обстоятельств, не борец. Сдержанна, тревожна, но добра.",
        descEn: "Victim of circumstance, not a fighter. Reserved, anxious, but kind.",
        scores: [0.0, 0.3, -0.5, 0.6, 0.5],
      },
      {
        nameRu: "Бонни Батлер",
        nameEn: "Bonnie Butler",
        subRu: "Ребёнок-гармоник",
        subEn: "Child harmonic",
        group: "garm",
        descRu:
          "Свет в жизни Ретта, её смерть — точка невозврата. Открыта, активна, но хрупка.",
        descEn:
          "Light in Rhett's life; her death is the point of no return. Open, active, but fragile.",
        scores: [0.5, -0.2, 0.6, 0.7, 0.3],
      },
    ],
  },
  {
    slug: "ivanhoe",
    titleRu: "Айвенго",
    titleEn: "Ivanhoe",
    sortOrder: 1,
    driveNameHints: ["айвенго", "ivanhoe", "scott", "скотт"],
    heroes: [
      {
        nameRu: "Айвенго",
        nameEn: "Ivanhoe",
        subRu: "Пассионарий-рыцарь",
        subEn: "Knight passionary",
        group: "passi",
        descRu:
          "Честь, любовь, готовность умереть за идею. Дисциплинирован, экстравертирован, устойчив.",
        descEn:
          "Honor, love, readiness to die for an idea. Disciplined, extraverted, stable.",
        scores: [0.4, 0.8, 0.6, 0.7, -0.4],
      },
      {
        nameRu: "Ревекка",
        nameEn: "Rebecca",
        subRu: "Пассионарий-целительница",
        subEn: "Healer passionary",
        group: "passi",
        descRu:
          "Мудрая, самоотверженная, сильнее всех духом. Открыта, добросовестна, альтруистична.",
        descEn:
          "Wise, selfless, strongest in spirit. Open, conscientious, altruistic.",
        scores: [0.9, 0.7, -0.2, 0.9, -0.3],
      },
      {
        nameRu: "Ричард Львиное Сердце",
        nameEn: "Richard the Lionheart",
        subRu: "Пассионарий-воин",
        subEn: "Warrior passionary",
        group: "passi",
        descRu:
          "Величие и хаос, герой без стратегии. Максимальная экстраверсия и открытость, низкая добросовестность.",
        descEn:
          "Grandeur and chaos; a hero without strategy. Maximum extraversion and openness, low conscientiousness.",
        scores: [0.7, -0.2, 1.0, 0.3, -0.1],
      },
      {
        nameRu: "Бриан де Буагильбер",
        nameEn: "Brian de Bois-Guilbert",
        subRu: "Деструктивный пассионарий",
        subEn: "Destructive passionary",
        group: "passi",
        descRu: "Сила без чести, страсть без любви. Высокая воля, низкая доброжелательность.",
        descEn: "Strength without honor, passion without love. High will, low agreeableness.",
        scores: [0.5, 0.7, 0.5, -0.8, 0.3],
      },
      {
        nameRu: "Седрик Сакс",
        nameEn: "Cedric the Saxon",
        subRu: "Фанатик прошлого",
        subEn: "Fanatic of the past",
        group: "sub",
        descRu: "Живёт идеей, но губит всех вокруг. Закрыт новому, ригиден, конфликтен.",
        descEn: "Lives by an idea but ruins those around him. Closed to novelty, rigid, conflictual.",
        scores: [-0.8, 0.5, 0.4, -0.3, 0.4],
      },
      {
        nameRu: "Ровена",
        nameEn: "Rowena",
        subRu: "Гармоник-пассив",
        subEn: "Passive harmonic",
        group: "garm",
        descRu:
          "Красива, добра, но безынициативна. Средние значения по всем шкалам, чуть выше доброжелательность.",
        descEn:
          "Beautiful and kind but passive. Mid-range traits, slightly higher agreeableness.",
        scores: [0.1, 0.3, -0.4, 0.7, -0.2],
      },
      {
        nameRu: "Локсли (Робин Гуд)",
        nameEn: "Locksley (Robin Hood)",
        subRu: "Пассионарий-народный герой",
        subEn: "Folk-hero passionary",
        group: "passi",
        descRu: "Лидер, защитник, мастер тактики. Экстраверт, добросовестен, альтруистичен.",
        descEn: "Leader, protector, master of tactics. Extraverted, conscientious, altruistic.",
        scores: [0.5, 0.7, 0.9, 0.8, -0.5],
      },
      {
        nameRu: "Вамба",
        nameEn: "Wamba",
        subRu: "Гармоник-трикстер",
        subEn: "Trickster harmonic",
        group: "garm",
        descRu: "Шут, но с сердцем героя. Открыт, экстравертирован, добр.",
        descEn: "A jester with a hero's heart. Open, extraverted, kind.",
        scores: [0.7, 0.0, 0.7, 0.7, 0.1],
      },
    ],
  },
  {
    slug: "warpeace",
    titleRu: "Война и мир",
    titleEn: "War and Peace",
    sortOrder: 2,
    driveNameHints: ["война и мир", "толстой", "tolstoy", "war and peace", "warpeace"],
    heroes: [
      {
        nameRu: "Андрей Болконский",
        nameEn: "Andrei Bolkonsky",
        subRu: "Пассионарий-интеллектуал",
        subEn: "Intellectual passionary",
        group: "passi",
        descRu:
          "Ищет смысл, но оторван от людей. Высокая открытость и добросовестность, низкая доброжелательность.",
        descEn:
          "Seeks meaning but detached from people. High openness and conscientiousness, low agreeableness.",
        scores: [0.8, 0.8, -0.3, -0.4, 0.5],
      },
      {
        nameRu: "Пьер Безухов",
        nameEn: "Pierre Bezukhov",
        subRu: "Гармоник с поиском",
        subEn: "Seeking harmonic",
        group: "garm",
        descRu: "Добрый, ищущий, ведомый. Открыт, альтруистичен, но неорганизован.",
        descEn: "Kind, searching, easily led. Open and altruistic, but disorganized.",
        scores: [0.8, -0.5, 0.1, 0.9, 0.4],
      },
      {
        nameRu: "Наташа Ростова",
        nameEn: "Natasha Rostova",
        subRu: "Гармоник — жизненная сила",
        subEn: "Life-force harmonic",
        group: "garm",
        descRu: "Интуиция, любовь, ошибки, искупление. Экстравертирована, открыта, доброжелательна.",
        descEn: "Intuition, love, mistakes, redemption. Extraverted, open, agreeable.",
        scores: [0.7, -0.3, 0.9, 0.8, 0.3],
      },
      {
        nameRu: "Николай Ростов",
        nameEn: "Nikolai Rostov",
        subRu: "Гармоник-исполнитель",
        subEn: "Dutiful harmonic",
        group: "garm",
        descRu: "Честный, простой, верный долгу. Добросовестен, устойчив, экстравертирован.",
        descEn: "Honest, simple, loyal to duty. Conscientious, stable, extraverted.",
        scores: [0.0, 0.7, 0.6, 0.7, -0.6],
      },
      {
        nameRu: "Элен Курагина",
        nameEn: "Hélène Kuragina",
        subRu: "Деструктивный пассионарий",
        subEn: "Destructive passionary",
        group: "passi",
        descRu: "Холодная, расчётливая, пустая. Экстравертирована, но крайне низкая доброжелательность.",
        descEn: "Cold, calculating, empty. Extraverted with extremely low agreeableness.",
        scores: [0.2, 0.5, 0.8, -0.9, -0.2],
      },
      {
        nameRu: "Анатоль Курагин",
        nameEn: "Anatole Kuragin",
        subRu: "Субпассионарий-гедонист",
        subEn: "Hedonist subpassionary",
        group: "sub",
        descRu: "Красив, глуп, разрушителен. Импульсивен, низкая добросовестность и доброжелательность.",
        descEn: "Handsome, foolish, destructive. Impulsive; low conscientiousness and agreeableness.",
        scores: [0.1, -0.9, 0.7, -0.7, 0.0],
      },
      {
        nameRu: "Кутузов",
        nameEn: "Kutuzov",
        subRu: "Пассионарий-стратег",
        subEn: "Strategist passionary",
        group: "passi",
        descRu: "Мудрость, терпение, победа через отступление. Добросовестен, устойчив, альтруистичен.",
        descEn: "Wisdom, patience, victory through retreat. Conscientious, stable, altruistic.",
        scores: [0.5, 0.9, 0.2, 0.7, -0.8],
      },
      {
        nameRu: "Марья Болконская",
        nameEn: "Marya Bolkonskaya",
        subRu: "Гармоник-святая",
        subEn: "Saintly harmonic",
        group: "garm",
        descRu: "Терпение, вера, любовь без условий. Альтруистична, добросовестна, тревожна.",
        descEn: "Patience, faith, unconditional love. Altruistic, conscientious, anxious.",
        scores: [0.2, 0.6, -0.6, 0.9, 0.5],
      },
      {
        nameRu: "Наполеон Бонапарт",
        nameEn: "Napoleon Bonaparte",
        subRu: "Пассионарий-завоеватель",
        subEn: "Conqueror passionary",
        group: "passi",
        descRu:
          "Гигант воли и амбиций; для Толстого — символ исторической иллюзии. Максимальная экстраверсия, низкая доброжелательность.",
        descEn:
          "Giant of will and ambition; for Tolstoy, a symbol of historical illusion. Peak extraversion, low agreeableness.",
        scores: [0.6, 0.8, 0.9, -0.7, -0.1],
      },
    ],
  },
];
