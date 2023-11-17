// https://vitepress.dev/guide/custom-theme
import {h} from 'vue';
import type {Theme} from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './style.css';

export default {
    extends: DefaultTheme,
    Layout: () => h(DefaultTheme.Layout, null, {
        // https://vitepress.dev/guide/extending-default-theme#layout-slots
    }),
    enhanceApp({app, router, siteData}) {
    // ...
    }
} as Theme; // satisfies Theme // TODO: change to `satisfies` after ts upgrade
