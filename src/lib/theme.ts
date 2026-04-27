export function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
}

export function setTheme(theme: 'dark' | 'light') {
  localStorage.setItem('theme', theme)
  if (theme === 'light') {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  } else {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  }
}

export function initTheme() {
  const theme = getTheme()
  setTheme(theme)
}