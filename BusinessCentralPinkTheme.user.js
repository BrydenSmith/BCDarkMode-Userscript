// ==UserScript==
// @name         Business Central Pink Theme
// @namespace    local.businesscentral.pinktheme
// @version      1.0.2
// @description  Toggle a readable pink appearance in Business Central; remembers your preference across tabs.
// @updateURL    https://raw.githubusercontent.com/BrydenSmith/BCDarkMode-Userscript/main/BusinessCentralPinkTheme.user.js
// @downloadURL  https://raw.githubusercontent.com/BrydenSmith/BCDarkMode-Userscript/main/BusinessCentralPinkTheme.user.js
// @match        https://businesscentral.dynamics.com/*
// @match        https://*.businesscentral.dynamics.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
    'use strict';

    const preferenceKey = 'bc-pink-theme-enabled';
    const filterColourKey = 'bc-pink-theme-filter-colour';
    const themeClass = 'tm-bc-pink-theme';
    const hostId = 'tm-bc-pink-theme-toggle';
    const darkModeHostId = 'tm-bc-dark-mode-toggle';
    const colourPickerHostId = 'tm-bc-pink-colour-picker';
    const filterAttribute = 'data-tm-bc-teal-filter';
    const filterRotationProperty = '--tm-bc-pink-filter-rotation';
    const sourceTealHue = 182;
    const defaultFilterColour = '#ff00ff';
    const isTopFrame = window.top === window;
    if (document.getElementById(hostId)) return;

    function hueFromHex(colour) {
        const channels = [1, 3, 5].map((offset) =>
            Number.parseInt(colour.slice(offset, offset + 2), 16) / 255
        );
        const [red, green, blue] = channels;
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
        if (delta === 0) return 0;
        if (max === red) return (60 * (((green - blue) / delta) % 6) + 360) % 360;
        if (max === green) return 60 * ((blue - red) / delta + 2);
        return 60 * ((red - green) / delta + 4);
    }

    function applyFilterColour(colour, persist = false) {
        if (typeof colour !== 'string' || !/^#[\da-f]{6}$/i.test(colour)) return;
        const rotation = (hueFromHex(colour) - sourceTealHue + 360) % 360;
        document.documentElement.style.setProperty(filterRotationProperty, `${rotation}deg`);
        if (persist) GM_setValue(filterColourKey, colour);
    }

    let filterColour = GM_getValue(filterColourKey, defaultFilterColour);
    if (typeof filterColour !== 'string' || !/^#[\da-f]{6}$/i.test(filterColour)) {
        filterColour = defaultFilterColour;
    }
    applyFilterColour(filterColour);

    GM_addStyle(`
        html.${themeClass} [${filterAttribute}] {
            filter: hue-rotate(var(${filterRotationProperty}, 118deg)) !important;
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
            #${hostId} { display: none !important; }
        }
    `);

    let host = null;
    let button = null;
    if (isTopFrame) {
        host = document.createElement('div');
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
                border: 1px solid #9d174d;
                border-radius: 4px;
                background: #9d174d;
                color: #ffffff;
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
            button:hover { background: #701a3d; }
            button:focus-visible { outline: 3px solid #701a3d; outline-offset: 3px; }
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
        button = document.createElement('button');
        button.type = 'button';
        button.title = 'Toggle pink theme (Alt+Shift+P)';
        button.textContent = 'Pink mode';
        button.setAttribute('aria-label', 'Toggle pink theme');
        shadow.append(style, hoverStrip, button);
        document.body.append(host);
    }

    function updateTogglePosition() {
        const darkModePresent = Boolean(document.getElementById(darkModeHostId));
        const toggleBottom = darkModePresent ? '62px' : '6px';
        if (host && host.style.getPropertyValue('bottom') !== toggleBottom) {
            host.style.setProperty('bottom', toggleBottom, 'important');
        }

        const pickerHost = document.getElementById(colourPickerHostId);
        const pickerBottom = darkModePresent ? '112px' : '56px';
        if (pickerHost && pickerHost.style.getPropertyValue('bottom') !== pickerBottom) {
            pickerHost.style.setProperty('bottom', pickerBottom);
        }
    }
    updateTogglePosition();

    let enabled = GM_getValue(preferenceKey, true) === true;

    function openFilterColourPicker() {
        const existing = document.getElementById(colourPickerHostId);
        if (existing) {
            existing.remove();
            return;
        }

        const pickerHost = document.createElement('div');
        pickerHost.id = colourPickerHostId;
        const shadow = pickerHost.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
            :host {
                all: initial;
                position: fixed;
                right: 16px;
                bottom: 56px;
                z-index: 2147483647;
            }
            .panel {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
                padding: 10px 12px;
                max-width: calc(100vw - 24px);
                border: 1px solid #d6c7ce;
                border-radius: 4px;
                background: #ffffff;
                box-shadow: 0 2px 8px rgb(43 23 32 / 20%);
                color: #2b1720;
                font: 13px 'Segoe UI', sans-serif;
            }
            label { white-space: nowrap; }
            input[type="color"] {
                width: 34px;
                height: 30px;
                padding: 2px;
                border: 1px solid #9d174d;
                border-radius: 3px;
                background: #ffffff;
                cursor: pointer;
            }
            output { min-width: 58px; font-family: Consolas, monospace; }
            button {
                min-height: 30px;
                padding: 0 8px;
                border: 1px solid #9d174d;
                border-radius: 3px;
                background: #9d174d;
                color: #ffffff;
                font: 600 12px 'Segoe UI', sans-serif;
                cursor: pointer;
            }
            button.secondary {
                background: #ffffff;
                color: #9d174d;
            }
            button:focus-visible,
            input:focus-visible { outline: 2px solid #701a3d; outline-offset: 2px; }
        `;
        const panel = document.createElement('div');
        panel.className = 'panel';
        const label = document.createElement('label');
        label.textContent = 'Filter colour';
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = filterColour;
        picker.setAttribute('aria-label', 'Choose the replacement hue');
        let previewColour = filterColour;
        const value = document.createElement('output');
        value.value = previewColour;
        value.textContent = previewColour;
        const updatePreview = (colour) => {
            previewColour = colour;
            value.value = colour;
            value.textContent = colour;
            applyFilterColour(colour);
        };
        picker.addEventListener('input', () => {
            updatePreview(picker.value);
        });
        const defaultButton = document.createElement('button');
        defaultButton.type = 'button';
        defaultButton.className = 'secondary';
        defaultButton.textContent = 'Default';
        defaultButton.addEventListener('click', () => {
            picker.value = defaultFilterColour;
            updatePreview(defaultFilterColour);
        });
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'secondary';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            applyFilterColour(filterColour);
            pickerHost.remove();
        });
        const applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.textContent = 'Apply';
        applyButton.addEventListener('click', () => {
            applyFilterColour(previewColour, true);
            pickerHost.remove();
        });
        label.append(picker);
        panel.append(label, value, defaultButton, cancelButton, applyButton);
        shadow.append(style, panel);
        document.body.append(pickerHost);
        updateTogglePosition();
        picker.focus();
    }

    function isTealColor(value) {
        const colors = value.match(/rgba?\([^)]+\)/g) || [value];
        return colors.some((color) => {
            const channels = color.match(/^rgba?\(([^)]+)\)$/);
            const values = channels ? channels[1].split(',').map(Number) : [];
            if (values.length < 3) return false;

            const [red, green, blue] = values;
            const max = Math.max(red, green, blue);
            const min = Math.min(red, green, blue);
            const delta = max - min;
            let hue = 0;
            if (delta > 0) {
                if (max === red) hue = 60 * (((green - blue) / delta) % 6);
                else if (max === green) hue = 60 * ((blue - red) / delta + 2);
                else hue = 60 * ((red - green) / delta + 4);
                if (hue < 0) hue += 360;
            }

            const saturation = max === 0 ? 0 : delta / max;
            return saturation >= 0.12 && hue >= 160 && hue <= 195;
        });
    }

    function updateTealFilters() {
        for (const element of document.body.querySelectorAll('*')) {
            if (!(element instanceof Element) || element === host) continue;

            const parent = element.parentElement;
            if (parent?.closest(`[${filterAttribute}]`)) {
                element.removeAttribute(filterAttribute);
                continue;
            }

            const style = getComputedStyle(element);
            const parentColor = parent ? getComputedStyle(parent).color : '';
            const colors = [
                style.backgroundColor,
                style.color !== parentColor ? style.color : '',
                style.borderTopColor,
                style.borderRightColor,
                style.borderBottomColor,
                style.borderLeftColor,
                style.fill,
                style.stroke,
                style.textDecorationColor,
                style.outlineColor,
                style.backgroundImage,
                style.boxShadow,
            ];
            const isTeal = colors.some(isTealColor);
            if (isTeal) element.setAttribute(filterAttribute, '');
            else element.removeAttribute(filterAttribute);
        }
    }

    function render() {
        if (enabled) updateTealFilters();
        else {
            for (const element of document.querySelectorAll(`[${filterAttribute}]`)) {
                element.removeAttribute(filterAttribute);
            }
        }
        document.documentElement.classList.toggle(themeClass, enabled);
        if (button) {
            button.textContent = enabled ? 'Pink mode on' : 'Pink mode off';
            button.setAttribute('aria-pressed', String(enabled));
        }
    }

    function toggle() {
        enabled = !enabled;
        render();
        GM_setValue(preferenceKey, enabled);
    }

    if (button) {
        button.addEventListener('click', toggle);
        document.addEventListener('keydown', (event) => {
            const editing = event.composedPath().some((element) =>
                element instanceof HTMLElement &&
                (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName))
            );
            if (event.defaultPrevented || editing || event.repeat || event.ctrlKey || event.metaKey) return;
            if (event.altKey && event.shiftKey && event.code === 'KeyP') {
                event.preventDefault();
                toggle();
            }
        });
        GM_registerMenuCommand('Toggle Business Central pink theme', toggle);
        GM_registerMenuCommand('Choose pink theme filter colour', openFilterColourPicker);
    }

    GM_addValueChangeListener(filterColourKey, (_key, _oldValue, newValue) => {
        if (typeof newValue !== 'string' || !/^#[\da-f]{6}$/i.test(newValue)) return;
        filterColour = newValue;
        applyFilterColour(filterColour);
    });
    GM_addValueChangeListener(preferenceKey, (_key, _oldValue, newValue) => {
        enabled = newValue === true;
        render();
    });
    render();

    let surfaceUpdatePending = false;
    const observer = new MutationObserver((mutations) => {
        if (!mutations.some((mutation) => mutation.target !== host)) return;
        updateTogglePosition();
        if (!enabled || surfaceUpdatePending) return;
        surfaceUpdatePending = true;
        requestAnimationFrame(() => {
            surfaceUpdatePending = false;
            if (enabled) updateTealFilters();
        });
    });
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
    });
})();