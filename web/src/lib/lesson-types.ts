export type AudioGroup = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedAudio = {
  groupId: string;
  chapterId: string;
  lessonOutputDir: string;
  wavPath: string;
  mp3Path: string | null;
  chunkCount: number;
  cleanedCharacterCount: number;
  durationSeconds: number;
  formattedDuration: string;
  generatedAt: string;
};

export type ChapterSummary = {
  id: string;
  groupId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  generatedAudio: GeneratedAudio | null;
};

export type Chapter = ChapterSummary & {
  markdown: string;
};

export type LessonLibrary = {
  groups: AudioGroup[];
  chaptersByGroup: Record<string, ChapterSummary[]>;
};

export type AudioSettings = {
  voice: string;
  speed: number;
  wavOnly: boolean;
};
