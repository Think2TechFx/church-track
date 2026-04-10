const BIBLE_CHARACTERS = [
  'David', 'Moses', 'Esther', 'Ruth', 'Daniel',
  'Joseph', 'Mary', 'Paul', 'Peter', 'John',
  'Deborah', 'Samuel', 'Elijah', 'Joshua', 'Miriam',
  'Solomon', 'Lydia', 'Gideon', 'Hannah', 'Caleb',
  'Priscilla', 'Timothy', 'Tabitha', 'Barnabas', 'Naomi',
  'Isaac', 'Rebecca', 'Ezra', 'Nehemiah', 'Abigail',
]

export function generateBibleNickname(name: string): string {
  const firstName = name.trim().split(' ')[0]
  const initial = firstName.charAt(0).toUpperCase()
  
  // Filter characters starting with same letter if possible
  const matching = BIBLE_CHARACTERS.filter(
    (c) => c.charAt(0).toUpperCase() === initial
  )
  
  const pool = matching.length > 0 ? matching : BIBLE_CHARACTERS
  const character = pool[Math.floor(Math.random() * pool.length)]
  
  return `${firstName}-${character}`
}