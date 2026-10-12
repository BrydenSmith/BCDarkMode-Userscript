// ==UserScript==
// @name         Business Central Dark Mode Toggle
// @namespace    local.businesscentral.darkmode
// @version      1.0.0
// @description  Toggle a reversible dark appearance in Business Central; remembers your preference across tabs.
// @match        https://businesscentral.dynamics.com/*
// @match        https://*.businesscentral.dynamics.com/*
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

    const preferenceKey = 'bc-dark-mode-enabled';
    const themeClass = 'tm-bc-dark-mode';
    const hostId = 'tm-bc-dark-mode-toggle';
    if (document.getElementById(hostId)) return;

    GM_addStyle(`
        html.${themeClass} {
            filter: invert(1) hue-rotate(180deg) contrast(0.75) !important;
            background: white !important;
        }
        html.${themeClass} body {
            background-color: white !important;
        }
        html.${themeClass} img,
        html.${themeClass} video,
        html.${themeClass} canvas,
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
            html.${themeClass} img,
            html.${themeClass} video,
            html.${themeClass} canvas {
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
    button.title = 'Toggle dark mode (Alt+Shift+D)';
    shadow.append(style, hoverStrip, button);
    document.body.append(host);

    let enabled = GM_getValue(preferenceKey, false) === true;

    function render() {
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
        if (event.altKey && event.shiftKey && event.code === 'KeyD') {
            event.preventDefault();
            toggle();
        }
    });

    GM_addValueChangeListener(preferenceKey, (_key, _oldValue, newValue) => {
        enabled = newValue === true;
        render();
    });
    GM_registerMenuCommand('Toggle Business Central dark mode', toggle);
    render();
})();