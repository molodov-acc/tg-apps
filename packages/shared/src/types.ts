export type Topic = "javascript" | "typescript" | "react";

export interface Question {
  id: number;
  topic: Topic;
  question: string;
  answer: string;
}

