import * as log from 'loglevel';
import {i18nConfig} from 'es2015-i18n-tag';
import translations from 'i18n/translations/translation.en-US.json';
import EternaApp from 'eterna/EternaApp';

const isProduction = process.env.NODE_ENV === 'production';
log.setLevel(isProduction ? 'info' : 'trace');
i18nConfig({
    locales: 'en-US',
    translations
});
(window as any).EternaApp = EternaApp;
