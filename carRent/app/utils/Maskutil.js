// "Chester Lauzon" -> "C*****r L****n". First and last letter of each word stay visible.
const maskWord = (word) => {
  const chars = Array.from(word);
  if (chars.length <= 2) return chars[0] + '*'.repeat(chars.length - 1);
  return chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1];
};

const maskName = (name = '') =>
  String(name).trim().split(/\s+/).filter(Boolean).map(maskWord).join(' ') || 'Anonymous';

module.exports = { maskName };