// ==UserScript==
// @name         Universal Dark Mode Toggle
// @namespace    local.universal.darkmode
// @version      1.0.0
// @updateURL    https://raw.githubusercontent.com/BrydenSmith/BCDarkMode-Userscript/main/UniversalDarkMode.user.js
// @downloadURL  https://raw.githubusercontent.com/BrydenSmith/BCDarkMode-Userscript/main/UniversalDarkMode.user.js
// @description  Toggle a reversible dark appearance on websites; remembers your preference across tabs.
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
    'use strict';

    const preferenceKey = 'universal-dark-mode-enabled';
    const themeClass = 'tm-universal-dark-mode';
    const hostId = 'tm-universal-dark-mode-toggle';
    const counterAttribute = 'data-tm-universal-dark-mode-counter-invert';
    if (document.getElementById(hostId)) return;

    GM_addStyle(`
        html.${themeClass} {
            filter: invert(1) hue-rotate(180deg) contrast(0.85) !important;
            background: white !important;
        }
        html.${themeClass} [${counterAttribute}],
        html.${themeClass} #${hostId} {
            filter: invert(1) hue-rotate(180deg) !important;
        }
        #${hostId} {
            position: fixed !important;
            right: 0 !important;
            bottom: 6px !important;
            z-index: 2147483647 !important;
            width: 144px !important;
            height: 56px !important;
            overflow: hidden !important;
            pointer-events: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        @media print {
            html.${themeClass},
            html.${themeClass} [${counterAttribute}] {
                filter: none !important;
            }
            #${hostId} { display: none !important; }
        }
    `);

    const host = document.createElement('div');
    host.id = hostId;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; }
        .hover-strip {
            position: absolute;
            top: 0;
            right: 0;
            width: 20px;
            height: 100%;
            pointer-events: auto;
        }
        button {
            position: absolute;
            top: 10px;
            right: 16px;
            box-sizing: border-box;
            width: 112px;
            height: 36px;
            padding: 0 12px;
            border: 1px solid #008489;
            border-radius: 4px;
            background: #ffffff;
            color: #173438;
            font: 600 13px 'Segoe UI', sans-serif;
            cursor: pointer;
            letter-spacing: 0;
            transform: translateX(128px);
            opacity: 0;
            pointer-events: none;
            transition: transform 180ms ease-out, opacity 180ms ease-out;
        }
        :host(:hover) button,
        button:focus-visible {
            transform: translateX(0);
            opacity: 1;
            pointer-events: auto;
        }
        button:hover { background: #e7f4f4; }
        button:focus-visible { outline: 3px solid #008489; outline-offset: 3px; }
        @media (hover: none) {
            button { transform: translateX(0); opacity: 1; pointer-events: auto; }
        }
        @media (prefers-reduced-motion: reduce) {
            button { transition: none; }
        }
    `;
    const hoverStrip = document.createElement('div');
    hoverStrip.className = 'hover-strip';
    hoverStrip.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Toggle dark mode (Alt+Shift+U)';
    shadow.append(style, hoverStrip, button);
    document.body.append(host);

    let enabled = GM_getValue(preferenceKey, false) === true;

    function updateSurfaceFilters() {
        const surfaces = new WeakMap();
        surfaces.set(document.documentElement, { colour: [255, 255, 255], inverted: true });
        for (const element of document.body.querySelectorAll('*')) {
            element.removeAttribute(counterAttribute);
        }
        document.body.removeAttribute(counterAttribute);

        for (const element of [document.body, ...document.body.querySelectorAll('*')]) {
            if (element === host || !(element instanceof HTMLElement)) continue;
            const parent = surfaces.get(element.parentElement);
            if (!parent) continue;
            const media = /^(IMG|VIDEO|CANVAS|IFRAME)$/.test(element.tagName);
            if (media) {
                if (parent.inverted && element.tagName !== 'IFRAME') {
                    element.setAttribute(counterAttribute, '');
                }
                continue;
            }

            const background = getComputedStyle(element).backgroundColor;
            const channels = background.match(/^rgba?\(([^)]+)\)$/);
            const values = channels ? channels[1].split(',').map(Number) : [];
            const alpha = values.length === 4 ? values[3] : values.length === 3 ? 1 : 0;
            const colour = parent.colour.map((channel, index) =>
                alpha > 0 ? values[index] * alpha + channel * (1 - alpha) : channel
            );
            const brightness = colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722;
            const inverted = brightness >= 128;
            if (inverted !== parent.inverted) {
                element.setAttribute(counterAttribute, '');
            }
            surfaces.set(element, { colour, inverted });
        }
    }

    function render() {
        if (enabled) updateSurfaceFilters();
        document.documentElement.classList.toggle(themeClass, enabled);
        button.textContent = enabled ? 'Light mode' : 'Dark mode';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.setAttribute('aria-pressed', String(enabled));
    }

    function toggle() {
        enabled = !enabled;
        render();
        GM_setValue(preferenceKey, enabled);
    }

    button.addEventListener('click', toggle);
    document.addEventListener('keydown', (event) => {
        const editing = event.composedPath().some((element) =>
            element instanceof HTMLElement &&
            (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName))
        );
        if (event.defaultPrevented || editing || event.repeat || event.ctrlKey || event.metaKey) return;
        if (event.altKey && event.shiftKey && event.code === 'KeyU') {
            event.preventDefault();
            toggle();
        }
    });

    GM_addValueChangeListener(preferenceKey, (_key, _oldValue, newValue) => {
        enabled = newValue === true;
        render();
    });
    GM_registerMenuCommand('Toggle universal dark mode', toggle);
    render();

    let surfaceUpdatePending = false;
    const observer = new MutationObserver((mutations) => {
        if (!enabled || surfaceUpdatePending || !mutations.some((mutation) => mutation.target !== host)) return;
        surfaceUpdatePending = true;
        requestAnimationFrame(() => {
            surfaceUpdatePending = false;
            if (enabled) updateSurfaceFilters();
        });
    });
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
    });
})();