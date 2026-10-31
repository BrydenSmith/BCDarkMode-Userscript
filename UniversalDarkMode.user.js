// ==UserScript==
// @name         Universal Dark Mode Toggle
// @namespace    local.universal.darkmode
// @version      1.0.6
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
    const methodPreferenceKey = `universal-dark-mode-method:${location.hostname}`;
    const imagePreferenceKey = `universal-dark-mode-image-blending:${location.hostname}`;
    const themeClass = 'tm-universal-dark-mode';
    const colourClass = 'tm-universal-dark-mode-colours';
    const filterClass = 'tm-universal-dark-mode-filters';
    const counterAttribute = 'data-tm-universal-dark-mode-counter-invert';
    const imageBlendClass = 'tm-universal-dark-mode-image-blending';
    const imageFilterHostId = 'tm-universal-dark-mode-image-filter';
    const imageFilterId = 'tm-universal-dark-mode-white-key';
    const hostId = 'tm-universal-dark-mode-toggle';
    const colourChangerHostId = 'tm-bc-pink-theme-toggle';
    const surfaceAttribute = 'data-tm-universal-dark-mode-surface';
    if (document.getElementById(hostId)) return;

    GM_addStyle(`
        @media screen {
            html.${themeClass}.${filterClass} {
                filter: invert(1) hue-rotate(180deg) contrast(0.85) !important;
                background: white !important;
            }
            html.${themeClass}.${filterClass} [${counterAttribute}],
            html.${themeClass}.${filterClass} #${hostId} {
                filter: invert(1) hue-rotate(180deg) !important;
            }
            html.${themeClass}.${imageBlendClass} img {
                filter: url("#${imageFilterId}") !important;
            }
            html.${themeClass}.${filterClass}.${imageBlendClass} img[${counterAttribute}] {
                filter: invert(1) hue-rotate(180deg) url("#${imageFilterId}") !important;
            }
        }
        #${imageFilterHostId} {
            position: absolute !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            pointer-events: none !important;
        }
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
    const imageFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    imageFilter.id = imageFilterHostId;
    imageFilter.setAttribute('aria-hidden', 'true');
    imageFilter.innerHTML = `
        <defs>
            <filter id="${imageFilterId}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -10 -10 -10 0 30" result="whiteMask" />
                <feComposite in="SourceGraphic" in2="whiteMask" operator="in" />
            </filter>
        </defs>
    `;
    document.body.append(imageFilter);
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
    let imageBlending = GM_getValue(imagePreferenceKey, false) === true;

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

    const surfaceRules = new Map();
    const surfaceIds = new WeakMap();
    let nextSurfaceId = 0;
    const excludedSelector = `#${hostId}, #${imageFilterHostId}, img, video, canvas, iframe, embed, object, picture, script, style, link`;
    let usingColours = GM_getValue(methodPreferenceKey, 'filters') === 'colours';

    function updateSurfaceFilters() {
        const surfaces = new WeakMap();
        surfaces.set(document.documentElement, { colour: [255, 255, 255], inverted: true });
        const updates = [];
        for (const element of [document.body, ...document.body.querySelectorAll('*')]) {
            if (!(element instanceof HTMLElement) || element.closest(`#${hostId}, #${imageFilterHostId}`)) continue;
            const parent = surfaces.get(element.parentElement);
            let counter = false;
            if (parent) {
                if (/^(IMG|VIDEO|CANVAS|IFRAME|EMBED|OBJECT)$/.test(element.tagName)) {
                    counter = parent.inverted;
                } else {
                    const background = parseColour(getComputedStyle(element).backgroundColor);
                    const colour = parent.colour.map((channel, index) => background ?
                        background.channels[index] * background.alpha + channel * (1 - background.alpha) : channel);
                    const inverted = brightness(colour) >= 128;
                    counter = inverted !== parent.inverted;
                    surfaces.set(element, { colour, inverted });
                }
            }
            updates.push({ element, counter });
        }
        for (const { element, counter } of updates) {
            if (counter && !element.hasAttribute(counterAttribute)) element.setAttribute(counterAttribute, '');
            else if (!counter && element.hasAttribute(counterAttribute)) element.removeAttribute(counterAttribute);
        }
    }

    function updateSurfaceColours(roots = [document.documentElement]) {
        if (!usingColours) {
            updateSurfaceFilters();
            return;
        }
        const elements = new Set();
        for (const root of roots) {
            if (!(root instanceof Element) || !root.isConnected || root.closest(excludedSelector)) continue;
            elements.add(root);
            for (const element of root.querySelectorAll('*')) {
                if (!element.closest(excludedSelector)) elements.add(element);
            }
        }
        if (!elements.size && ![...surfaceRules.keys()].some((element) => !element.isConnected)) return;
        const updates = [];
        surfaceStyle.disabled = true;
        try {
            for (const element of elements) {
                if (element === host || !(element instanceof HTMLElement || element instanceof SVGElement)) continue;
                if (!surfaceIds.has(element)) surfaceIds.set(element, nextSurfaceId++);
                const index = surfaceIds.get(element);
                const rules = [];

                const computed = getComputedStyle(element);
                const background = parseColour(computed.backgroundColor);
                const declarations = [];
                if (background && background.alpha > 0 && brightness(background.channels) >= 128) {
                    declarations.push(`background-color:${mixColour(background, [15, 17, 19], 0.04)} !important`);
                } else if (element === document.documentElement && (!background || background.alpha === 0)) {
                    declarations.push('background-color:rgb(15,17,19) !important');
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
                const selector = element === document.documentElement ? `html.${themeClass}.${colourClass}` :
                    `html.${themeClass}.${colourClass} [${surfaceAttribute}="${index}"]`;
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
                        pseudoDeclarations.push(`background-color:${mixColour(pseudoBackground, [15, 17, 19], 0.04)} !important`);
                    }
                    if (pseudoDeclarations.length) {
                        hasPseudoRules = true;
                        rules.push(`${selector}${pseudoElement}{${pseudoDeclarations.join(';')}}`);
                    }
                }
                if (declarations.length || hasPseudoRules) {
                    if (declarations.length) rules.push(`${selector}{${declarations.join(';')}}`);
                }
                updates.push({ element, index, rules: rules.join('\n') });
            }
            let changed = false;
            for (const { element, index, rules } of updates) {
                if (rules) {
                    if (element.getAttribute(surfaceAttribute) !== String(index)) {
                        element.setAttribute(surfaceAttribute, String(index));
                    }
                    if (surfaceRules.get(element) !== rules) {
                        surfaceRules.set(element, rules);
                        changed = true;
                    }
                } else {
                    element.removeAttribute(surfaceAttribute);
                    if (surfaceRules.delete(element)) changed = true;
                }
            }
            for (const element of surfaceRules.keys()) {
                if (!element.isConnected || element.closest(excludedSelector)) {
                    element.removeAttribute(surfaceAttribute);
                    surfaceRules.delete(element);
                    changed = true;
                }
            }
            if (changed) {
                surfaceStyle.textContent = `@media screen{${[...surfaceRules.values()].join('\n')}}`;
            }
        } finally {
            surfaceStyle.disabled = false;
        }
    }

    function render() {
        document.documentElement.classList.toggle(colourClass, usingColours);
        document.documentElement.classList.toggle(filterClass, !usingColours);
        if (enabled) updateSurfaceColours();
        document.documentElement.classList.toggle(themeClass, enabled);
        document.documentElement.classList.toggle(imageBlendClass, imageBlending);
        button.textContent = enabled ? 'Light mode' : 'Dark mode';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.setAttribute('aria-pressed', String(enabled));
        button.title = `Toggle dark mode (Alt+Shift+U); method: ${usingColours ? 'colour replacement' : 'filter inversion'}`;
    }

    function toggle() {
        enabled = !enabled;
        render();
        GM_setValue(preferenceKey, enabled);
    }

    function toggleImageBlending() {
        imageBlending = !imageBlending;
        document.documentElement.classList.toggle(imageBlendClass, imageBlending);
        GM_setValue(imagePreferenceKey, imageBlending);
    }

    function toggleMethod() {
        usingColours = !usingColours;
        render();
        GM_setValue(methodPreferenceKey, usingColours ? 'colours' : 'filters');
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
    GM_addValueChangeListener(imagePreferenceKey, (_key, _oldValue, newValue) => {
        imageBlending = newValue === true;
        document.documentElement.classList.toggle(imageBlendClass, imageBlending);
    });
    GM_addValueChangeListener(methodPreferenceKey, (_key, _oldValue, newValue) => {
        usingColours = newValue === 'colours';
        render();
    });
    GM_registerMenuCommand('Toggle universal dark mode', toggle);
    GM_registerMenuCommand('Switch dark mode method (filter inversion / colour replacement)', toggleMethod);
    GM_registerMenuCommand('Toggle white image background removal (also affects white details)', toggleImageBlending);
    render();

    let surfaceUpdatePending = false;
    const pendingRoots = new Set();
    function outermostRoots(roots) {
        const candidates = [...roots];
        return candidates.filter((candidate) =>
            !candidates.some((ancestor) => ancestor !== candidate && ancestor.contains(candidate))
        );
    }

    function queueSurfaceUpdate(root) {
        pendingRoots.add(root);
        if (surfaceUpdatePending) return;
        surfaceUpdatePending = true;
        setTimeout(() => {
            surfaceUpdatePending = false;
            const roots = outermostRoots(pendingRoots);
            pendingRoots.clear();
            if (enabled) updateSurfaceColours(roots);
        }, 80);
    }

    const observer = new MutationObserver((mutations) => {
        const insertedRoots = new Set();
        if (enabled) {
            for (const mutation of mutations) {
                if (mutation.type !== 'childList') continue;
                for (const node of mutation.addedNodes) {
                    if (node instanceof Element && node.isConnected &&
                        (!node.closest(excludedSelector) || node.matches('iframe, embed, object'))) {
                        insertedRoots.add(node);
                    }
                }
            }
        }
        for (const mutation of mutations) {
            if (mutation.target === host || host.contains(mutation.target) ||
                mutation.target === surfaceStyle || surfaceStyle.contains(mutation.target)) continue;
            if (mutation.target === document.documentElement && mutation.attributeName === 'class') {
                const withoutTheme = (value) => (value || '').split(/\s+/)
                    .filter((name) => name && ![themeClass, imageBlendClass, colourClass, filterClass].includes(name)).sort().join(' ');
                if (withoutTheme(mutation.oldValue) === withoutTheme(document.documentElement.className)) continue;
            }
            if (mutation.type === 'childList' &&
                [...mutation.addedNodes, ...mutation.removedNodes].some((node) => node instanceof Element)) {
                updateTogglePosition();
            }
            if (!enabled) continue;
            if (mutation.target instanceof Element && mutation.target.closest('style')) {
                queueSurfaceUpdate(document.documentElement);
            } else if (mutation.type === 'attributes') {
                if (mutation.target instanceof HTMLLinkElement) queueSurfaceUpdate(document.documentElement);
                else if (![...insertedRoots].some((root) => root.contains(mutation.target))) {
                    queueSurfaceUpdate(mutation.target);
                }
            } else {
                for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                    if (!(node instanceof Element)) continue;
                    if (node.matches('style, link') || node.querySelector('style, link')) {
                        queueSurfaceUpdate(document.documentElement);
                    } else if (!insertedRoots.has(node)) {
                        queueSurfaceUpdate(node);
                    }
                }
            }
        }
        if (insertedRoots.size) {
            const roots = outermostRoots(insertedRoots);
            for (const pending of pendingRoots) {
                if (roots.some((root) => root.contains(pending))) pendingRoots.delete(pending);
            }
            updateSurfaceColours(roots);
        }
    });
    document.addEventListener('load', (event) => {
        if (enabled && event.target instanceof HTMLLinkElement && event.target.rel === 'stylesheet') {
            queueSurfaceUpdate(document.documentElement);
        }
    }, true);
    window.addEventListener('resize', () => {
        if (enabled) queueSurfaceUpdate(document.documentElement);
    });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['class', 'style', 'href', 'media', 'disabled'],
    });
})();