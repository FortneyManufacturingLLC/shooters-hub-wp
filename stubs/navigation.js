"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRouter = useRouter;
function useRouter() {
    return {
        push: function (href) {
            if (typeof window !== 'undefined')
                window.location.assign(href);
        },
        replace: function (href) {
            if (typeof window !== 'undefined')
                window.location.replace(href);
        },
        back: function () {
            if (typeof window !== 'undefined')
                window.history.back();
        },
    };
}
