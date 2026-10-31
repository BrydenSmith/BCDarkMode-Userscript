// ==UserScript==
// @name         Universal Dark Mode Toggle
// @namespace    local.universal.darkmode
// @version      1.0.3
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

    const preferenceKey = `universal-dark-mode-enabled:${location.hostname}`;
    const themeClass = 'tm-universal-dark-mode';
    const hostId = 'tm-universal-dark-mode-toggle';
    const colourChangerHostId = 'tm-bc-pink-theme-toggle';
    const surfaceAttribute = 'data-tm-universal-dark-mode-surface';
    if (document.getElementById(hostId)) return;

    GM_addStyle(`
        #${hostId} {
            all: initial !important;
            box-sizing: border-box !important;
            display: block !important;
            position: fixed !important;
            right: 0 !important;
            bottom: 6px !important;
            z-index: 2147483647 !important;
            width: 144px !important;
            min-width: 0 !important;
            max-width: 100vw !important;
            height: 56px !important;
            overflow: hidden !important;
            pointer-events: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        @media print {
            #${hostId} { display: none !important; }
        }
    `);

    const surfaceStyle = document.createElement('style');
    document.head.append(surfaceStyle);
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

    function updateTogglePosition() {
        const toggleBottom = document.getElementById(colourChangerHostId) ? '62px' : '6px';
        if (host.style.getPropertyValue('bottom') !== toggleBottom) {
            host.style.setProperty('bottom', toggleBottom, 'important');
        }
    }
    updateTogglePosition();

    let enabled = GM_getValue(preferenceKey, false) === true;

    function parseColour(value) {
        const channels = value.match(/^rgba?\(([^)]+)\)$/);
        if (!channels) return null;
        const values = channels[1].split(',').map(Number);
        return { channels: values.slice(0, 3), alpha: values.length === 4 ? values[3] : 1 };
    }

    function brightness(channels) {
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }

    function mixColour(colour, target, weight) {
        const channels = colour.channels.map((channel, index) =>
            Math.round(channel * weight + target[index] * (1 - weight))
        );
        return `rgba(${channels.join(',')},${colour.alpha})`;
    }

    function updateSurfaceColours() {
        const surfaces = new WeakSet();
        const rules = [];
        surfaceStyle.disabled = true;
        try {
            const elements = [document.documentElement, document.body, ...document.body.querySelectorAll('*')];
            for (const [index, element] of elements.entries()) {
                element.removeAttribute(surfaceAttribute);
                if (element === host || !(element instanceof HTMLElement || element instanceof SVGElement)) continue;
                if (element !== document.documentElement && !surfaces.has(element.parentElement)) continue;
                if (/^(IMG|VIDEO|CANVAS|IFRAME|EMBED|OBJECT|PICTURE|SCRIPT|STYLE|LINK)$/.test(element.tagName)) continue;

                const computed = getComputedStyle(element);
                const background = parseColour(computed.backgroundColor);
                surfaces.add(element);
                const declarations = [];
                if (background && background.alpha > 0 && brightness(background.channels) >= 128) {
                    declarations.push(`background-color:${mixColour(background, [21, 23, 25], 0.15)} !important`);
                } else if (element === document.documentElement && (!background || background.alpha === 0)) {
                    declarations.push('background-color:rgb(21,23,25) !important');
                }

                for (const property of ['color', 'fill', 'stroke']) {
                    if (property !== 'color' && !(element instanceof SVGElement)) continue;
                    const colour = parseColour(computed.getPropertyValue(property));
                    if (colour && colour.alpha > 0 && brightness(colour.channels) < 128) {
                        declarations.push(`${property}:${mixColour(colour, [241, 243, 245], 0.2)} !important`);
                    }
                }
                for (const side of ['top', 'right', 'bottom', 'left']) {
                    const property = `border-${side}-color`;
                    const colour = parseColour(computed.getPropertyValue(property));
                    if (colour && colour.alpha > 0 && brightness(colour.channels) >= 128) {
                        declarations.push(`${property}:${mixColour(colour, [100, 105, 112], 0.2)} !important`);
                    }
                }
                const selector = element === document.documentElement ? `html.${themeClass}` :
                    `html.${themeClass} [${surfaceAttribute}="${index}"]`;
                const pseudoElements = ['::before', '::after'];
                if (/^(INPUT|TEXTAREA)$/.test(element.tagName)) pseudoElements.push('::placeholder');
                let hasPseudoRules = false;
                for (const pseudoElement of pseudoElements) {
                    const pseudo = getComputedStyle(element, pseudoElement);
                    if (pseudoElement !== '::placeholder' && (pseudo.content === 'none' || pseudo.content === 'normal')) continue;
                    const pseudoDeclarations = [];
                    const colour = parseColour(pseudo.color);
                    if (colour && colour.alpha > 0 && brightness(colour.channels) < 128) {
                        pseudoDeclarations.push(`color:${mixColour(colour, [241, 243, 245], 0.2)} !important`);
                    }
                    const pseudoBackground = parseColour(pseudo.backgroundColor);
                    if (pseudoBackground && pseudoBackground.alpha > 0 && brightness(pseudoBackground.channels) >= 128) {
                        pseudoDeclarations.push(`background-color:${mixColour(pseudoBackground, [21, 23, 25], 0.15)} !important`);
                    }
                    if (pseudoDeclarations.length) {
                        hasPseudoRules = true;
                        rules.push(`${selector}${pseudoElement}{${pseudoDeclarations.join(';')}}`);
                    }
                }
                if (declarations.length || hasPseudoRules) {
                    element.setAttribute(surfaceAttribute, String(index));
                    if (declarations.length) rules.push(`${selector}{${declarations.join(';')}}`);
                }
            }
            surfaceStyle.textContent = `@media screen{${rules.join('\n')}}`;
        } finally {
            surfaceStyle.disabled = false;
        }
    }

    function render() {
        if (enabled) updateSurfaceColours();
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
        if (!mutations.some((mutation) => mutation.target !== host &&
            mutation.target !== surfaceStyle && !surfaceStyle.contains(mutation.target))) return;
        if (mutations.some((mutation) => mutation.type === 'childList')) updateTogglePosition();
        if (!enabled || surfaceUpdatePending) return;
        surfaceUpdatePending = true;
        requestAnimationFrame(() => {
            surfaceUpdatePending = false;
            if (enabled) updateSurfaceColours();
        });
    });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
    });
})();