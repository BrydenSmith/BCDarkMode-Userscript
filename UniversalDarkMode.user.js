// ==UserScript==
// @name         Universal Dark Mode Toggle
// @namespace    local.universal.darkmode
// @version      1.0.8
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
    const repairPreferenceKey = `universal-dark-mode-repair-fixed:${location.hostname}`;
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
    const repairAttribute = 'data-tm-universal-dark-mode-fixed-repair';
    const amazonCartFix = /(^|\.)amazon\.(co\.uk|com|de|fr|it|es|ca|com\.au|co\.jp)$/.test(location.hostname);
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
    const repairStyle = document.createElement('style');
    document.head.append(repairStyle);
    if (amazonCartFix) {
        GM_addStyle(`
            @media screen {
                html.${themeClass}.${filterClass} #nav-flyout-ewc {
                    right: var(--tm-cart-right, 0px) !important;
                    top: var(--tm-cart-top, 0px) !important;
                    height: 100vh !important;
                }
            }
        `);
    }
    function alignAmazonCart() {
        if (!amazonCartFix || !enabled || usingColours) return;
        const navbar = document.getElementById('navbar');
        const cart = document.getElementById('nav-flyout-ewc');
        if (!navbar || !cart) return;
        const bounds = navbar.getBoundingClientRect();
        const offsets = {
            '--tm-cart-right': `${bounds.right - document.documentElement.clientWidth}px`,
            '--tm-cart-top': `${-bounds.top}px`,
        };
        for (const [property, value] of Object.entries(offsets)) {
            if (cart.style.getPropertyValue(property) !== value) cart.style.setProperty(property, value);
        }
    }
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
    let repairEnabled = GM_getValue(repairPreferenceKey, false) === true;
    let fixedCandidates = [];
    const repairIds = new WeakMap();
    const repairedElements = new Set();
    let nextRepairId = 0;

    function clearFixedRepairs() {
        if (repairStyle.textContent) repairStyle.textContent = '';
        for (const element of repairedElements) element.removeAttribute(repairAttribute);
        repairedElements.clear();
    }

    function repairFixedPositions() {
        if (!repairEnabled || !enabled || usingColours) {
            clearFixedRepairs();
            return;
        }
        if (!document.documentElement.classList.contains(themeClass)) return;
        const candidates = fixedCandidates.filter((element) => element.isConnected);
        if (!candidates.length) {
            clearFixedRepairs();
            return;
        }
        const originals = new Map();
        repairStyle.disabled = true;
        document.documentElement.classList.remove(filterClass);
        try {
            for (const element of candidates) {
                const computed = getComputedStyle(element);
                if (computed.position !== 'fixed' || computed.display === 'none' ||
                    computed.visibility !== 'visible' || computed.transform !== 'none' ||
                    computed.translate !== 'none' || computed.rotate !== 'none' || computed.scale !== 'none' ||
                    computed.animationName !== 'none' || computed.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0)) continue;
                let safe = true;
                for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
                    const style = getComputedStyle(ancestor);
                    if (style.filter !== 'none' || style.transform !== 'none' || style.perspective !== 'none' ||
                        style.translate !== 'none' || style.rotate !== 'none' || style.scale !== 'none' ||
                        style.backdropFilter !== 'none' || /transform|filter|perspective/.test(style.willChange) ||
                        /layout|paint|strict|content/.test(style.contain) || style.contentVisibility === 'auto' ||
                        style.animationName !== 'none' || style.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0)) {
                        safe = false;
                        break;
                    }
                }
                if (!safe) continue;
                const bounds = element.getBoundingClientRect();
                if (bounds.width > 0 && bounds.height > 0) originals.set(element, bounds);
            }
        } finally {
            document.documentElement.classList.add(filterClass);
        }
        try {
            const updates = [];
            for (const [element, original] of originals) {
                const actual = element.getBoundingClientRect();
                if (Math.abs(actual.width - original.width) > 1 || Math.abs(actual.height - original.height) > 1) continue;
                const offsetX = original.left - actual.left;
                const offsetY = original.top - actual.top;
                if (Math.abs(offsetX) <= 1 && Math.abs(offsetY) <= 1) continue;
                if (!repairIds.has(element)) repairIds.set(element, nextRepairId++);
                updates.push({ element, id: repairIds.get(element), offsetX, offsetY });
            }
            const nextElements = new Set(updates.map((update) => update.element));
            for (const element of repairedElements) {
                if (!nextElements.has(element)) element.removeAttribute(repairAttribute);
            }
            const rules = [];
            repairedElements.clear();
            for (const { element, id, offsetX, offsetY } of updates) {
                if (element.getAttribute(repairAttribute) !== String(id)) element.setAttribute(repairAttribute, String(id));
                repairedElements.add(element);
                rules.push(`html.${themeClass}.${filterClass} [${repairAttribute}="${id}"]{translate:${offsetX}px ${offsetY}px !important}`);
            }
            const css = `@media screen{${rules.join('\n')}}`;
            if (repairStyle.textContent !== css) repairStyle.textContent = css;
        } finally {
            repairStyle.disabled = false;
        }
    }

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
        const candidates = [];
        for (const element of [document.body, ...document.body.querySelectorAll('*')]) {
            if (!(element instanceof HTMLElement) || element.closest(`#${hostId}, #${imageFilterHostId}`)) continue;
            if (repairEnabled && !(amazonCartFix && element.id === 'nav-flyout-ewc') &&
                element.id !== colourChangerHostId && getComputedStyle(element).position === 'fixed') candidates.push(element);
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
        fixedCandidates = candidates;
        repairFixedPositions();
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
        alignAmazonCart();
        repairFixedPositions();
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

    function toggleFixedRepair() {
        repairEnabled = !repairEnabled;
        if (repairEnabled && enabled && !usingColours) updateSurfaceFilters();
        else repairFixedPositions();
        GM_setValue(repairPreferenceKey, repairEnabled);
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
    GM_addValueChangeListener(repairPreferenceKey, (_key, _oldValue, newValue) => {
        repairEnabled = newValue === true;
        if (repairEnabled && enabled && !usingColours) updateSurfaceFilters();
        else repairFixedPositions();
    });
    GM_registerMenuCommand('Toggle universal dark mode', toggle);
    GM_registerMenuCommand('Switch dark mode method (filter inversion / colour replacement)', toggleMethod);
    GM_registerMenuCommand('Toggle fixed-position repair (experimental)', toggleFixedRepair);
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
                mutation.target === surfaceStyle || surfaceStyle.contains(mutation.target) ||
                mutation.target === repairStyle || repairStyle.contains(mutation.target)) continue;
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
        alignAmazonCart();
    });
    document.addEventListener('load', (event) => {
        if (enabled && event.target instanceof HTMLLinkElement && event.target.rel === 'stylesheet') {
            queueSurfaceUpdate(document.documentElement);
        }
    }, true);
    window.addEventListener('resize', () => {
        alignAmazonCart();
        repairFixedPositions();
        if (enabled) queueSurfaceUpdate(document.documentElement);
    });
    let repairFramePending = false;
    document.addEventListener('scroll', () => {
        if (!repairEnabled || !enabled || usingColours || repairFramePending || !fixedCandidates.length) return;
        repairFramePending = true;
        requestAnimationFrame(() => {
            repairFramePending = false;
            repairFixedPositions();
        });
    }, { capture: true, passive: true });
    if (amazonCartFix) window.addEventListener('scroll', alignAmazonCart, { passive: true });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['class', 'style', 'href', 'media', 'disabled'],
    });
})();