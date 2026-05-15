(function () {
    'use strict';

    const AFFCODE = 'repfamily';

    const SOURCE_SITES = [
        'taobao.com',
        'weidian.com',
        '1688.com',
        'tmall.com',
        'jd.com',
        'goofish.com',
    ];

    const AGENT_EXTRACTORS = [
        { hosts: ['kakobuy.com'],  param: 'url' },
        { hosts: ['pandabuy.com'], param: 'url' },
        { hosts: ['usfans.com'],   param: 'url' },
        { hosts: ['mulebuy.com'],  param: 'url' },
        { hosts: ['acbuy.com'],    param: 'url' },
        { hosts: ['loongbuy.com'], param: 'url' },
        { hosts: ['cssbuy.com'],   param: 'url' },
    ];

    function matchesHost(hostname, domain) {
        return hostname === domain || hostname.endsWith('.' + domain);
    }

    function extractProductUrl(raw) {
        let parsed;
        try { parsed = new URL(raw); } catch { return null; }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

        const host = parsed.hostname;

        if (SOURCE_SITES.some(s => matchesHost(host, s))) return raw;

        for (const agent of AGENT_EXTRACTORS) {
            if (agent.hosts.some(h => matchesHost(host, h))) {
                const inner = parsed.searchParams.get(agent.param);
                if (inner) {
                    try {
                        const innerParsed = new URL(inner);
                        if (innerParsed.protocol !== 'http:' && innerParsed.protocol !== 'https:') return null;
                        return inner;
                    } catch { return null; }
                }
            }
        }

        if (matchesHost(host, 'sugargoo.com')) {
            const match = parsed.hash.match(/productLink=([^&]+)/);
            if (match) {
                try {
                    const decoded = decodeURIComponent(match[1]);
                    const innerParsed = new URL(decoded);
                    if (innerParsed.protocol !== 'http:' && innerParsed.protocol !== 'https:') return null;
                    return decoded;
                } catch { return null; }
            }
        }

        return null;
    }

    function buildKakoBuyLink(url) {
        return 'https://www.kakobuy.com/item/details?url=' + encodeURIComponent(url) + '&affcode=' + AFFCODE;
    }

    const form = document.getElementById('converter-form');
    const input = document.getElementById('converter-input');
    const resultBox = document.getElementById('result-box');
    const resultDisplay = document.getElementById('result-display');
    const openLink = document.getElementById('open-link');
    const copyBtn = document.getElementById('copy-btn');
    const errorMsg = document.getElementById('error-msg');
    const clearBtn = document.getElementById('converter-clear');

    function updateClearVisibility() {
        if (input.value) {
            clearBtn.removeAttribute('hidden');
        } else {
            clearBtn.setAttribute('hidden', '');
        }
    }

    input.addEventListener('input', updateClearVisibility);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && input.value) {
            e.preventDefault();
            clearInput();
        }
    });

    clearBtn.addEventListener('click', clearInput);

    function clearInput() {
        input.value = '';
        updateClearVisibility();
        errorMsg.style.display = 'none';
        resultBox.style.display = 'none';
        input.focus();
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const raw = input.value.trim();

        errorMsg.style.display = 'none';
        resultBox.style.display = 'none';

        if (!raw) return;

        const productUrl = extractProductUrl(raw);
        if (!productUrl) {
            errorMsg.style.display = 'block';
            return;
        }

        const converted = buildKakoBuyLink(productUrl);
        resultDisplay.textContent = converted;
        openLink.href = converted;
        resultBox.style.display = 'flex';
        copyBtn.textContent = 'copy';
        copyBtn.classList.remove('copied');
    });

    copyBtn.addEventListener('click', function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(resultDisplay.textContent).then(() => {
            copyBtn.textContent = 'copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(() => {});
    });
})();
