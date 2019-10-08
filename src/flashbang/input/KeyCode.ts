/* eslint-disable max-len */

/**
 * KeyboardEvent.code constants
 * (note: NOT KeyboardEvent.keyCode)
 * See: https://www.w3.org/TR/uievents-code/#keyboard-key-codes
 *
 * NB: as of 9/8/2018, Edge doesn't support KeyboardEvent.code
 * For Edge, use the keyboard.js polyfill here: https://github.com/inexorabletash/polyfill
 */
enum KeyCode {
    // 3.1.1.1. Writing System Keys
    Backquote = 'Backquote', // `~ on a US keyboard. This is the 半角/全角/漢字 (hankaku/zenkaku/kanji) key on Japanese keyboards
    Backslash = 'Backslash', // Used for both the US \| (on the 101-key layout) and also for the key    located between the " and Enter keys on row C of the 102-, 104- and 106-key layouts. Labelled #~ on a UK (102) keyboard.
    Backspace = 'Backspace', // Backspace or ⌫. Labelled Delete on Apple keyboards.
    BracketLeft = 'BracketLeft', // [{ on a US keyboard.
    BracketRight = 'BracketRight', // ]} on a US keyboard.

    Comma = 'Comma', // ,< on a US keyboard.

    Digit0 = 'Digit0', // 0) on a US keyboard.
    Digit1 = 'Digit1', // 1! on a US keyboard.
    Digit2 = 'Digit2', // 2@ on a US keyboard.
    Digit3 = 'Digit3', // 3# on a US keyboard.
    Digit4 = 'Digit4', // 4$ on a US keyboard.
    Digit5 = 'Digit5', // 5% on a US keyboard.
    Digit6 = 'Digit6', // 6^ on a US keyboard.
    Digit7 = 'Digit7', // 7& on a US keyboard.
    Digit8 = 'Digit8', // 8* on a US keyboard.
    Digit9 = 'Digit9', // 9( on a US keyboard.

    Equal = 'Equal', // =+ on a US keyboard.
    IntlBackslash = 'IntlBackslash', // Located between the left Shift and Z keys.  Labelled \| on a UK keyboard.
    IntlRo = 'IntlRo', // Located between the / and right Shift keys. Labelled \ろ (ro) on a Japanese keyboard.
    IntlYen = 'IntlYen', // Located between the = and Backspace keys.   Labelled ¥ (yen) on a Japanese keyboard. \/ on a Russian keyboard.

    KeyA = 'KeyA', // a on a US keyboard. Labelled q on an AZERTY (e.g., French) keyboard.
    KeyB = 'KeyB', // b on a US keyboard.
    KeyC = 'KeyC', // c on a US keyboard.
    KeyD = 'KeyD', // d on a US keyboard.
    KeyE = 'KeyE', // e on a US keyboard.
    KeyF = 'KeyF', // f on a US keyboard.
    KeyG = 'KeyG', // g on a US keyboard.
    KeyH = 'KeyH', // h on a US keyboard.
    KeyI = 'KeyI', // i on a US keyboard.
    KeyJ = 'KeyJ', // j on a US keyboard.
    KeyK = 'KeyK', // k on a US keyboard.
    KeyL = 'KeyL', // l on a US keyboard.
    KeyM = 'KeyM', // m on a US keyboard.
    KeyN = 'KeyN', // n on a US keyboard.
    KeyO = 'KeyO', // o on a US keyboard.
    KeyP = 'KeyP', // p on a US keyboard.
    KeyQ = 'KeyQ', // q on a US keyboard. Labelled a on an AZERTY (e.g., French) keyboard.
    KeyR = 'KeyR', // r on a US keyboard.
    KeyS = 'KeyS', // s on a US keyboard.
    KeyT = 'KeyT', // t on a US keyboard.
    KeyU = 'KeyU', // u on a US keyboard.
    KeyV = 'KeyV', // v on a US keyboard.
    KeyW = 'KeyW', // w on a US keyboard. Labelled z on an AZERTY (e.g., French) keyboard.
    KeyX = 'KeyX', // x on a US keyboard.
    KeyY = 'KeyY', // y on a US keyboard. Labelled z on a QWERTZ (e.g., German) keyboard.
    KeyZ = 'KeyZ', // z on a US keyboard. Labelled w on an AZERTY (e.g., French) keyboard, and y on a QWERTZ (e.g., German) keyboard.

