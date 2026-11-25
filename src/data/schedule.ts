// Расписание пар для карточки «Сейчас». Время - торонтское.
// Меняется раз в семестр: добавь новый семестр в `terms`.
// day: 1 = понедельник ... 5 = пятница. online: true = пара из дома, без дороги.

export type ClassSlot = { day: number; start: string; end: string; name: string; online?: boolean };
export type Term = {
  name: string;
  /** Первый и последний день занятий */
  start: string;
  end: string;
  /** Недели без пар (intersession week и т.п.), включительно */
  breaks: [string, string][];
  classes: ClassSlot[];
};

export const terms: Term[] = [
  {
    name: 'Fall 2026',
    start: '2026-09-08',
    end: '2026-12-18',
    breaks: [['2026-10-26', '2026-10-30']],
    classes: [
      { day: 1, start: '12:00', end: '14:00', name: 'IT Essentials', online: true },
      { day: 1, start: '14:00', end: '16:00', name: 'Computing Logic', online: true },
      { day: 1, start: '16:00', end: '18:00', name: 'Data Management', online: true },
      { day: 2, start: '12:00', end: '13:00', name: 'Data Management' },
      { day: 2, start: '13:00', end: '15:00', name: 'Math' },
      { day: 2, start: '18:00', end: '20:00', name: 'Web Development', online: true },
      { day: 3, start: '10:00', end: '12:00', name: 'Computing Logic' },
      { day: 3, start: '12:00', end: '14:00', name: 'Web Development' },
      { day: 3, start: '15:00', end: '18:00', name: 'College Communication' },
      { day: 4, start: '10:00', end: '12:00', name: 'IT Essentials' },
      { day: 4, start: '14:00', end: '16:00', name: 'Math' },
    ],
  },
  {
    name: 'Winter 2027',
    start: '2027-01-11',
    // TODO: точный конец и intersession week - посмотреть в STU-VIEW
    end: '2027-04-23',
    breaks: [],
    classes: [
      { day: 1, start: '12:00', end: '14:00', name: 'Database Management' },
      { day: 1, start: '14:00', end: '16:00', name: 'OOP' },
      { day: 1, start: '18:00', end: '20:00', name: 'Full-Stack' },
      { day: 2, start: '08:00', end: '10:00', name: 'Database Management' },
      { day: 2, start: '11:00', end: '14:00', name: 'Personal Finance' },
      { day: 2, start: '15:00', end: '17:00', name: 'Math II' },
      { day: 3, start: '10:00', end: '12:00', name: 'OOP' },
      { day: 3, start: '13:00', end: '16:00', name: 'Linux Essentials' },
      { day: 5, start: '10:00', end: '12:00', name: 'Full-Stack' },
      { day: 5, start: '14:00', end: '16:00', name: 'Math II' },
    ],
  },
];

/** Распорядок (в минутах) */
export const routine = {
  sleep: { from: '01:00', to: '08:00' },
  /** Дорога до колледжа / ивента и обратно */
  travel: 60,
  /** «На перемене» перед парой */
  breakBefore: 15,
  /** Окно между парами от стольких минут = «На обеде» */
  lunchGap: 120,
};
