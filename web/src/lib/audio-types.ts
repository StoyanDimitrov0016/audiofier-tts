export type GenerateAudioInput = {
  text: string;
  stem: string;
  suffix: ".md" | ".txt";
  voice: string;
  speed: number;
  wavOnly: boolean;
  outputDir?: string;
};

export type GenerateAudioResult = {
  ok: true;
  lessonOutputDir: string;
  wavPath: string;
  mp3Path: string | null;
  chunkCount: number;
  cleanedCharacterCount: number;
  durationSeconds: number;
  formattedDuration: string;
};
