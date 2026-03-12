import type { Question } from "./types.js";

export const questions: Question[] = [
  {
    id: 1,
    topic: "javascript",
    question: "Что такое closure?",
    answer: `
Closure — это функция, которая запоминает
переменные из своей внешней области видимости.
`,
  },
  {
    id: 2,
    topic: "react",
    question: "Что такое Virtual DOM?",
    answer: `
Virtual DOM — это виртуальное представление DOM
которое сравнивается с предыдущей версией.
`,
  },
  {
    id: 3,
    topic: "typescript",
    question: "Что такое generics?",
    answer: `
Generics позволяют создавать
переиспользуемые типы.
`,
  },
];

