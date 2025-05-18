document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const storedTheme = localStorage.getItem('theme');

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('bi-moon', theme === 'dark');
        icon.classList.toggle('bi-sun', theme === 'light');
    }

    if (storedTheme) {
        applyTheme(storedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        
        // Animație icon
        const icon = themeToggle.querySelector('i');
        icon.classList.add('theme-toggle-active');
        setTimeout(() => icon.classList.remove('theme-toggle-active'), 300);
    });
});