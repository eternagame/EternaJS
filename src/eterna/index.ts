import * as log from "loglevel";
import {EternaApp} from "./EternaApp";

const isProduction = process.env.NODE_ENV === 'production';
log.setLevel(isProduction ? 'info' : 'trace');
window.EternaApp = EternaApp;
