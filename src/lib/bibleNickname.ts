const BIBLE_CHARACTERS = [
  'David', 'Moses', 'Esther', 'Ruth', 'Daniel',
  'Joseph', 'Mary', 'Paul', 'Peter', 'John',
  'Deborah', 'Samuel', 'Elijah', 'Joshua', 'Miriam',
  'Solomon', 'Lydia', 'Gideon', 'Hannah', 'Caleb',
  'Priscilla', 'Timothy', 'Tabitha', 'Barnabas', 'Naomi',
  'Isaac', 'Rebecca', 'Ezra', 'Nehemiah', 'Abigail',
  'Stephen', 'Philip', 'Andrew', 'Thomas', 'Matthew',
  'Mark', 'Luke', 'Silas', 'Titus', 'Phoebe',  'Adam', 'Eve', 'Noah', 'Abraham', 'Sarah',
  'Jacob', 'Leah', 'Rachel', 'Joseph', 'Benjamin',
  'Judah', 'Levi', 'Moses', 'Aaron', 'Miriam',
  'Joshua', 'Rahab', 'Deborah', 'Gideon', 'Samson',
  'Delilah', 'Ruth', 'Boaz', 'Hannah', 'Samuel',
  'Saul', 'Jonathan', 'David', 'Bathsheba', 'Solomon', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel', 'Hosea',
  'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John' , 'Elizabeth', 'Mary Magdalene',
  'Martha', 'Lazarus', 'Nicodemus', 'Pontius Pilate', 'Herod',
  'John the Baptist', 'James', 'Jude', 'Simon Peter', 'Andrew',
  'Bartholomew', 'James the Less', 'Thaddaeus', 'Matthias', 'Paul',
  'Silas', 'Timothy', 'Titus', 'Philemon', 'Onesimus',
  'Lydia', 'Priscilla', 'Aquila', 'Apollos', 'Barnabas'
]

export function generateBibleNickname(name: string, existingNicknames: string[] = []): string {
  const firstName = name.trim().split(' ')[0]
  
  // Try matching first letter first
  const initial = firstName.charAt(0).toUpperCase()
  const matching = BIBLE_CHARACTERS.filter(
    (c) => c.charAt(0).toUpperCase() === initial
  )
  const pool = matching.length > 0 ? matching : BIBLE_CHARACTERS

  // Keep trying until we get a unique one
  let attempts = 0
  while (attempts < 100) {
    const character = pool[Math.floor(Math.random() * pool.length)]
    const nickname = `${firstName}-${character}`
    if (!existingNicknames.includes(nickname)) {
      return nickname
    }
    attempts++
  }

  // Last resort — add a number
  const character = pool[Math.floor(Math.random() * pool.length)]
  return `${firstName}-${character}-${Math.floor(Math.random() * 99) + 1}`
}