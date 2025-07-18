document.addEventListener("DOMContentLoaded", function () {
    console.log('Script loaded');  // Add this line
    const toggleButton = document.querySelector('.navbar-toggle');
    const menu = document.querySelector('.navbar-menu');
    console.log('Toggle button found:', toggleButton);
    console.log('Menu found:', menu);

    // Log to check if elements are found
    console.log('Toggle button found:', toggleButton);
    console.log('Menu found:', menu);

    // Remove any inline display style and set initial state
    menu.style.display = '';
    menu.classList.remove('active');
    menu.classList.add('hidden');

    // Log initial menu state
    console.log('Menu initial state:', menu.classList.contains('hidden') ? 'hidden' : 'visible');

    // Check if toggleButton exists before adding event listener
    if (toggleButton) {
        toggleButton.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent any default behavior
            console.log('Toggle button clicked!');
            console.log('Before toggle:', menu.classList.contains('hidden') ? 'hidden' : 'visible');
            menu.classList.toggle('hidden');
            menu.classList.toggle('active');
            console.log('After toggle:', menu.classList.contains('active') ? 'active' : 'hidden');
        });
    } else {
        console.log('Error: Toggle button not found, event listener not attached.');
    }

    // Close menu when clicking outside
    document.addEventListener('click', function (event) {
        if (!toggleButton.contains(event.target) && !menu.contains(event.target)) {
            console.log('Clicked outside, closing menu.');
            menu.classList.remove('active');
            menu.classList.add('hidden');
        }
    });
});