    Minus = 'Minus', // -_ on a US keyboard.
    Period = 'Period', // .> on a US keyboard.
    Quote = 'Quote', // '" on a US keyboard.
    Semicolon = 'Semicolon', // ;: on a US keyboard.
    Slash = 'Slash', // /? on a US keyboard.

    // 3.1.1.2. Functional Keys
    AltLeft = 'AltLeft', // Alt, Option or ⌥.
    AltRight = 'AltRight', // Alt, Option or ⌥.   This is labelled AltGr key on many keyboard layouts.
    CapsLock = 'CapsLock', // CapsLock or ⇪
    ContextMenu = 'ContextMenu', // The application context menu key, which is typically found between the right Meta key and the right Control key.
    ControlLeft = 'ControlLeft', // Control or ⌃
    ControlRight = 'ControlRight', // Control or ⌃
    Enter = 'Enter', // Enter or ↵. Labelled Return on Apple keyboards.
    MetaLeft = 'MetaLeft', // The Windows, ⌘, Command or other OS symbol key.
    MetaRight = 'MetaRight', // The Windows, ⌘, Command or other OS symbol key.
    ShiftLeft = 'ShiftLeft', // Shift or ⇧
    ShiftRight = 'ShiftRight', // Shift or ⇧
    Space = 'Space', // (space)
    Tab = 'Tab', // Tab or ⇥

    // 3.1.2. Control Pad Section
    Delete = 'Delete', // ⌦. The forward delete key.  Note that on Apple keyboards, the key labelled Delete on the main part of the keyboard should be encoded as "Backspace".
    End = 'End', // Page Down, End or ↘
    Help = 'Help', // Help. Not present on standard PC keyboards.
    Home = 'Home', // Home or ↖
    Insert = 'Insert', // Insert or Ins. Not present on Apple keyboards.
    PageDown = 'PageDown', // Page Down, PgDn or ⇟
    PageUp = 'PageUp', // Page Up, PgUp or ⇞

    // Arrow Pad Section
    ArrowDown = 'ArrowDown', // ↓
    ArrowLeft = 'ArrowLeft', // ←
    ArrowRight = 'ArrowRight', // →
    ArrowUp = 'ArrowUp', // ↑

    // 3.1.4. Numpad Section
    NumLock = 'NumLock', // On the Mac, the "NumLock" code should be used for the numpad Clear key.

    Numpad0 = 'Numpad0', // 0 Ins on a keyboard; 0 on a phone or remote control
    Numpad1 = 'Numpad1', // 1 End on a keyboard; 1 or 1 QZ on a phone or remote control
    Numpad2 = 'Numpad2', // 2 ↓ on a keyboard; 2 ABC on a phone or remote control
    Numpad3 = 'Numpad3', // 3 PgDn on a keyboard; 3 DEF on a phone or remote control
    Numpad4 = 'Numpad4', // 4 ← on a keyboard; 4 GHI on a phone or remote control
    Numpad5 = 'Numpad5', // 5 on a keyboard; 5 JKL on a phone or remote control
    Numpad6 = 'Numpad6', // 6 → on a keyboard; 6 MNO on a phone or remote control
    Numpad7 = 'Numpad7', // 7 Home on a keyboard; 7 PQRS or 7 PRS on a phone  or remote control
    Numpad8 = 'Numpad8', // 8 ↑ on a keyboard; 8 TUV on a phone or remote control
    Numpad9 = 'Numpad9', // 9 PgUp on a keyboard; 9 WXYZ or 9 WXY on a phone  or remote control

