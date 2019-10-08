import * as WebFont from 'webfontloader';

export default class FontLoader {
    /**
     * Loads a font defined in a  @font-face element in a CSS file.
     * Return a Promise that will resolve when the given font is loaded
     */
    public static load(fontFamily: string, cssURL?: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            WebFont.load({
                custom: {
                    families: [fontFamily],
                    urls: cssURL ? [cssURL] : undefined
                },
                fontactive: (familyName, fvd) => resolve(),
                fontinactive: (familyName, fvd) => reject(
                    new Error(`Font load failure [css=${cssURL}, family=${familyName}]`)
                )
            });
        });
    }
}
