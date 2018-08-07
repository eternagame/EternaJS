/* eslint-disable max-len */

/**
 * KeyboardEvent.code constants
 * (note: NOT KeyboardEvent.keyCode)
 * See: https://www.w3.org/TR/uievents-code/#keyboard-key-codes
 */
export class KeyCode {
    // 3.1.1.1. Writing System Keys
    public static readonly Backquote: string = "Backquote"; // `~ on a US keyboard. This is the 半角/全角/漢字 (hankaku/zenkaku/kanji) key on Japanese keyboards
    public static readonly Backslash: string = "Backslash"; // Used for both the US \| (on the 101-key layout) and also for the key    located between the " and Enter keys on row C of the 102-, 104- and 106-key layouts. Labelled #~ on a UK (102) keyboard.
    public static readonly Backspace: string = "Backspace"; // Backspace or ⌫. Labelled Delete on Apple keyboards.
    public static readonly BracketLeft: string = "BracketLeft"; // [{ on a US keyboard.
    public static readonly BracketRight: string = "BracketRight"; // ]} on a US keyboard.

    public static readonly Comma: string = "Comma"; // ,< on a US keyboard.

    public static readonly Digit0: string = "Digit0"; // 0) on a US keyboard.
    public static readonly Digit1: string = "Digit1"; // 1! on a US keyboard.
    public static readonly Digit2: string = "Digit2"; // 2@ on a US keyboard.
    public static readonly Digit3: string = "Digit3"; // 3# on a US keyboard.
    public static readonly Digit4: string = "Digit4"; // 4$ on a US keyboard.
    public static readonly Digit5: string = "Digit5"; // 5% on a US keyboard.
    public static readonly Digit6: string = "Digit6"; // 6^ on a US keyboard.
    public static readonly Digit7: string = "Digit7"; // 7& on a US keyboard.
    public static readonly Digit8: string = "Digit8"; // 8* on a US keyboard.
    public static readonly Digit9: string = "Digit9"; // 9( on a US keyboard.

    public static readonly Equal: string = "Equal"; // =+ on a US keyboard.
    public static readonly IntlBackslash: string = "IntlBackslash"; // Located between the left Shift and Z keys.  Labelled \| on a UK keyboard.
    public static readonly IntlRo: string = "IntlRo"; // Located between the / and right Shift keys. Labelled \ろ (ro) on a Japanese keyboard.
    public static readonly IntlYen: string = "IntlYen"; // Located between the = and Backspace keys.   Labelled ¥ (yen) on a Japanese keyboard. \/ on a Russian keyboard.

    public static readonly KeyA: string = "KeyA"; // a on a US keyboard. Labelled q on an AZERTY (e.g., French) keyboard.
    public static readonly KeyB: string = "KeyB"; // b on a US keyboard.
    public static readonly KeyC: string = "KeyC"; // c on a US keyboard.
    public static readonly KeyD: string = "KeyD"; // d on a US keyboard.
    public static readonly KeyE: string = "KeyE"; // e on a US keyboard.
    public static readonly KeyF: string = "KeyF"; // f on a US keyboard.
    public static readonly KeyG: string = "KeyG"; // g on a US keyboard.
    public static readonly KeyH: string = "KeyH"; // h on a US keyboard.
    public static readonly KeyI: string = "KeyI"; // i on a US keyboard.
    public static readonly KeyJ: string = "KeyJ"; // j on a US keyboard.
    public static readonly KeyK: string = "KeyK"; // k on a US keyboard.
    public static readonly KeyL: string = "KeyL"; // l on a US keyboard.
    public static readonly KeyM: string = "KeyM"; // m on a US keyboard.
    public static readonly KeyN: string = "KeyN"; // n on a US keyboard.
    public static readonly KeyO: string = "KeyO"; // o on a US keyboard.
    public static readonly KeyP: string = "KeyP"; // p on a US keyboard.
    public static readonly KeyQ: string = "KeyQ"; // q on a US keyboard. Labelled a on an AZERTY (e.g., French) keyboard.
    public static readonly KeyR: string = "KeyR"; // r on a US keyboard.
    public static readonly KeyS: string = "KeyS"; // s on a US keyboard.
    public static readonly KeyT: string = "KeyT"; // t on a US keyboard.
    public static readonly KeyU: string = "KeyU"; // u on a US keyboard.
    public static readonly KeyV: string = "KeyV"; // v on a US keyboard.
    public static readonly KeyW: string = "KeyW"; // w on a US keyboard. Labelled z on an AZERTY (e.g., French) keyboard.
    public static readonly KeyX: string = "KeyX"; // x on a US keyboard.
    public static readonly KeyY: string = "KeyY"; // y on a US keyboard. Labelled z on a QWERTZ (e.g., German) keyboard.
    public static readonly KeyZ: string = "KeyZ"; // z on a US keyboard. Labelled w on an AZERTY (e.g., French) keyboard, and y on a QWERTZ (e.g., German) keyboard.

