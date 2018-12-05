
(function ($) {

    //#region Console mock

    var console = {
        log: function (text) {
            if (window.console.log) {
                try {
                    window.console.log(text);
                } catch (e) { }
            }
        },
        warn: function (text) {
            if (window.console.warn) {
                try {
                    window.console.warn(text);
                } catch (e) { }
            }
        },
        info: function (text) {
            if (window.console.info) {
                try {
                    window.console.info(text);
                } catch (e) { }
            }
        },
        dir: function (text) {
            if (window.console.dir) {
                try {
                    window.console.dir(text);
                } catch (e) { }
            }
        }
    };

    //#endregion

    //#region AICC via Http API

    function AICCViaHttpAPI(launchData) {

        //#region Vars
        var launchUrl, aiccUrl, sessionId, inited = false, hasChanged = false,
             responseCache = {}, stringGroupReg = /Core_Lesson|Comments/ig, aiccModel;
        this.Model = null, that = this;

        var HACPCommands = {
            GetParam: "GetParam",
            PutParam: "PutParam",
            PutComments: "PutComments",
            PutObjectives: "PutObjectives",
            PutPath: "PutPath",
            PutInteractions: "PutInteractions",
            PutPerformance: "PutPerformance",
            ExitAU: "ExitAU"
        };
        //#endregion

        //#region Methods

        /*Session Methods
        ------------------------------*/
        this.LMSInitialize = function (name) {
            if (inited) {
                return "false";
            }

            var result = post(HACPCommands.GetParam);

            loadData(result);
            console.log(responseCache);
            console.log(that.Model.getCache());

            inited = true;
            return "true";
        }

        this.LMSFinish = function (input) {
            if (!inited) {
                return "false";
            }
            this.LMSCommit("");
            post(HACPCommands.ExitAU);  //end the session
            inited = false;
        }

        /*Data-transfer Methods
        ------------------------------*/
        this.LMSGetValue = function (name) {
            if (!inited) {
                return "";
            }
            return aiccModel.GetValue(name);
        }

        this.LMSSetValue = function (name, value) {
            if (!inited) {
                return "";
            }
            hasChanged = aiccModel.SetValue(name, value);
            return hasChanged ? "true" : "false";
        }

        this.LMSCommit = function (input) {
            if (!inited || !hasChanged) {
                return "false";
            }
            var aiccData = aiccModel.toHACPData();
            post(HACPCommands.PutParam, aiccData);
            return "true";
        }

        /*Error handling Methods
        ------------------------------*/
        this.LMSGetLastError = function (input) {
            var value = 0;
            if (responseCache && responseCache["error"]) {
                value = parseInt(responseCache["error"], 10);
                value = isNaN(value) ? 0 : value;
            }
            return value;
        }

        this.LMSGetErrorString = function (input) {
            return "";
        }

        this.LMSGetDiagnostic = function (input) {
            return "";
        }

        //#endregion

        //#region Functions

        function post(command, aicc_data) {
            var data = {};
            if (aicc_data) {
                data.aicc_data = aicc_data;
            }
            data.command = command;
            data.session_id = sessionId;
            //var version = responseCache["version"];
            version = "3.5";
            if (version) {
                data.version = version;
            }

            var result = null;
            $.ajax({
                url: aiccUrl,
                async: false,
                cache: false,
                type: 'POST',
                dataType: 'html',
                data: data,
                success: function (data, textStatus, jqXHR) {
                    result = data;
                },
                error: function (ex) {
                    console.log("PostError:");
                    console.log(data);
                }
            });
            return result;
        }

        function loadData(text) {
            if (!text) {
                return;
            }
            text = $.trim(text);
            var items = text.split(/aicc_data=/ig);
            readResponse(items[0]);
            that.Model = aiccModel = new AICCModel(items[1]);
        }

        function readResponse(text) {
            text = text ? $.trim(text) : text;
            if (!text) {
                return;
            }
            var line, lines = text.split("\n");
            for (var i = 0, len = lines.length; i < len; i++) {
                line = $.trim(lines[i]);
                if (!line || line.charAt(0) == ";") {
                    continue;
                }
                var nameValue = readNameValue(line);
                if (nameValue && nameValue.name) {
                    responseCache[nameValue.name.toLowerCase()] = nameValue.value;
                }
            }
        }

        function readNameValues(text) {
            text = $.trim(text);
            if (!text) {
                return null;
            }
            var line, lines = text.split("\n");
            var arr = [];
            for (var i = 0, len = lines.length; i < len; i++) {
                line = lines[i];
                var data = readNameValue(line);
                if (data) {
                    var key = data.name.toLowerCase();
                    arr[key] = data;
                }
            }
            return arr;
        }

        function readNameValue(line) {
            var reg = /([^=]+)=([\s\S]*)/ig;
            if (line) {
                var match = reg.exec(line);
                if (!match) {
                    return null;
                }
                var data = {
                    name: $.trim(match[1]),
                    value: decodeURIComponent($.trim(match[2]))
                };
                return data;
            }
            return null;
        }

        function checkInit() {
            if (!inited) {
                console.log("Doesn't Init yet");
            }
            return inited;
        }

        function setup() {
            aiccUrl = launchData.AICC_URL;
            launchUrl = launchData.LaunchUrl;
            sessionId = launchData.AICC_SID;
        }

        //#endregion

        setup();
    }

    AICCViaHttpAPI.prototype.getCache = function () {
        if (this.Model && this.Model.getCache) {
            return this.Model.getCache();
        }
        return null;
    }

    AICCViaHttpAPI.getQueryValue = function (name, search) {
        search = search ? search : window.location.search;
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    AICCViaHttpAPI.findLaunchData = function (win) {
        while (win) {
            var aiccUrl = AICCViaHttpAPI.getQueryValue("AICC_URL", win.location.search);
            var sessionId = AICCViaHttpAPI.getQueryValue("AICC_SID", win.location.search);
            if (aiccUrl && sessionId) {
                var launchUrl = win.location;
                var data = {
                    AICC_URL: aiccUrl,
                    AICC_SID: sessionId,
                    LaunchUrl: launchUrl,
                    LaunchWindow: win
                };
                return data;
            }
            win = win.opener ? win.opener : win.parent == win ? null : win.parent;
        }
        return null;
    }

    //AICCModel
    function AICCModel(hacpData) {
        var stringGroupReg = /Core_Lesson|Comments/ig, aiccCache = {};
        var apiValues = {
            lesson_status: ["passed", "completed", "failed", "incomplete", "browsed", "not attempted"],
            exit: ["time-out", "suspend", "logout"],
            entry: ["ab-initio", "resume"]
        };

        var apiBindingMapper = {
            "cmi.suspend_data": "Core_Lesson",
            "cmi.core.exit": "core.lesson_status",
            "cmi.core.entry": "core.lesson_status",
            "cmi.core.score.raw": "core.score",
            "cmi.core.score.max": "core.score",
            "cmi.core.score.min": "core.score"
        };

        var dataConvertor = {
            "cmi.core.lesson_status": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 0, apiValues.lesson_status);
                },
                set: function (aiccValue, value) {
                    aiccValue = aiccValue ? aiccValue : "";
                    var node2 = aiccValue.split(",")[1];
                    var newAICCValue = value + (node2 ? "," + node2 : "");
                    return newAICCValue;
                }
            },
            "cmi.core.exit": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 1, apiValues.exit);
                },
                set: function (aiccValue, value) {
                    return dataConvertor.funs.posSet(aiccValue, value, 1);
                }
            },
            "cmi.core.entry": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 1, apiValues.entry);
                },
                set: function (aiccValue, value) {
                    return dataConvertor.funs.posSet(aiccValue, value, 1);
                }
            },
            "cmi.core.score.raw": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 0);
                },
                set: function (aiccValue, value) {
                    return dataConvertor.funs.posSet(aiccValue, value, 0);
                }
            },
            "cmi.core.score.max": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 1);
                },
                set: function (aiccValue, value) {
                    return dataConvertor.funs.posSet(aiccValue, value, 1);
                }
            },
            "cmi.core.score.min": {
                get: function (aiccValue) {
                    return dataConvertor.funs.posGet(aiccValue, 2, null, 0);
                },
                set: function (aiccValue, value) {
                    return dataConvertor.funs.posSet(aiccValue, value, 2);
                }
            },
            funs: {
                posGet: function (aiccValue, index, matchValues, defaultValue) {
                    if (!aiccValue) {
                        return "";
                    }
                    aiccValue = $.trim(aiccValue);
                    var value = $.trim(aiccValue.split(",")[index]);
                    if (value && matchValues) {
                        var finalValue = "";
                        var m = value.charAt(0).toLowerCase();
                        $.each(matchValues, function (i, mValue) {
                            if (mValue.indexOf(m) == 0) {
                                finalValue = mValue;
                                return false;
                            }
                        });
                        return finalValue;
                    }
                    if (!value && defaultValue) {
                        value = defaultValue;
                    }
                    return value;
                },
                posSet: function (aiccValue, value, index) {
                    var items = aiccValue.split(",");
                    for (var i = 0, len = Math.max(index + 1, items.length); i < len; i++) {
                        if (i == index) {
                            items[i] = value;
                        } else if (items[i] == undefined) {
                            items[i] = "";
                        }
                    }
                    return items.join(",");
                }
            }
        };

        var HACPTemplate = {
            Core: [
                "Lesson_Location",
                "Lesson_Status",
                "Score",
                "Time"
            ],
            Core_Lesson: "Core_Lesson",
            Student_Preferences: [
                "Audio",
                "Language",
                "Speed",
                "Text"
            ]
            //TODO:Comments:"Comments"
            //TODO:Objectives_Status,
        };

        //#region Methods

        this.GetValue = function (name) {
            if (!name) {
                return "";
            }
            var value = getAICCValue(name);
            if (value) {
                var convertor = dataConvertor[name];
                if (convertor && convertor.get) {
                    value = convertor.get(value);
                }
            }

            return value;
        }

        this.SetValue = function (name, value) {
            if (!name) {
                return false;
            }
            var newAICCValue = value ? value.toString() : value;    //force convert value to string type.
            var convertor = dataConvertor[name];
            if (convertor && convertor.set) {
                var aiccValue = getAICCValue(name);
                newAICCValue = convertor.set(aiccValue, value);
            }
            setAICCValue(name, newAICCValue);
            return true;
        }

        this.toHACPData = function () {
            var text = "", value;
            $.each(HACPTemplate, function (name, group) {
                value = "";
                var key = name.toString().toLowerCase();
                name = "[" + name + "]" + "\r\n";
                text += name;
                var groupNode = aiccCache[key];
                if (!groupNode) {
                    return;
                }
                if (group.constructor != String) {
                    $.each(group, function (i, subName) {
                        var subKey = subName.toLowerCase();
                        var subValue = groupNode[subKey];
                        subValue = subValue ? subValue.value !== undefined ? subValue.value : subValue : "";
                        subValue = encodeURIComponent(subValue);
                        value += subName + "=" + subValue + "\r\n";
                    })
                    value = $.trim(value);
                } else {
                    value = encodeURIComponent(groupNode);
                }
                text += (value ? value + "\r\n" : "");
            });
            return text;
        }

        this.getCache = function () {
            return aiccCache;
        }

        //#endregion

        //#region Functions

        function readAICC(text) {
            text = text ? $.trim(text) : text;
            if (!text) {
                return;
            }

            var reg = /\[[^\[\]]+\]/ig;
            var groups = text.match(reg);
            var groupName, isStr, groupValue, storeValue, fIndex, lIndex;

            for (var i = 0, len = groups.length; i < len; i++) {
                groupName = getGroupName(groups[i]).toLowerCase();
                isStr = isStringGroup(groupName);
                fIndex = text.indexOf(groups[i]) + groups[i].length;
                lIndex = text.indexOf(groups[i + 1]);
                lIndex = lIndex < 0 ? text.length : lIndex;
                groupValue = $.trim(decodeURIComponent(text.substring(fIndex, lIndex)));
                //console.log(groupName + ":" + isStr + ":" + fIndex + ":" + lIndex);
                //console.log(groupValue);
                storeValue = isStr ? groupValue : readNameValues(groupValue);
                aiccCache[groupName] = storeValue;
            }

            function getGroupName(text) {
                var reg = /\[([^\[\]]+)\]/ig;
                var name = reg.exec(text);
                return name[1];
            }

            function isStringGroup(groupName) {
                return stringGroupReg.test(groupName);
            }
        }

        function getAICCValue(name) {
            var value = "", nodes;
            var key = apiBindingMapper[name];
            if (key) {
                nodes = key.split(".");
            } else {
                nodes = name.split(".");
                nodes.shift();  //remove the cmi node
            }
            var node, aiccNode = aiccCache;
            for (var i = 0, len = nodes.length; i < len; i++) {
                node = nodes[i].toLowerCase();
                aiccNode = aiccNode[node];
                if (i == len - 1 && aiccNode) {
                    value = aiccNode.constructor == Object ? aiccNode.value : aiccNode;
                    vaule = value == undefined ? "" : value;
                }
                if (!aiccNode) {
                    break;
                }
            }
            return value;
        }

        function setAICCValue(name, value) {
            var nodes;
            var key = apiBindingMapper[name];
            if (key) {
                nodes = key.split(".");
            } else {
                nodes = name.split(".");
                nodes.shift();  //remove the cmi node
            }
            var nodeName, aiccNode = aiccCache, len = nodes.length;
            $.each(nodes, function (i, nodeName) {
                nodeName = nodeName.toLowerCase();
                if (i == len - 1) {
                    if (i > 0) {
                        if (!aiccNode[nodeName] || aiccNode[nodeName].constructor != Object) {
                            aiccNode[nodeName] = { name: nodeName };
                        }
                        aiccNode[nodeName].value = value;

                    } else {
                        aiccNode[nodeName] = value;
                    }
                } else {
                    aiccNode = aiccNode[nodeName] && (aiccNode[nodeName].constructor == Object || aiccNode[nodeName].constructor == Array) ? aiccNode[nodeName] : aiccNode[nodeName] = {};
                }
            });
            return false;
        }

        function readNameValues(text) {
            text = $.trim(text);
            if (!text) {
                return null;
            }
            var line, lines = text.split("\n");
            var arr = [];
            for (var i = 0, len = lines.length; i < len; i++) {
                line = lines[i];
                var data = readNameValue(line);
                if (data) {
                    var key = data.name.toLowerCase();
                    arr[key] = data;
                }
            }
            return arr;
        }

        function readNameValue(line) {
            var reg = /([^=]+)=([\s\S]*)/ig;
            if (line) {
                var match = reg.exec(line);
                var data = {
                    name: $.trim(match[1]),
                    value: decodeURIComponent($.trim(match[2]))
                };
                return data;
            }
            return null;
        }

        function init() {
            readAICC(hacpData);
        }

        //#endregion

        init();
    }

    //#endregion

    //#region setup

    function setup() {
        var aiccLaunchData = AICCViaHttpAPI.findLaunchData(window);
        if (aiccLaunchData) {
            var aiccApi = new AICCViaHttpAPI(aiccLaunchData);
            window.API = aiccApi;
        }

        function test() {

            aiccApi.LMSInitialize("");
            //testGet(aiccApi, ["cmi.suspend_data", "cmi.core.student_id", "cmi.core.student_name", "cmi.core.lesson_status", "cmi.core.entry", "cmi.core.exit"]);
            var setData = [
                { name: "cmi.suspend_data", value: "1,0,0,1" },
                { name: "cmi.core.lesson_status", value: "completed" },
                { name: "cmi.core.exit", value: "time-out" },
            ];
            testSet(aiccApi, setData);
            aiccApi.LMSFinish("");


            function testGet(api, names) {
                for (var i = 0, len = names.length; i < len; i++) {
                    var name = names[i];
                    var value = api.LMSGetValue(name);
                    console.log(name + "=" + value);
                }
            }

            function testSet(api, nameValues) {
                $.each(nameValues, function (i, item) {
                    var name = item.name, value = item.value;
                    var result = api.LMSSetValue(name, value);
                    var newValue = api.LMSGetValue(name);
                    console.log("Set:" + name + "=" + value + "=>" + newValue);
                });
            }
        }
    }
    setup();

    //#endregion
})(jQuery);