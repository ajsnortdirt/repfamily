(function () {
    'use strict';

    const form = document.getElementById('tracking-form');
    const input = document.getElementById('tracking-input');
    const clearBtn = document.getElementById('tracking-clear');

    function updateClearVisibility() {
        if (input.value) {
            clearBtn.removeAttribute('hidden');
        } else {
            clearBtn.setAttribute('hidden', '');
        }
    }

    function clearInput() {
        input.value = '';
        updateClearVisibility();
        input.focus();
    }

    input.addEventListener('input', updateClearVisibility);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && input.value) {
            e.preventDefault();
            clearInput();
        }
    });

    clearBtn.addEventListener('click', clearInput);

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const num = input.value.trim();
        if (!num) return;
        const w = window.open('https://t.17track.net/en#nums=' + encodeURIComponent(num), '_blank', 'noopener,noreferrer');
        if (w) w.opener = null;
    });
})();
