// ==UserScript==
// @name         Business Central Pink Theme
// @namespace    local.businesscentral.pinktheme
// @version      1.0.0
// @description  Toggle a readable pink appearance in Business Central; remembers your preference across tabs.
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
    const themeClass = 'tm-bc-pink-theme';
    const hostId = 'tm-bc-pink-theme-toggle';
    const filterAttribute = 'data-tm-bc-teal-filter';
    const isTopFrame = window.top === window;
    if (document.getElementById(hostId)) return;

    GM_addStyle(`
        html.${themeClass} [${filterAttribute}] {
            filter: hue-rotate(120deg) !important;
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
            :host {
                all: initial;
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                pointer-events: none;
            }
            button {
                position: fixed;
                right: 16px;
                bottom: 10px;
                box-sizing: border-box;
                min-width: 112px;
                height: 36px;
                padding: 0 12px;
                border: 1px solid #9d174d;
                border-radius: 4px;
                background: #9d174d;
                color: #ffffff;
                font: 600 13px 'Segoe UI', sans-serif;
                cursor: pointer;
                letter-spacing: 0;
                pointer-events: auto;
            }
            button:hover { background: #701a3d; }
            button:focus-visible { outline: 3px solid #701a3d; outline-offset: 3px; }
            @media (prefers-reduced-motion: reduce) {
                button { transition: none; }
            }
        `;
        button = document.createElement('button');
        button.type = 'button';
        button.title = 'Toggle pink theme (Alt+Shift+P)';
        button.textContent = 'Pink mode';
        button.setAttribute('aria-label', 'Toggle pink theme');
        shadow.append(style, button);
        document.body.append(host);
    }

    let enabled = GM_getValue(preferenceKey, true) === true;

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
    }

    GM_addValueChangeListener(preferenceKey, (_key, _oldValue, newValue) => {
        enabled = newValue === true;
        render();
    });
    render();

    let surfaceUpdatePending = false;
    const observer = new MutationObserver((mutations) => {
        if (!enabled || surfaceUpdatePending || !mutations.some((mutation) => mutation.target !== host)) return;
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