document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.querySelector('.navbar-toggle');
    const menu = document.querySelector('.navbar-menu');

    // Only apply mobile behavior if viewport is less than 768px
    if (window.innerWidth < 768) {
        // Remove any inline display style and set initial state
        menu.style.display = '';
        menu.classList.remove('active');
        menu.classList.add('hidden');

        // Check if toggleButton exists before adding event listener
        if (toggleButton) {
            toggleButton.addEventListener('click', function (event) {
                event.preventDefault(); // Prevent any default behavior
                menu.classList.toggle('hidden');
                menu.classList.toggle('active');
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', function (event) {
            if (!toggleButton.contains(event.target) && !menu.contains(event.target)) {
                menu.classList.remove('active');
                menu.classList.add('hidden');
            }
        });
    }
});