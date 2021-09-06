
const isMobile = () => {
    var checker = {
        Android: function Android() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function BlackBerry() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function iOS() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function Opera() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function Windows() {
            return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
        },
        any: function any() {
            return (
                checker.Android() ||
                checker.BlackBerry() ||
                checker.iOS() ||
                checker.Opera() ||
                checker.Windows()
            );
        },
    };
    return checker.any() ? true : false;
}


export const DectectDevice = () => {

    // true if Android, iPhone, iPad
    // false if desktop browser
    console.log('device status', isMobile())
    return isMobile();
}