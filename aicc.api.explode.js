(function () {

    //#region functions

    function __findAPI__(win, apiName) {
        win = win ? win : window;
        apiName = apiName ? apiName : "API";
        var api = null;
        while (win != null) {
            try {
                api = win[apiName];
            } catch (e) { }
            if (api) {
                break;
            }
            win = (win.parent == win) ? win.opener : win.parent;
        }
        return api;
    }

    window.__findAPI__ = __findAPI__;

    function explodeAPIs(win, api, prefix) {
        win = win ? win : window;
        prefix = prefix ? prefix : "";

        win[getName("LMSInitialize")] = function (input) {
            return api.LMSInitialize(input);
        };

        win[getName("LMSFinish")] = function (input) {
            return api.LMSFinish(input);
        };

        win[getName("LMSGetValue")] = function (input) {
            return api.LMSGetValue(input);
        };

        win[getName("LMSSetValue")] = function (name, value) {
            return api.LMSSetValue(name, value);
        };

        win[getName("LMSCommit")] = function (input) {
            return api.LMSCommit(input);
        };

        win[getName("LMSGetLastError")] = function (input) {
            return api.LMSGetLastError(input);
        };

        win[getName("LMSGetErrorString")] = function (input) {
            return api.LMSGetErrorString(input);
        };

        win[getName("LMSGetDiagnostic")] = function (input) {
            return api.LMSGetDiagnostic(input);
        };


        function getName(name) {
            return prefix ? prefix + "_" + name : name;
        }
    }

    window.AICC_ExplodeAPIs = explodeAPIs;

    //#endregion

    //#region setup

    function setup() {
        var api = __findAPI__();
        if (!api) {
            return;
        }
        explodeAPIs(window, api,"AICC");
    }
    //setup();

    //#endregion

})();