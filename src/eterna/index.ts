import * as log from 'loglevel';
import EternaApp from 'eterna/EternaApp';

const isProduction = process.env.NODE_ENV === 'production';
log.setLevel(isProduction ? 'info' : 'trace');
(window as any).EternaApp = EternaApp;
