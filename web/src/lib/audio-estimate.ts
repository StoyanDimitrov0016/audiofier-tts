export const ESTIMATED_CHARACTERS_PER_MINUTE = 900;

export function getEstimatedAudioDetails(markdown: string) {
  const characterCount = markdown.trim().length;
  const estimatedSeconds = Math.round((characterCount / ESTIMATED_CHARACTERS_PER_MINUTE) * 60);
  const seconds = characterCount === 0 ? 0 : Math.max(1, estimatedSeconds);

  return {
    characterCount,
    duration: formatDuration(seconds),
  };
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds === 0) {
    return "0 sec";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min ${seconds} sec`;
  }

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} sec`;
}
