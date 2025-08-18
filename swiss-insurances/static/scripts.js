document.addEventListener("DOMContentLoaded", function () {
    // Your existing form validation code
    const inputs = [
        document.getElementById("premium-300"),
        document.getElementById("premium-500"),
        document.getElementById("premium-1000"),
        document.getElementById("premium-1500"),
        document.getElementById("premium-2000"),
        document.getElementById("premium-2500"),
    ];
    const warning = document.getElementById("validation-warning");
    const submitBtn = document.getElementById("submit-btn");
    const form = document.getElementById("premium-form");

    function validateOrder() {
        const values = inputs.map(input => input.value ? parseFloat(input.value) : null);
        let hasInvalidPair = false;
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] !== null && values[i + 1] !== null && values[i] <= values[i + 1]) {
                hasInvalidPair = true;
                break;
            }
        }
        const allFilled = values.every(value => value !== null);
        const isDescending = allFilled && values.every((value, index) => index === 0 || value < values[index - 1]);

        warning.style.display = hasInvalidPair ? "block" : "none";
        submitBtn.disabled = allFilled && !isDescending;
    }

    // Only run form validation if the elements exist (they might not be on every page)
    if (form && inputs[0]) {
        inputs.forEach(input => {
            input.addEventListener("input", validateOrder);
        });

        form.addEventListener("submit", function (event) {
            if (!form.checkValidity()) {
                form.reportValidity();
                event.preventDefault();
                return;
            }
            validateOrder();
            if (submitBtn.disabled) {
                event.preventDefault();
            }
        });

        validateOrder();
    }

    // Collapsible functionality
    window.toggleCollapsible = function () {
        const content = document.getElementById('priminfo-instructions');
        const arrow = document.querySelector('.arrow');

        if (content && arrow) {
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                arrow.textContent = '▶';
            } else {
                content.classList.add('expanded');
                arrow.textContent = '▼';
            }
        }
    };
});