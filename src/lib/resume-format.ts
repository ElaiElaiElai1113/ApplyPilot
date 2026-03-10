export function formatResumeText(input: string): string {
  const sectionPattern =
    /(summary|profile|objective|experience|work experience|education|skills|technical skills|projects|certifications|achievements|languages|references)/gi

  let text = input
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!text.includes('\n') || text.split('\n').length < 6) {
    text = text.replace(sectionPattern, '\n\n$1\n')
  }

  text = text
    .replace(/\s([•●▪◦])\s+/g, '\n$1 ')
    .replace(/\s-\s(?=[A-Z0-9])/g, '\n- ')

  text = text
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n')

  return text.trim()
}
