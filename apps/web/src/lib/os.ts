/**
 * Which kind of device the visitor is on, written to `<html data-os="android|ios|mac|win|other">` before the first paint. The site's CSS
 * (`.os-store`, `.os-desktop`, `.os-mac`, `.os-win` in globals.css) shows the right download button from it, so there is no flash and the
 * server and browser render the same HTML. An iPad says it is a Mac, so a "Mac" with a touch screen counts as "ios" (iPhone and iPad).
 */
export const osBootScript = `(function(){try{var u=navigator.userAgent,o="other";if(/Android/.test(u))o="android";else if(/iPhone|iPad|iPod/.test(u))o="ios";else if(/Windows/.test(u))o="win";else if(/Macintosh|Mac OS X/.test(u))o=navigator.maxTouchPoints>1?"ios":"mac";document.documentElement.dataset.os=o}catch(e){}})()`;