    public static readonly Minus: string = "Minus"; // -_ on a US keyboard.
    public static readonly Period: string = "Period"; // .> on a US keyboard.
    public static readonly Quote: string = "Quote"; // '" on a US keyboard.
    public static readonly Semicolon: string = "Semicolon"; // ;: on a US keyboard.
    public static readonly Slash: string = "Slash"; // /? on a US keyboard.

    // 3.1.1.2. Functional Keys
    public static readonly AltLeft: string = "AltLeft"; // Alt, Option or ⌥.
    public static readonly AltRight: string = "AltRight"; // Alt, Option or ⌥.   This is labelled AltGr key on many keyboard layouts.
    public static readonly CapsLock: string = "CapsLock"; // CapsLock or ⇪
    public static readonly ContextMenu: string = "ContextMenu"; // The application context menu key, which is typically found between the right Meta key and the right Control key.
    public static readonly ControlLeft: string = "ControlLeft"; // Control or ⌃
    public static readonly ControlRight: string = "ControlRight"; // Control or ⌃
    public static readonly Enter: string = "Enter"; // Enter or ↵. Labelled Return on Apple keyboards.
    public static readonly MetaLeft: string = "MetaLeft"; // The Windows, ⌘, Command or other OS symbol key.
    public static readonly MetaRight: string = "MetaRight"; // The Windows, ⌘, Command or other OS symbol key.
    public static readonly ShiftLeft: string = "ShiftLeft"; // Shift or ⇧
    public static readonly ShiftRight: string = "ShiftRight"; // Shift or ⇧
    public static readonly Space: string = "Space"; // (space)
    public static readonly Tab: string = "Tab"; // Tab or ⇥

    // 3.1.2. Control Pad Section
    public static readonly Delete: string = "Delete"; // ⌦. The forward delete key.  Note that on Apple keyboards, the key labelled Delete on the main part of the keyboard should be encoded as "Backspace".
    public static readonly End: string = "End"; // Page Down, End or ↘
    public static readonly Help: string = "Help"; // Help. Not present on standard PC keyboards.
    public static readonly Home: string = "Home"; // Home or ↖
    public static readonly Insert: string = "Insert"; // Insert or Ins. Not present on Apple keyboards.
    public static readonly PageDown: string = "PageDown"; // Page Down, PgDn or ⇟
    public static readonly PageUp: string = "PageUp"; // Page Up, PgUp or ⇞

    // Arrow Pad Section
    public static readonly ArrowDown: string = "ArrowDown"; // ↓
    public static readonly ArrowLeft: string = "ArrowLeft"; // ←
    public static readonly ArrowRight: string = "ArrowRight"; // →
    public static readonly ArrowUp: string = "ArrowUp"; // ↑

    // 3.1.4. Numpad Section
    public static readonly NumLock: string = "NumLock"; // On the Mac, the "NumLock" code should be used for the numpad Clear key.

    public static readonly Numpad0: string = "Numpad0"; // 0 Ins on a keyboard; 0 on a phone or remote control
    public static readonly Numpad1: string = "Numpad1"; // 1 End on a keyboard; 1 or 1 QZ on a phone or remote control
    public static readonly Numpad2: string = "Numpad2"; // 2 ↓ on a keyboard; 2 ABC on a phone or remote control
    public static readonly Numpad3: string = "Numpad3"; // 3 PgDn on a keyboard; 3 DEF on a phone or remote control
    public static readonly Numpad4: string = "Numpad4"; // 4 ← on a keyboard; 4 GHI on a phone or remote control
    public static readonly Numpad5: string = "Numpad5"; // 5 on a keyboard; 5 JKL on a phone or remote control
    public static readonly Numpad6: string = "Numpad6"; // 6 → on a keyboard; 6 MNO on a phone or remote control
    public static readonly Numpad7: string = "Numpad7"; // 7 Home on a keyboard; 7 PQRS or 7 PRS on a phone  or remote control
    public static readonly Numpad8: string = "Numpad8"; // 8 ↑ on a keyboard; 8 TUV on a phone or remote control
    public static readonly Numpad9: string = "Numpad9"; // 9 PgUp on a keyboard; 9 WXYZ or 9 WXY on a phone  or remote control