    NumpadAdd = 'NumpadAdd', // +
    NumpadBackspace = 'NumpadBackspace', // Found on the Microsoft Natural Keyboard.
    NumpadClear = 'NumpadClear', // C or AC (All Clear). Also for use with numpads that have a Clear key that is separate from the NumLock key. On the Mac, the numpad Clear key should always be encoded as "NumLock".
    NumpadClearEntry = 'NumpadClearEntry', // CE (Clear Entry)
    NumpadComma = 'NumpadComma', // , (thousands separator). For locales where the thousands separator  is a "." (e.g., Brazil), this key may generate a ..
    NumpadDecimal = 'NumpadDecimal', // . Del. For locales where the decimal separator is "," (e.g.,    Brazil), this key may generate a ,.
    NumpadDivide = 'NumpadDivide', // /
    NumpadEnter = 'NumpadEnter',
    NumpadEqual = 'NumpadEqual', // =
    NumpadHash = 'NumpadHash', // # on a phone or remote control device. This key is typically found  below the 9 key and to the right of the 0 key.
    NumpadMemoryAdd = 'NumpadMemoryAdd', // M+ Add current entry to the value stored in memory.
    NumpadMemoryClear = 'NumpadMemoryClear', // MC Clear the value stored in memory.
    NumpadMemoryRecall = 'NumpadMemoryRecall', // MR Replace the current entry with the value stored in memory.
    NumpadMemoryStore = 'NumpadMemoryStore', // MS Replace the value stored in memory with the current entry.
    NumpadMemorySubtract = 'NumpadMemorySubtract', // M- Subtract current entry from the value stored in memory.
    NumpadMultiply = 'NumpadMultiply', // * on a keyboard. For use with numpads that provide mathematical operations (+, -, * and /). Use "NumpadStar" for the * key on phones and remote controls.
    NumpadParenLeft = 'NumpadParenLeft', // ( Found on the Microsoft Natural Keyboard.
    NumpadParenRight = 'NumpadParenRight', // ) Found on the Microsoft Natural Keyboard.
    NumpadStar = 'NumpadStar', // * on a phone or remote control device.  This key is typically found below the 7 key and to the left of the 0 key. Use "NumpadMultiply" for the * key on numeric keypads.
    NumpadSubtract = 'NumpadSubtract', // -

    // 3.1.5. Function Section
    Escape = 'Escape', // Esc or ⎋

    F1 = 'F1', // F1
    F2 = 'F2', // F2
    F3 = 'F3', // F3
    F4 = 'F4', // F4
    F5 = 'F5', // F5
    F6 = 'F6', // F6
    F7 = 'F7', // F7
    F8 = 'F8', // F8
    F9 = 'F9', // F9
    F10 = 'F10', // F10
    F11 = 'F11', // F11
    F12 = 'F12', // F12

    Fn = 'Fn', // Fn This is typically a hardware key that does not generate a separate   code. Most keyboards do not place this key in the function section, but it is included here to keep it with related keys.
    FnLock = 'FnLock', // FLock or FnLock. Function Lock key. Found on the Microsoft  Natural Keyboard.
    PrintScreen = 'PrintScreen', // PrtScr SysRq or Print Screen
    ScrollLock = 'ScrollLock', // Scroll Lock
    Pause = 'Pause', // Pause Break

    // 3.1.6. Media Keys
    BrowserBack = 'BrowserBack', // Some laptops place this key to the left of the ↑ key.
    BrowserFavorites = 'BrowserFavorites',
    BrowserForward = 'BrowserForward', // Some laptops place this key to the right of the ↑ key.
    BrowserHome = 'BrowserHome',
    BrowserRefresh = 'BrowserRefresh',
    BrowserSearch = 'BrowserSearch',
    BrowserStop = 'BrowserStop',
    Eject = 'Eject', // Eject or ⏏. This key is placed in the function  section on some Apple keyboards.
    LaunchApp1 = 'LaunchApp1', // Sometimes labelled My Computer on the keyboard
    LaunchApp2 = 'LaunchApp2', // Sometimes labelled Calculator on the keyboard
    LaunchMail = 'LaunchMail',
    MediaPlayPause = 'MediaPlayPause',
    MediaSelect = 'MediaSelect',
    MediaStop = 'MediaStop',
    MediaTrackNext = 'MediaTrackNext',
    MediaTrackPrevious = 'MediaTrackPrevious',
    Power = 'Power', // This key is placed in the function section on some Apple keyboards, replacing the Eject key.
    Sleep = 'Sleep',
    AudioVolumeDown = 'AudioVolumeDown',
    AudioVolumeMute = 'AudioVolumeMute',
    AudioVolumeUp = 'AudioVolumeUp',
    WakeUp = 'WakeUp',
}

export default KeyCode;