    public static readonly NumpadAdd: string = "NumpadAdd"; // +
    public static readonly NumpadBackspace: string = "NumpadBackspace"; // Found on the Microsoft Natural Keyboard.
    public static readonly NumpadClear: string = "NumpadClear"; // C or AC (All Clear). Also for use with numpads that have a Clear key that is separate from the NumLock key. On the Mac, the numpad Clear key should always be encoded as "NumLock".
    public static readonly NumpadClearEntry: string = "NumpadClearEntry"; // CE (Clear Entry)
    public static readonly NumpadComma: string = "NumpadComma"; // , (thousands separator). For locales where the thousands separator  is a "." (e.g., Brazil), this key may generate a ..
    public static readonly NumpadDecimal: string = "NumpadDecimal"; // . Del. For locales where the decimal separator is "," (e.g.,    Brazil), this key may generate a ,.
    public static readonly NumpadDivide: string = "NumpadDivide"; // /
    public static readonly NumpadEnter: string = "NumpadEnter";
    public static readonly NumpadEqual: string = "NumpadEqual"; // =
    public static readonly NumpadHash: string = "NumpadHash"; // # on a phone or remote control device. This key is typically found  below the 9 key and to the right of the 0 key.
    public static readonly NumpadMemoryAdd: string = "NumpadMemoryAdd"; // M+ Add current entry to the value stored in memory.
    public static readonly NumpadMemoryClear: string = "NumpadMemoryClear"; // MC Clear the value stored in memory.
    public static readonly NumpadMemoryRecall: string = "NumpadMemoryRecall"; // MR Replace the current entry with the value stored in memory.
    public static readonly NumpadMemoryStore: string = "NumpadMemoryStore"; // MS Replace the value stored in memory with the current entry.
    public static readonly NumpadMemorySubtract: string = "NumpadMemorySubtract"; // M- Subtract current entry from the value stored in memory.
    public static readonly NumpadMultiply: string = "NumpadMultiply"; // * on a keyboard. For use with numpads that provide mathematical operations (+, -, * and /). Use "NumpadStar" for the * key on phones and remote controls.
    public static readonly NumpadParenLeft: string = "NumpadParenLeft"; // ( Found on the Microsoft Natural Keyboard.
    public static readonly NumpadParenRight: string = "NumpadParenRight"; // ) Found on the Microsoft Natural Keyboard.
    public static readonly NumpadStar: string = "NumpadStar"; // * on a phone or remote control device.  This key is typically found below the 7 key and to the left of the 0 key. Use "NumpadMultiply" for the * key on numeric keypads.
    public static readonly NumpadSubtract: string = "NumpadSubtract"; // -

    // 3.1.5. Function Section
    public static readonly Escape: string = "Escape"; // Esc or ⎋

    public static readonly F1: string = "F1"; // F1
    public static readonly F2: string = "F2"; // F2
    public static readonly F3: string = "F3"; // F3
    public static readonly F4: string = "F4"; // F4
    public static readonly F5: string = "F5"; // F5
    public static readonly F6: string = "F6"; // F6
    public static readonly F7: string = "F7"; // F7
    public static readonly F8: string = "F8"; // F8
    public static readonly F9: string = "F9"; // F9
    public static readonly F10: string = "F10"; // F10
    public static readonly F11: string = "F11"; // F11
    public static readonly F12: string = "F12"; // F12

    public static readonly Fn: string = "Fn"; // Fn This is typically a hardware key that does not generate a separate   code. Most keyboards do not place this key in the function section, but it is included here to keep it with related keys.
    public static readonly FnLock: string = "FnLock"; // FLock or FnLock. Function Lock key. Found on the Microsoft  Natural Keyboard.
    public static readonly PrintScreen: string = "PrintScreen"; // PrtScr SysRq or Print Screen
    public static readonly ScrollLock: string = "ScrollLock"; // Scroll Lock
    public static readonly Pause: string = "Pause"; // Pause Break

    // 3.1.6. Media Keys
    public static readonly BrowserBack: string = "BrowserBack"; // Some laptops place this key to the left of the ↑ key.
    public static readonly BrowserFavorites: string = "BrowserFavorites";
    public static readonly BrowserForward: string = "BrowserForward"; // Some laptops place this key to the right of the ↑ key.
    public static readonly BrowserHome: string = "BrowserHome";
    public static readonly BrowserRefresh: string = "BrowserRefresh";
    public static readonly BrowserSearch: string = "BrowserSearch";
    public static readonly BrowserStop: string = "BrowserStop";
    public static readonly Eject: string = "Eject"; // Eject or ⏏. This key is placed in the function  section on some Apple keyboards.
    public static readonly LaunchApp1: string = "LaunchApp1"; // Sometimes labelled My Computer on the keyboard
    public static readonly LaunchApp2: string = "LaunchApp2"; // Sometimes labelled Calculator on the keyboard
    public static readonly LaunchMail: string = "LaunchMail";
    public static readonly MediaPlayPause: string = "MediaPlayPause";
    public static readonly MediaSelect: string = "MediaSelect";
    public static readonly MediaStop: string = "MediaStop";
    public static readonly MediaTrackNext: string = "MediaTrackNext";
    public static readonly MediaTrackPrevious: string = "MediaTrackPrevious";
    public static readonly Power: string = "Power"; // This key is placed in the function section on some Apple keyboards, replacing the Eject key.
    public static readonly Sleep: string = "Sleep";
    public static readonly AudioVolumeDown: string = "AudioVolumeDown";
    public static readonly AudioVolumeMute: string = "AudioVolumeMute";
    public static readonly AudioVolumeUp: string = "AudioVolumeUp";
    public static readonly WakeUp: string = "WakeUp";
}
